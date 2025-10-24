/** @type {import('hive-p2p/libs/xxhash32.mjs').xxHash32} */
const xxHash32 = typeof window !== 'undefined'
	? (await import('../hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32))
	: (await import('hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32));

// Generates next LCG state
function lcg(state) { return (state * 1664525 + 1013904223) % 4294967296; }

export class SeededRandom {

	/** Shuffles array in-place with deterministic seed @param {string | number} seed */
	static shuffle(array = [], seed = 0) {
		array.sort();
		let state = typeof seed === 'string' ? xxHash32(seed) : seed;
		for (let i = array.length - 1; i > 0; i--) {
			state = lcg(state);
			const j = Math.floor((state / 4294967296) * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	/** Picks N random items from array (no mutation) @param {string | number} seed */
	static pick(array = [], count = 2, seed = 0) {
		if (count >= array.length) return [...array];

		const shuffled = SeededRandom.shuffle([...array], seed);
		return shuffled.slice(0, count);
	}

	/** Picks one random item from array @param {string | number} seed */
	static pickOne(array = [], seed = 0) {
		if (array.length === 0) return;
		const state = lcg(typeof seed === 'string' ? xxHash32(seed) : seed);
		return array[state % array.length];
	}
}

/**
 * @typedef {import('./actions.mjs').UpgradeAction} UpgradeAction
 * @typedef {import('./actions.mjs').UpgradeModuleAction} UpgradeModuleAction
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').SetPrivateTradeOffer} SetPrivateTradeOffer
 * @typedef {import('./actions.mjs').CancelPrivateTradeOffer} CancelPrivateTradeOffer
 * @typedef {import('./actions.mjs').TakePrivateTradeOffer} TakePrivateTradeOffer
 * @typedef {import('./actions.mjs').RecycleAction} RecycleAction
 *
 * @typedef {UpgradeAction | UpgradeModuleAction | SetParamAction | SetPrivateTradeOffer | CancelPrivateTradeOffer | TakePrivateTradeOffer | RecycleAction} Action
 */

/** Computes intents consensus
 * @param {Record<number, Record<string, { prevHash: string, actions: Array<Action> }>>} intents
 * @param {string} p
 * @param {number} height
 * @param {string} selfId */
export function getIntentsConsensus(intents, p = 'prevHash', height = 0, selfId) {
	if (!height) return { prevHash: p, nodeIds: new Set([selfId]), total: 1 };
	const result = { prevHash: 'toto', nodeIds: new Set(), total: 0 };
	const prevHashes = {};
	for (const nodeId in intents[height] || {}) {
		const { prevHash } = intents[height][nodeId];
		if (!prevHashes[prevHash]) prevHashes[prevHash] = new Set();
		prevHashes[prevHash].add(nodeId);
		result.total++;
	}
	
	for (const h in prevHashes)
		if (prevHashes[h].size < result.nodeIds.size) continue;
		else { result.prevHash = h; result.nodeIds = prevHashes[h]; }

	return result;
}