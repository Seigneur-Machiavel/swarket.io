import { renderConnectionLogs, renderConnectedLogs } from './pre-game/connection-loader.mjs';
import { PlayerStatsComponent, ConnectionsListComponent, UpgradeOffersComponent, EnergyBarComponent,
	ResourcesBarComponent, NodeCardComponent, DeadNodesComponent,
} from './rendering/UI-components.mjs';
import { NetworkVisualizer } from './visualizer.mjs';
import { GameClient } from './game-logics/game.mjs';

while (!window.HiveP2P) await new Promise(resolve => setTimeout(resolve, 10));

const params = new URLSearchParams(window.location.search);
const IS_DEBUG = params.has('debug');

/** @type {import('hive-p2p')} */
const HiveP2P = window.HiveP2P;
HiveP2P.CLOCK.mockMode = true;

// LOAD CONFIG OVERRIDES IF ANY
try {
  const { default: overrides } = await import('./hive-config.json', { with: { type: 'json' } });
  HiveP2P.mergeConfig(HiveP2P.CONFIG, overrides);
} catch (e) { console.log('No hive-config.json found, using default configuration.'); }
renderConnectionLogs();

// NODE & GAMECLIENT SETUP
const bootstraps = ['ws://localhost:3001'];
const node = await HiveP2P.createNode({ bootstraps, verbose: 2 });
node.topologist.automation.incomingOffer = false;	// disable auto-accept incoming offers
node.topologist.automation.spreadOffers = false; 	// disable auto-spread offers
const gameClient = new GameClient(node);
window.hiveNode = node; 							// expose to global for debugging

// VISUALIZER SETUP
const visualizer = new NetworkVisualizer(node, HiveP2P.CryptoCodex);
window.networkVisualizer = visualizer; // Expose for debugging
node.onMessageData((fromId, message) => visualizer.displayDirectMessageRoute(fromId, message.route));
node.onGossipData((fromId, message) => visualizer.displayGossipMessageRoute(fromId, message));
node.onSignalOffer((fromId, offer) => {
	console.log(`Connection offer received from ${fromId}`, offer);
	gameClient.connectionOffers[fromId] = { offer, expiration: node.time + 30000 };
});
visualizer.onNodeLeftClick((nodeId = 'toto') => nodeCard.show(nodeId));

// UI COMPONENTS SETUP
const playerStats = new PlayerStatsComponent();
const connectionsList = new ConnectionsListComponent(gameClient);
playerStats.connectionCountWrapper.onclick = () => connectionsList.show();
const upgradeOffers = new UpgradeOffersComponent();
const energyBar = new EnergyBarComponent();
const resourcesBar = new ResourcesBarComponent();
const deadNodes = new DeadNodesComponent(gameClient);
const nodeCard = new NodeCardComponent(gameClient, visualizer);

// SETUP CALLBACKS
upgradeOffers.onOfferClick = (upgradeName) => {
	gameClient.digestMyAction({ type: 'upgrade', upgradeName });
	upgradeOffers.hideOffers();
}

// ON TURN EXECUTION
gameClient.onExecutedTurn.push(async (height = 0) => {
	const player = gameClient.myPlayer;
	if (gameClient.alive) node.topologist.setNeighborsTarget(player.upgradeSet.linker.level);
	else node.topologist.setNeighborsTarget(0); // stop connectings if dead

	playerStats.setPlayerName(player.name);
	playerStats.setPlayerId(player.id);
	playerStats.update(player.lifetime, node.peerStore.standardNeighborsList.length, player.upgradeSet.linker.level);
	connectionsList.update();
	energyBar.update(player.energy, player.maxEnergy);
	resourcesBar.update(player.resourcesByTier);
	deadNodes.showDeadNodes();

	// UPGRADE OFFERS
	if (player.upgradeOffers.length) upgradeOffers.displayOffers(player.upgradeOffers[0]);
	if (!gameClient.alive) upgradeOffers.hideOffers();

	// CONNECTION OFFERS
	const hasPendingConnectionOffer = Object.keys(gameClient.connectionOffers).length > 0;
	if (hasPendingConnectionOffer) playerStats.showConnectionOfferNotification();
	else playerStats.hideConnectionOfferNotification();
	//console.log(`--- Turn ${height} executed --- | upgradeOffers: ${player.upgradeOffers.length}`);

	// THIS ONE USEFUL TO DEBUG CONSENSUS
	await new Promise(resolve => setTimeout(resolve, Math.round(gameClient.turnSystem.turnDuration / 10)));
	gameClient.digestMyAction({ type: `noop_${Math.random()}` });
});
window.gameClient = gameClient; // Expose for debugging

// WAIT UNTIL CONNECTED TO BOOTSTRAP
while(!node.peerStore.neighborsList.length)
	await new Promise(resolve => setTimeout(resolve, 100));

renderConnectedLogs();

// AUTO-PLAY SETUP (DEBUG ONLY)
if (IS_DEBUG) {
	const { AutoPlayer } = await import('./auto-play.mjs');
	const autoPlayer = new AutoPlayer(gameClient, deadNodes, upgradeOffers);
	window.autoPlayer = autoPlayer; 					// expose to global for debugging
}