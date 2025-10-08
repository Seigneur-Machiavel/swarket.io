import { PlayerNode } from './player.mjs';
import { TurnSystem } from './turn-system.mjs';

/**
 * @typedef {import('hive-p2p').Node} Node
 * @typedef {import('./actions.mjs').UpgradeAction} UpgradeAction
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').TransactionAction} TransactionAction
 */

export class GameClient {
	T0 = null; 	// time of first turn
	T0Reference = null; // reference time to calculate T0 drift
	node; verb; height = 0; // number of turns
	turnSystem;
	/** @type {Record<string, PlayerNode>} */ players = {};
	onExecutedTurn = []; 	// callbacks
	syncAskedBy = []; 		// ids of nodes who asked for sync

	/** @param {Node} node */
	constructor(node, createPlayerAndStart = false) {
		this.node = node; this.verb = node.verbose;
		this.turnSystem = new TurnSystem(this.node);

		node.onPeerConnect((peerId, direction) => {
			if (!node.publicUrl || direction !== 'in') return; // we are not a public node
			this.players[peerId] = new PlayerNode(peerId); // operatingResource randomly assigned
			this.players[peerId].verb = 0; // reduce logs
			this.syncAskedBy.push(peerId); // request sync on next turn
			node.broadcast({ topic: 'new-player', data: this.players[peerId].extract() });
		});
		this.node.onMessageData((fromId, message) => {
			const { type, data } = message;
			if (type === 'get-game-state')
				this.syncAskedBy.push(fromId);
			else if (type === 'game-state-incoming') this.T0Reference = Date.now() - data; 
			else if (type === 'game-state' && this.height === 0) {
				if (!this.T0Reference) return console.warn(`T0Reference not set, cannot calculate T0 drift`);
				this.#importGameState(data);
				this.#scheduleNextTurn();
			}
		});
		this.node.onGossipData((fromId, message) => {
			const { topic, data } = message;
			if (topic === 'new-player' && !this.players[data.id])
				this.players[data.id] = PlayerNode.playerFromData(data);
			else if (topic === 'turn-intents')
				this.digestPlayerActions(data.intents, data.height, fromId);
		});

		if (!createPlayerAndStart) return;
		this.players[node.id] = new PlayerNode(node.id); // operatingResource randomly assigned
		this.players[node.id].verb = this.verb;
		this.#scheduleNextTurn();
	}

	get myPlayer() { return this.players[this.node.id]; }

	/** @param {Array<SetParamAction | TransactionAction>} actions @param {number} height should be height + 1 */
	digestPlayerActions(actions, height = this.height, id = this.node.id) {
		if (!this.turnSystem.playersIntents[height]) this.turnSystem.playersIntents[height] = {};
		const existingActions = this.turnSystem.playersIntents[height][id];
		if (!existingActions) this.turnSystem.playersIntents[height][id] = actions;
		else for (const act of actions) existingActions.push(act);

		if (id !== this.node.id) return;
		this.node.broadcast({ topic: 'turn-intents', data: { height, intents: actions } });
	}

