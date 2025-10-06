import { PlayerNode } from './player.mjs';
import { TurnSystem } from './turn-system.mjs';

/**
 * @typedef {import('hive-p2p').Node} Node
 */

export class GameClient {
	node; verb; height = 0; // number of turns
	turnSystem;
	/** @type {Record<string, PlayerNode>} */ players = {};
	onExecutedTurn = []; // callbacks

	/** @param {Node} node */
	constructor(node) {
		this.node = node; this.verb = node.verbose;
		this.turnSystem = new TurnSystem(this.node);
		this.players[node.id] = new PlayerNode(node.id, );

		//this.node.onMessageData((fromId, message) => console.log(`[${this.node.id}] from [${fromId}]: ${message}`));
		//this.node.onGossipData((fromId, message) => console.log(`[${this.node.id}]: from [${fromId}]: ${message}`));
		this.node.onGossipData((fromId, message) => {
			if (message.topic === 'turn-intents') this.turnSystem.addNodeIntents(fromId, message.data);
		});

		this.#scheduleNextTurn();
	}

	#scheduleNextTurn(turnExecTime = 0) {
		if (this.nextTurnTimeout) clearTimeout(this.nextTurnTimeout);
		this.nextTurnTimeout = setTimeout(() => {
			const turnStartTime = Date.now();
			const height = this.turnSystem.getConsensusHeight();
			this.turnSystem.organizeIntents(height);
			this.turnSystem.execTurn();
			for (const playerId in this.players) {
				const player = this.players[playerId];
				player.execTurn(height);
				if (playerId !== this.node.id) continue;
				if (player.shouldUpgrade) console.log(`--- Player ${playerId} should upgrade at turn ${height} ---`);
			}
			for (const cb of this.onExecutedTurn) cb(height);
			this.height = height;

			this.#scheduleNextTurn(Date.now() - turnStartTime);
			if (this.verb > 1) console.log(`--- Turn ${height} executed ---`);
		}, this.turnSystem.turnDuration - turnExecTime);
	}
}