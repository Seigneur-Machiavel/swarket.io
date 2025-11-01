import { GameConsole } from './components/console.mjs';
import { PlayerStatsComponent, ConnectionsListComponent, UpgradeOffersComponent,
	EnergyBarComponent, ResourcesBarComponent, NodeCardComponent, SubNodeInfoTrackerComponent,
	DeadNodesComponent, BuildingsComponent
} from './components/UI-components.mjs';
import { ParticlesDisplayer } from './components/particles.mjs';
import { NetworkVisualizer } from './visualizer.mjs';
import { GameClient } from './game-logics/game.mjs';
import { NodeInteractor } from './game-logics/node-interactions.mjs';

// WAIT FOR HIVE-P2P TO BE LOADED
while (!window.HiveP2P) await new Promise(resolve => setTimeout(resolve, 10));

const gameConsole = new GameConsole();
window.gameConsole = gameConsole;
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
gameConsole.renderConnectionLogs();

// NODE & GAMECLIENT SETUP
// get domain from url params or use default
const domain = window?.location?.hostname || 'localhost';
const bootstraps = [`ws://${domain}:27261`];
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
visualizer.onNodeLeftClick((nodeId = 'toto') => {
	nodeCard.show(nodeId);
	spectatorResourcesBar.update(gameClient.getSpectatingPlayer);
});
visualizer.onNodeRightClick((nodeId = 'toto') => console.log('Right-click on node:', nodeId));

// UI COMPONENTS SETUP
const uiWrapper = document.querySelector('.UI-wrapper');
const playerStats = new PlayerStatsComponent(gameClient);
const connectionsList = new ConnectionsListComponent(gameClient);
playerStats.connectionCountWrapper.onclick = () => connectionsList.show();
const upgradeOffers = new UpgradeOffersComponent(gameClient);
const energyBar = new EnergyBarComponent();
const myResourcesBar = new ResourcesBarComponent();
const spectatorResourcesBar = new ResourcesBarComponent(true);
const buildings = new BuildingsComponent(gameClient, myResourcesBar);
const deadNodes = new DeadNodesComponent(gameClient);
const nodeCard = new NodeCardComponent(gameClient, visualizer, myResourcesBar, spectatorResourcesBar);
const subNodeInfoTracker = new SubNodeInfoTrackerComponent(gameClient, visualizer);

// PARTICLES SETUP
const particlesDisplayer = new ParticlesDisplayer();
window.particlesDisplayer = particlesDisplayer; // Expose for debugging

const update = () => { // CENTRALIZED ANIMATION LOOP
	visualizer.networkRenderer.animate();
	nodeCard.update();
	subNodeInfoTracker.update();
	particlesDisplayer.render();
	requestAnimationFrame(update);
};
requestAnimationFrame(update);

// ON TURN EXECUTION
gameClient.onExecutedTurn.push(async (height = 0) => {
	const player = gameClient.myPlayer;
	if (gameClient.alive) node.topologist.setNeighborsTarget(player.getMaxConnections);
	else node.topologist.setNeighborsTarget(0); // stop connectings if dead

	playerStats.setPlayerName(player.name);
	playerStats.setPlayerId(player.id);
	playerStats.update(player, node.peerStore.standardNeighborsList.length);
	connectionsList.update();
	energyBar.update(player.getEnergy, player.maxEnergy);
	myResourcesBar.update(player);
	spectatorResourcesBar.update(gameClient.getSpectatingPlayer);
	buildings.update();
	deadNodes.showDeadNodes();
	nodeCard.update();
	console.log(`--- Turn ${height} executed ---`);

	// UPGRADE OFFERS
	upgradeOffers.displayOffers(gameClient);
	if (!gameClient.alive) upgradeOffers.hideOffers();

	// CONNECTION OFFERS
	const hasPendingConnectionOffer = Object.keys(gameClient.connectionOffers).length > 0;
	if (hasPendingConnectionOffer) playerStats.showConnectionOfferNotification();
	else playerStats.hideConnectionOfferNotification();
	//console.log(`--- Turn ${height} executed --- | upgradeOffers: ${player.upgradeOffers.length}`);

	// THIS ONE USEFUL TO DEBUG CONSENSUS
	await new Promise(resolve => setTimeout(resolve, Math.round(gameClient.turnSystem.turnDuration / 10)));
	gameClient.digestMyAction({ type: `noop_${Math.random()}` });

	setTimeout(() => { // DISABLED FOR NOW
		particlesDisplayer.updateCanvasSizeAccordingToScreen();
		/*const changes = player.inventory.turnChanges;
		for (const r in changes) {
			const change = formatCompact3Digits(changes[r]);
			particlesDisplayer.addParticle(12, undefined, undefined, `${changes[r] > 0 ? '+' : ''}${change}`);
		}*/
	}, 100);
});
window.gameClient = gameClient; // Expose for debugging

// WAIT UNTIL CONNECTED TO BOOTSTRAP
while(!node.peerStore.neighborsList.length)
	await new Promise(resolve => setTimeout(resolve, 100));

gameConsole.renderConnectedLogs();
uiWrapper.classList.add('started');

// AUTO-PLAY SETUP (DEBUG ONLY)
if (IS_DEBUG) {
	uiWrapper.classList.add('debug');
	const { AutoPlayer } = await import('./auto-play.mjs');
	const autoPlayer = new AutoPlayer(gameClient, NodeInteractor, deadNodes, upgradeOffers);
	window.autoPlayer = autoPlayer; 					// expose to global for debugging
}