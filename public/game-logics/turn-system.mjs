const xxHash32 = typeof window !== 'undefined'
	? (await import('../hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32))
	: (await import('../../node_modules/hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32));
import { SeededRandom } from './seededRandom.mjs';
/**
 * @typedef {import('hive-p2p').Node} Node
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').TransactionAction} TransactionAction
 */

export class TurnSystem {
	node;
	lastTurnHash = 'hive-p2p-is-the-best-p2p'; // hash of last executed turn
	turnDuration = 2000; // ms
	playersIntents = {}; // { height: { nodeId: [intents...], ... } }
	
	/** @param {Node} node */
	constructor(node) { this.node = node; }

	getConsensus() { // DEPRECATED => should be based on turn hash
		const heightsCount = {};
		const idsByHeight = {};
		for (const nodeId in this.nextTurnIntents) {
			const { height } = this.nextTurnIntents[nodeId];
			heightsCount[height] = (heightsCount[height] || 0) + 1;
			if (!idsByHeight[height]) idsByHeight[height] = [];
			idsByHeight[height].push(nodeId);
		}

		let consensus = { occurence: 0, height: 0, ids: [] };
		for (const h in heightsCount) {
			if (heightsCount[h] < consensus.occurence) continue;
			const areEqual = heightsCount[h] === consensus.occurence;
			if (areEqual && Number(h) < consensus.height) continue;
			consensus = { occurence: heightsCount[h], height: Number(h), ids: idsByHeight[h] };
		}

		return consensus;
	}
	organizeIntents(height = 0) {
		const nodeIds = Object.keys(this.playersIntents[height] || {});
		const turnIntents = {};
		let newTurnHashSeed = `${this.lastTurnHash}-${height}`;
		for (const nodeId of SeededRandom.shuffle(nodeIds, this.lastTurnHash)) {
			turnIntents[nodeId] = this.playersIntents[height][nodeId];
			newTurnHashSeed += `-${nodeId}`;
		}
		delete this.playersIntents[height]; // free memory

		/** @type {string} */
		const newTurnHash = xxHash32(newTurnHashSeed).toString(16); // new turn hash
		return { newTurnHash, turnIntents };
	}
}