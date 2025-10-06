/**
 * @typedef {import('hive-p2p').Node} Node
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').TransactionAction} TransactionAction
 * 
 * @typedef {Object} NodeIntents
 * @property {string} nodeId
 * @property {number} height
 * @property {Array<SetParamAction | TransactionAction>} intents
 */

export class TurnSystem {
	node;
	turnDuration = 2000; // ms
	nextTurnIntents = {}; // { nodeId: { height, intents }, ... }
	/** @type {Array<NodeIntents>} */ turnIntents = [];
	
	/** @param {Node} node */
	constructor(node) { this.node = node; }

	/** @param {Array<SetParamAction | TransactionAction>} actions @param {number} height should be height + 1 */
	digestPlayerActions(actions, height) {
		const playerIntents = { nodeId: this.node.id, height, intents: [] };
		for (const action of actions) playerIntents.intents.push(action);
		this.addNodeIntents(this.node.id, playerIntents);
		return playerIntents;
	}
	/** @param {string} nodeId @param {NodeIntents} intents */
	addNodeIntents(nodeId, intents) {
		this.nextTurnIntents[nodeId] = intents;
	}

	// PRIVATE
	getConsensusHeight() {
		const heightsCount = {};
		for (const nodeId in this.nextTurnIntents) {
			const { height } = this.nextTurnIntents[nodeId];
			heightsCount[height] = (heightsCount[height] || 0) + 1;
		}

		let consensusHeight = { occurence: 0, height: 0 };
		for (const h in heightsCount) {
			if (heightsCount[h] < consensusHeight.occurence) continue;
			const areEqual = heightsCount[h] === consensusHeight.occurence;
			if (areEqual && Number(h) < consensusHeight.height) continue;
			consensusHeight = { occurence: heightsCount[h], height: Number(h) };
		}

		return consensusHeight.height;
	}
	organizeIntents(height = 0) {
		const nodeIds = [];
		for (const nodeId in this.nextTurnIntents)
			if (this.nextTurnIntents[nodeId].height === height) nodeIds.push(nodeId);

		this.turnIntents = []; // reset
		let state = height; // seed
		for (let i = nodeIds.length - 1; i > 0; i--) {
			state = (state * 1664525 + 1013904223) % 4294967296; // LCG
			const j = Math.floor((state / 4294967296) * (i + 1));
			[nodeIds[i], nodeIds[j]] = [nodeIds[j], nodeIds[i]];
		}
		
		for (const nodeId of nodeIds)
			this.turnIntents.push(this.nextTurnIntents[nodeId]);
	}
	execTurn() {
		//this.node.peerStore
	}
}