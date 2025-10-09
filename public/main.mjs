import { renderConnectionLogs, renderConnectedLogs } from './pre-game/connection-loader.mjs';
import { PlayerStatsComponent, UpgradeOffersComponent, EnergyBarComponent, ResourcesBarComponent,
	NodeCardComponent, DeadNodesComponent,
} from './rendering/UI-components.mjs';
import { NetworkVisualizer } from './visualizer.mjs';
import { GameClient } from './game-logics/game.mjs';
import { NodeInteractor } from './game-logics/node-interactions.mjs';

while (!window.HiveP2P) await new Promise(resolve => setTimeout(resolve, 10));

/** @type {import('hive-p2p')} */
const HiveP2P = window.HiveP2P;
HiveP2P.CLOCK.mockMode = true;

try {
  const { default: overrides } = await import('./hive-config.json', { with: { type: 'json' } });
  HiveP2P.mergeConfig(HiveP2P.CONFIG, overrides);
} catch (e) { console.log('No hive-config.json found, using default configuration.'); }

renderConnectionLogs();
// NODE & GAMECLIENT SETUP
const bootstraps = ['ws://localhost:3001'];
const node = await HiveP2P.createNode({ bootstraps });
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
gameClient.onExecutedTurn.push((height = 0) => {
	const player = gameClient.myPlayer;
	if (!player.energy) { // IF DEAD => disable auto-connect
		gameClient.alive = false; // stop the game client
		node.topologist.automation.incomingOffer = false; // disable auto-accept if dead
		node.topologist.automation.connectBootstraps = false; // disable auto-connect to bootstraps if dead
	}

	if (player.energy) node.topologist.setNeighborsTarget(player.upgradeSet.linker.level);
	else node.topologist.setNeighborsTarget(0); // stop connectings if dead
	energyBar.update(player.energy, player.maxEnergy);
	resourcesBar.update(player.resourcesByTier);
	if (player.upgradeOffers.length) upgradeOffers.displayOffers(player.upgradeOffers[0]);
	if (!player.energy) upgradeOffers.hideOffers();
	deadNodes.showDeadNodes();
	//console.log(`--- Turn ${height} executed --- | upgradeOffers: ${player.upgradeOffers.length}`);
});
window.gameClient = gameClient; // Expose for debugging

// PLAYER-STATS UPDATE INTERVAL
setInterval(() => {
	const player = gameClient.myPlayer;
	if (!player) return;
	playerStats.setPlayerName(player.name);
	playerStats.setPlayerId(player.id);
	playerStats.update(player.lifetime, node.peerStore.standardNeighborsList.length, player.upgradeSet.linker.level);
	const hasPendingConnectionOffer = Object.keys(gameClient.connectionOffers).length > 0;
	if (hasPendingConnectionOffer) playerStats.showConnectionOfferNotification();
	else playerStats.hideConnectionOfferNotification();
}, 1000);

while(!node.peerStore.neighborsList.length) // wait until connected
	await new Promise(resolve => setTimeout(resolve, 100));

renderConnectedLogs();