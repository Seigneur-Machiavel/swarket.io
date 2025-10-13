const xxHash32 = typeof window !== 'undefined'
	? (await import('../hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32))
	: (await import('../../node_modules/hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32));
import { SeededRandom } from './seededRandom.mjs';
import { filterValidActions } from './actions.mjs';

/**
 * @typedef {import('hive-p2p').Node} Node
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').TransactionAction} TransactionAction
 */

export class TurnSystem {
	node; verb;
	prevHash = 'hive-p2p-is-the-best-p2p'; // hash of last executed turn
	turnDuration = 2000; // ms

	T0 = null; 	// time of first turn
	T0Reference = null; // reference time to calculate T0 drift
	turnsSchedules = new Map(); // height => timestamp
	
	/** @type {Record<number, Record<string, { prevHash: string, actions: Array<SetParamAction | TransactionAction> }>>} */
	playersIntents = {}; // { height: { nodeId: { prevHash: string, [intents...]} }, ... }

	/** @param {Node} node */
	constructor(node) { this.node = node; this.verb = node.verbose; }

	// SCHEDULING
	setT0(height = 0) { this.T0 = this.T0Reference - (this.turnDuration * (height - 1)); console.log(`%cT0: ${this.T0 / 1000}`, 'color: green'); }
	getTurnSchedule(height = 0) {
		if (!this.T0) return 0;
		if (!this.turnsSchedules.has(height))
			this.turnsSchedules.set(height, Math.max(0, this.T0 + (this.turnDuration * height)));

		return this.turnsSchedules.get(height);
	}
	maxSentTime(height = 0, time = this.node.time) {
		return this.getTurnSchedule(height, time) - (this.turnDuration * .5);
	}

	// CONSENSUS
	getConsensus(height = 0) {
		if (!height) return { prevHash: this.prevHash, nodeIds: new Set([this.node.id]) };
		const result = { prevHash: null, nodeIds: new Set(), total: 0 };
		const prevHashes = {};
		for (const nodeId in this.playersIntents[height] || {}) {
			const { prevHash } = this.playersIntents[height][nodeId];
			if (!prevHashes[prevHash]) prevHashes[prevHash] = new Set();
			prevHashes[prevHash].add(nodeId);
			result.total++;
		}
		
		for (const h in prevHashes)
			if (prevHashes[h].size < result.nodeIds.size) continue;
			else { result.prevHash = h; result.nodeIds = prevHashes[h]; }

		return result;
	}
	// INTENTS (PLAYERS ACTIONS)
	getMyCleanIntents(selectedDeadNodeId, height = 0) {
		const playersIntents = this.playersIntents;
		if (!selectedDeadNodeId && !playersIntents[height]?.[this.node.id]) return; // no intents at all

		// IF WE ARE TRYING TO RECYCLE A NODE, ADD THE INTENT
		if (!playersIntents[height]) playersIntents[height] = {};
		if (!playersIntents[height][this.node.id]) playersIntents[height][this.node.id] = { prevHash: this.prevHash, actions: [] };
		const actions = playersIntents[height][this.node.id].actions;
		if (selectedDeadNodeId) actions.push({ type: 'recycle', fromDeadNodeId: selectedDeadNodeId });

		const validActions = filterValidActions(actions);
		playersIntents[height][this.node.id].actions = validActions; // clean invalid actions
		if (actions.length && validActions.length === 0) console.warn(`Our actions were all invalid:`, actions);
		if (validActions.length > 0) return validActions;
	}
	/** @param {Action} action @param {number} [height] default to this/height or this.height + 1 @param {number} thisHeight default to this.height */
	digestMyAction(action, height, thisHeight = 0) {
		const maxSentTimeForCurrentTurn = this.getTurnSchedule(thisHeight) - (this.turnDuration * .6);
		const maxSentTimeReached = this.node.time > maxSentTimeForCurrentTurn;
		const h = height === undefined && !maxSentTimeReached ? thisHeight : thisHeight + 1;
		if (this.verb > 3 && height === undefined && !maxSentTimeReached) console.info(`%cAdding action for current turn #${thisHeight}`, 'color: pink', action);
		if (!this.playersIntents[h]) this.playersIntents[h] = {};
		if (!this.playersIntents[h][this.node.id]) this.playersIntents[h][this.node.id] = { prevHash: this.prevHash, actions: [] };
		this.playersIntents[h][this.node.id].actions.push(action);
		if (this.verb > 2) console.log(`Our action added for turn #${h}:`, action);
	}
	/** @param {Action[]} intents @param {number} height @param {string} prevHash @param {string} id */
	digestPlayerIntents(intents, height, prevHash, id) {
		if (!this.playersIntents[height]) this.playersIntents[height] = {};
		if (this.playersIntents[height][id]) return console.warn(`We already have intents for turn #${height} from ${id}, ignoring.`);
		const intent = { prevHash, actions: filterValidActions(intents) };
		this.playersIntents[height][id] = intent;

		if (id === this.node.id) console.warn(`We received our own intents back from gossip, ignoring.`);
		else if (this.verb > 2) console.log(`Intents received for turn #${height} from ${id}:`, this.playersIntents[height][id]);
	}
	organizeIntents(height = 0) {
		const nodeIds = Object.keys(this.playersIntents[height] || {});
		const turnIntents = {};
		for (const nodeId of SeededRandom.shuffle(nodeIds, this.prevHash))
			turnIntents[nodeId] = this.playersIntents[height][nodeId].actions;
		
		delete this.playersIntents[height - 2]; // free memory
		delete this.playersIntents[height - 1]; // free memory
		return turnIntents;
	}
	getTurnHash(height, playersData = []) {
		/** @type {string} */
		const newTurnHash = xxHash32(`${this.prevHash}-${height}-${JSON.stringify(playersData)}`).toString(16);
		return newTurnHash;
	}
}