import { renderConnectionLogs, renderConnectedLogs } from './pre-game/connection-loader.mjs';
import { UpgradeOffersComponent, EnergyBarComponent, ResourcesBarComponent } from './rendering/UI-components.mjs';
import { NetworkVisualizer } from './visualizer.mjs';
import { GameClient } from './game-logics/game-client.mjs';

while (!window.HiveP2P) await new Promise(resolve => setTimeout(resolve, 10));

/** @type {import('hive-p2p')} */
const HiveP2P = window.HiveP2P;
HiveP2P.CLOCK.mockMode = true;

try {
  const { default: overrides } = await import('./hive-config.json', { with: { type: 'json' } });
  HiveP2P.mergeConfig(HiveP2P.CONFIG, overrides);
} catch (e) { console.log('No hive-config.json found, using default configuration.'); }

renderConnectionLogs();
const bootstraps = ['ws://localhost:3001'];
const node = await HiveP2P.createNode({ bootstraps });
window.hiveNode = node; // expose to global for debugging

// UI COMPONENTS / VISUALIZER
const visualizer = new NetworkVisualizer(node, HiveP2P.CryptoCodex);
window.networkVisualizer = visualizer; // Expose for debugging
const gameClient = new GameClient(node);
const upgradeOffers = new UpgradeOffersComponent();
const energyBar = new EnergyBarComponent();
const resourcesBar = new ResourcesBarComponent();

// SETUP CALLBACKS
upgradeOffers.onOfferClick = (upgradeName) => gameClient.digestPlayerActions([{ type: 'upgrade', upgradeName }]);

// ON TURN EXECUTION
gameClient.onExecutedTurn.push((height = 0) => {
	const player = gameClient.myPlayer;
	energyBar.update(player.energy, player.maxEnergy);
	resourcesBar.update(player.resourcesByTier);
	if (player.upgradeOffers.length) upgradeOffers.displayOffers(player.upgradeOffers[0]);
	//console.log(`--- Turn ${height} executed --- | upgradeOffers: ${player.upgradeOffers.length}`);
});
window.gameClient = gameClient; // Expose for debugging

while(!node.peerStore.neighborsList.length) // wait until connected
	await new Promise(resolve => setTimeout(resolve, 100));

renderConnectedLogs();