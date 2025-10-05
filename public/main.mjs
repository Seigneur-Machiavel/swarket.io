/** @type {import('hive-p2p')} */
const HiveP2P = await import('https://unpkg.com/@hive-p2p/browser@latest/hive-p2p.min.js');
HiveP2P.CLOCK.mockMode = true;

try {
  const { default: overrides } = await import('./hive-config.json', { with: { type: 'json' } });
  HiveP2P.mergeConfig(HiveP2P.CONFIG, overrides);
} catch (e) { console.log('No hive-config.json found, using default configuration.'); }

console.log(HiveP2P.CONFIG.DISCOVERY.TARGET_NEIGHBORS_COUNT);

const bootstraps = ['ws://localhost:3001'];
const node = await HiveP2P.createNode({ bootstraps });
window.hiveNode = node; // expose to global for debugging