	// PRIVATE
	#extractGameState() {
		const playersData = [];
		for (const playerId in this.players) playersData.push(this.players[playerId].extract());
		return {
			height: this.height,
			playersData,
			playersIntents: this.turnSystem.playersIntents,
		}
	}
	#importGameState(data) { // CALL ONLY IF T0Reference IS SET!
		const { height, playersData, lastTurnHash, playersIntents } = data;
		this.height = height + 1; // next turn
		this.T0 = this.T0Reference - (this.turnSystem.turnDuration * height);
		console.log(`T0: ${this.T0}`);

		this.T0Reference = null; 	// reset
		this.players = {}; 			// reset
		this.turnSystem.lastTurnHash = lastTurnHash;
		this.turnSystem.playersIntents = playersIntents;
		for (const playerData of playersData)
			this.players[playerData.id] = PlayerNode.playerFromData(playerData);

		console.log('Imported players:');
		for (const playerId in this.players) console.log(this.players[playerId]);

		this.digestPlayerActions([{ type: 'start' }]); // dispatch our presence
	}
	#handleDesync(heightDelta = 1, consensusIds = []) {
		console.warn(`Desync detected! | Delta: ${heightDelta}`);
		if (heightDelta < 0) // we are ahead, just continue
			return this.#scheduleNextTurn();

			// too much behind, request full state
		if (heightDelta >= 5 && consensusIds.length) {
			this.height = 0; // permit resync only if we are at turn 0
			this.node.sendMessage(consensusIds[0], { type: 'get-game-state' });
		}

		// TODO => request missing turns intents from peers
		// until implementation => just continue
		this.#scheduleNextTurn(this.turnSystem.turnDuration); // TEMPORARY
	}
	#sendSyncToAskers(turnExecTime = 0,	newTurnHash = '') {
		if (this.syncAskedBy.length === 0) return;
		for (const fromId of this.syncAskedBy) // small message for clock synchronization
			this.node.sendMessage(fromId, { type: 'game-state-incoming', data: turnExecTime });
		
		const data = this.#extractGameState();
		data.lastTurnHash = newTurnHash;
		for (const fromId of this.syncAskedBy) // heavy data
			this.node.sendMessage(fromId, { type: 'game-state', data });

		if (this.verb > 1) console.log(`%cSent game state #${this.height} to ${this.syncAskedBy.length} askers`, 'color: green');
		this.syncAskedBy = []; // reset
	}
	#scheduleNextTurn(scheduleIn_ = this.T0 + (this.turnSystem.turnDuration * this.height) - Date.now()) {
		if (this.nextTurnTimeout) clearTimeout(this.nextTurnTimeout);
		const scheduleIn = Math.max(0, this.height === 0 ? this.turnSystem.turnDuration : scheduleIn_);
		if (this.verb > 1) console.log(`Scheduling #${this.height} in ${scheduleIn}ms`);

		this.nextTurnTimeout = setTimeout(() => {
			const startTime = Date.now();
			//const { height, occurence, ids } = this.turnSystem.getConsensus();
			//console.log(`consensus:`, { height, occurence, ids: ids.join(', ') });
			//if (this.height !== height) return this.#handleDesync(height - this.height, ids);
				
			const { newTurnHash, turnIntents } = this.turnSystem.organizeIntents(this.height);
			
			// EXECUTE INTENTS (PLAYERS ACTIONS) => Set startTurn for new active players
			this.#execTurnIntents(turnIntents);
			
			// EXECUTE PLAYER TURNS (RESOURCE PRODUCTION, ENERGY DEDUCTION, UPGRADE OFFERS...)
			for (const playerId in this.players)
				this.players[playerId].execTurn(newTurnHash, this.height);

			for (const cb of this.onExecutedTurn) cb(this.height);
			if (this.height === 0) { this.T0 = Date.now(); console.log(`%cT0: ${this.T0}`, 'color: green'); }
			this.#sendSyncToAskers(startTime - Date.now(), newTurnHash);
			
			this.turnSystem.lastTurnHash = newTurnHash;
			
			const timeDrift = Date.now() - this.T0 - (this.turnSystem.turnDuration * this.height);
			if (this.verb > 1) console.log(`> Turn ${this.height} executed | Drift: ${timeDrift}ms`);
			this.height++; // next turn
			this.#scheduleNextTurn();
		}, scheduleIn);
	}
	/** @param {Object<string, Array<SetParamAction | TransactionAction>>} */ turnIntents;
	#execTurnIntents(turnIntents) {
		for (const nodeId in turnIntents) {
			const player = this.players[nodeId];
			if (player.startTurn === 0) player.startTurn = this.height;
			for (const intent of turnIntents[nodeId]) player.execIntent(nodeId, intent);
		}

		//this.node.peerStore
	}
}