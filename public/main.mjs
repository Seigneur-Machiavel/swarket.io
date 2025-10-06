import { renderConnectionLogs, renderConnectedLogs } from './connection-loader.mjs';
import { EnergyBarComponent, ResourcesBarComponent } from './rendering/UI-components.mjs';
import { NetworkVisualizer } from './visualizer.mjs';
import { GameClient } from './game-logics/game-client.mjs';

// @type {import('hive-p2p')} 
//const HiveP2P = await import('./hive-p2p/dist/browser/hive-p2p.min.js');

while (!window.HiveP2P) await new Promise(resolve => setTimeout(resolve, 10));
HiveP2P.CLOCK.mockMode = true;

try {
  const { default: overrides } = await import('./hive-config.json', { with: { type: 'json' } });
  HiveP2P.mergeConfig(HiveP2P.CONFIG, overrides);
} catch (e) { console.log('No hive-config.json found, using default configuration.'); }

renderConnectionLogs();
const bootstraps = ['ws://localhost:3001'];
const node = await HiveP2P.createNode({ bootstraps });
window.hiveNode = node; // expose to global for debugging

const energyBar = new EnergyBarComponent();
const resourcesBar = new ResourcesBarComponent();

const visualizer = new NetworkVisualizer(node, HiveP2P.CryptoCodex);
window.networkVisualizer = visualizer; // Expose for debugging
const gameClient = new GameClient(node);
gameClient.onExecutedTurn.push(() => {
	const player = gameClient.players[node.id];
	energyBar.update(player.energy, player.maxEnergy);
	resourcesBar.update(player.resourcesByTier);
	//visualizer.networkRenderer.displayTurnExecution(gameClient.height);
});
window.gameClient = gameClient; // Expose for debugging

while(!node.peerStore.neighborsList.length) // wait until connected
	await new Promise(resolve => setTimeout(resolve, 100));

renderConnectedLogs();