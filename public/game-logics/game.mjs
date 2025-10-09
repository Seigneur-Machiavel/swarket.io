import { PlayerNode } from './player.mjs';
import { TurnSystem } from './turn-system.mjs';
import { NodeInteractor } from './node-interactions.mjs';
import { filterValidActions } from './actions.mjs';

/**
 * @typedef {import('hive-p2p').Node} Node
 * @typedef {import('./actions.mjs').UpgradeAction} UpgradeAction
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').TransactionAction} TransactionAction
 * @typedef {import('./actions.mjs').RecycleAction} RecycleAction
 * 
 * @typedef {UpgradeAction | SetParamAction | TransactionAction | RecycleAction} Action
 */

export class GameClient {
	alive = true; // Flag to indicate the game is running
	T0 = null; 	// time of first turn
	T0Reference = null; // reference time to calculate T0 drift
	node; verb; height = 0; // number of turns
	nodeInteractor;
	turnSystem;
	gameStateAskedFrom = null; // id of node we asked game state from
	nextTurnScheduledAt = 0;

	/** @type {Record<string, PlayerNode>} */ players = {};
	deadPlayers = new Set();	 // temp storage of dead players to be removed
	onExecutedTurn = []; 		// callbacks
	syncAskedBy = []; 			// ids of nodes who asked for sync
	selectedDeadNodeId = null; 	// selected node to recycle from UI

	/** @type {Record<string, { offer: {signal: string, offerHash: string}, expiration: number }>} */
	connectionOffers = {}; // pending connection offers { nodeId: { offer: object, expiration: number } }
	connectionOffersCleanupInterval = setInterval(() => {
		const now = this.node.time;
		for (const nodeId in this.connectionOffers) {
			if (this.connectionOffers[nodeId].expiration > now) continue;
			delete this.connectionOffers[nodeId];
			if (this.verb > 1) console.log(`Connection offer from ${nodeId} expired and removed.`);
		}
	}, 2000);

	/** @param {Node} node */
	constructor(node, createPlayerAndStart = false) {
		this.#turnExecutionLoop(); // start turn loop => do nothing until scheduled time
		this.node = node; this.verb = node.verbose;
		this.nodeInteractor = new NodeInteractor(node, this.players);
		this.turnSystem = new TurnSystem(this.node);

		node.onPeerConnect((peerId, direction) => this.#onPeerConnect(peerId, direction));
		this.node.onMessageData((fromId, message) => this.#onDirectMessage(fromId, message));
		this.node.onGossipData((fromId, message) => this.#onGossipMessage(fromId, message));

		if (!createPlayerAndStart) return;
		this.players[node.id] = new PlayerNode(node.id); // operatingResource randomly assigned
		this.players[node.id].verb = this.verb;
		this.#scheduleNextTurn();
	}

	get myPlayer() { return this.players[this.node.id]; }

	/** @param {Action} action @param {number} [height] default to this/height or this.height + 1 */
	digestMyAction(action, height) {
		const maxSentTimeForCurrentTurn = this.nextTurnScheduledAt - (this.turnSystem.turnDuration * .55);
		const maxSentTimeReached = this.node.time > maxSentTimeForCurrentTurn;
		const h = height === undefined && !maxSentTimeReached ? this.height : this.height + 1;
		if (this.verb > 3 && height === undefined && !maxSentTimeReached) console.info(`%cAdding action for current turn #${this.height}`, 'color: pink', action);
		if (!this.turnSystem.playersIntents[h]) this.turnSystem.playersIntents[h] = {};
		if (!this.turnSystem.playersIntents[h][this.node.id]) this.turnSystem.playersIntents[h][this.node.id] = [];
		this.turnSystem.playersIntents[h][this.node.id].push(action);
		if (this.verb > 2) console.log(`Our action added for turn #${h}:`, action);
	}
	/** @param {Action[]} actions @param {number} height @param {string} id */
	digestPlayerActions(actions, height, id) {
		if (!this.turnSystem.playersIntents[height]) this.turnSystem.playersIntents[height] = {};
		if (this.turnSystem.playersIntents[height][id]) return; // already have intents for this height from this id
		this.turnSystem.playersIntents[height][id] = filterValidActions(actions);
		
		if (id === this.node.id) console.warn(`We received our own intents back from gossip, ignoring.`);
		else if (this.verb > 2) console.log(`Intents received for turn #${height} from ${id}:`, this.turnSystem.playersIntents[height][id]);
	}
	
	// NODE EVENTS HANDLERS
	/** @param {string} peerId @param {'in'|'out'} direction */
	#onPeerConnect(peerId, direction) {
		if (!this.node.publicUrl || direction !== 'in') return; // we are not a public node
		if (this.players[peerId]) return console.warn(`Player already exists for connected peer: ${peerId}`);
		const p = new PlayerNode(peerId); // operatingResource randomly assigned
		p.startTurn = Math.max(this.height, 1); // active from next turn
		p.verb = 0; // reduce logs
		this.players[peerId] = p;
		this.node.broadcast({ topic: 'new-player', data: p.extract() });
		this.syncAskedBy.push(peerId); // request sync on next turn
	}
	/** @param {string} fromId @param {import('../../node_modules/hive-p2p/core/unicast.mjs').DirectMessage} message */
	#onDirectMessage(fromId, message) {
		const { type, data } = message;
		if (type === 'get-game-state') this.syncAskedBy.push(fromId);
		else if (type === 'game-state-incoming') this.T0Reference = this.node.time - data; 
		else if (type === 'game-state' && this.height === 0) {
			if (!this.T0Reference) return console.warn(`T0Reference not set, cannot calculate T0 drift`);
			if (!this.node.cryptoCodex.isPublicNode(fromId) && this.gameStateAskedFrom !== fromId) return; // ignore if not from public node or not the one we asked from
			this.#importGameState(data);
			this.#scheduleNextTurn();
		}
	}
	/** @param {string} fromId @param {import('../../node_modules/hive-p2p/core/gossip.mjs').GossipMessage} message */
	#onGossipMessage(fromId, message) {
		const { topic, data, timestamp } = message;
		//if (this.node.time - timestamp > this.turnSystem.turnDuration / 2) return; // too old message
		if (topic === 'new-player' && !this.players[data.id]) {
			this.players[data.id] = PlayerNode.playerFromData(data);
			console.log(`New player added from gossip: ${data.id}`);
		} else if (topic === 'turn-intents') {
			// IF INTENT FOR COMING TURN, SHOULD BE SENT AT A MAXIMUM HALFWAY THROUGH THE TURN
			const isForComingTurn = data.height === this.height;
			const maxSentTime = this.nextTurnScheduledAt - (this.turnSystem.turnDuration * .45);
			if (isForComingTurn && this.node.time > maxSentTime) return; // too late for coming turn
			this.digestPlayerActions(data.intents, data.height, fromId);
		}
	}

	// PRIVATE METHODS
	#extractPlayersData() {
		const playersData = [];
		for (const playerId in this.players) playersData.push(this.players[playerId].extract());
		return playersData;
	}
	#extractGameState() {
		return {
			height: this.height,
			playersData: this.#extractPlayersData(),
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
	}
	#handleDesync(heightDelta = 1, consensusIds = []) {
		console.warn(`Desync detected! | Delta: ${heightDelta}`);
		if (heightDelta < 0) // we are ahead, just continue
			return this.#scheduleNextTurn();

			// too much behind, request full state
		if (heightDelta >= 5 && consensusIds.length) {
			this.height = 0; // permit resync only if we are at turn 0
			this.node.sendMessage(consensusIds[0], { type: 'get-game-state' });
			this.gameStateAskedFrom = consensusIds[0];
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
	async #turnExecutionLoop(frequency = 10) {
		let turnHalfwaySent = false;
		while (this.alive) {
			await new Promise(r => setTimeout(r, frequency));
			if (!this.nextTurnScheduledAt) continue;

			// CHECK IF WE HAVE HALFWAY INTENTS TO SEND FOR THE CURRENT TURN
			const minSentTime = this.nextTurnScheduledAt - (this.turnSystem.turnDuration * .55);
			const maxSentTime = this.nextTurnScheduledAt - (this.turnSystem.turnDuration * .5);
			if (!turnHalfwaySent && this.node.time > minSentTime && this.node.time < maxSentTime) {
				this.#dispatchMyPlayerIntents();
				turnHalfwaySent = true;
				if (this.verb > 3) console.log(`%cHalfway through turn #${this.height}, dispatched our intents`, 'color: purple');
			}

			// CHECK IF THE TURN SHOULD BE EXECUTED
			if (this.nextTurnScheduledAt > this.node.time) continue;

			const startTime = this.node.time;
			this.#execTurn(startTime);
			const timeDrift = this.node.time - this.T0 - (this.turnSystem.turnDuration * this.height);
			if (this.verb > 1) console.log(`> #${this.height} | LTH: ${this.turnSystem.lastTurnHash} | Drift: ${timeDrift}ms`);
			this.height++; // next turn
			turnHalfwaySent = false; // reset
			
			this.#dispatchMyPlayerIntents();
			this.#scheduleNextTurn();
		}
	}
	#scheduleNextTurn() {
		const scheduleIn = Math.max(0, this.T0 + (this.turnSystem.turnDuration * this.height) - this.node.time);
		if (this.verb > 3) console.log(`Scheduling #${this.height} in ${scheduleIn}ms`);
		this.nextTurnScheduledAt = this.node.time + scheduleIn;
	}
	#execTurn(startTime = this.node.time) {
		// EXECUTE INTENTS (PLAYERS ACTIONS) => Set startTurn for new active players
		const turnIntents = this.turnSystem.organizeIntents(this.height);
		this.#execTurnIntents(turnIntents);
		
		// EXECUTE PLAYER TURNS (RESOURCE PRODUCTION, ENERGY DEDUCTION, UPGRADE OFFERS...)
		const newTurnHash = this.turnSystem.getTurnHash(this.height, this.#extractPlayersData());
		this.deadPlayers = new Set(); 		// reset
		this.#execPlayersTurn(newTurnHash); // will fill deadPlayers set
		this.#removeDeadPlayers();

		for (const cb of this.onExecutedTurn) cb(this.height);
		if (!this.height) { this.T0 = this.node.time; console.log(`%cT0: ${this.T0}`, 'color: green'); }
		if (this.height > 1) this.#sendSyncToAskers(startTime - this.node.time, newTurnHash);

		this.turnSystem.lastTurnHash = newTurnHash;
		if (!this.myPlayer.energy) this.connectionOffers = {}; // clear offers if dead
	}
	#dispatchMyPlayerIntents(height = this.height) {
		const playersIntents = this.turnSystem.playersIntents;
		if (!this.selectedDeadNodeId && !playersIntents[height]?.[this.node.id]) return; // no intents at all

		// IF WE ARE TRYING TO RECYCLE A NODE, ADD THE INTENT
		if (!playersIntents[height]) playersIntents[height] = {};
		if (!playersIntents[height][this.node.id]) playersIntents[height][this.node.id] = [];
		const actions = playersIntents[height][this.node.id];
		if (this.selectedDeadNodeId) actions.push({ type: 'recycle', fromDeadNodeId: this.selectedDeadNodeId });
		this.selectedDeadNodeId = null; // reset

		const validActions = filterValidActions(actions);
		if (actions.length && validActions.length === 0) console.warn(`Our actions were all invalid:`, actions);
		if (validActions.length === 0) return;
		this.node.broadcast({ topic: 'turn-intents', data: { height, intents: validActions } });
		if (this.verb > 3) console.log(`Dispatched intents for turn #${height}:`, validActions);
	}
	/** @param {Object<string, Action[]>} turnIntents */
	#execTurnIntents(turnIntents) {
		for (const nodeId in turnIntents) {
			const player = this.players[nodeId];
			if (!player) continue;
			if (!player.startTurn) player.startTurn = this.height;
			for (const intent of turnIntents[nodeId]) {
				if (!player.execIntent(this, nodeId, intent)) continue;
				//if (player.id === this.node.id) continue;
				if (intent.type === 'noop') continue;
				if (this.verb > 2) console.log(`%cExecuted intent of ${player.id}:`, 'color: orange', intent.type);
			}
		}

		//this.node.peerStore
	}
	#execPlayersTurn(newTurnHash = '') {
		for (const playerId in this.players)
			if (!this.players[playerId].energy && !this.deadPlayers.has(playerId)) this.deadPlayers.add(playerId);
			else this.players[playerId].execTurn(newTurnHash, this.height);
	}
	/** @param {number} [minDeathAge] in turns | default 30 */
	#removeDeadPlayers(minDeathAge = 30) {
		const toRemove = [];
		for (const playerId of this.deadPlayers) {
			if (playerId === this.node.id) continue;
			// CHECK IF PLAYER HAS NO RAW RESOURCES or DIED A LONG TIME AGO BEFORE REMOVING.
			const deathHeight = this.players[playerId].startTurn + this.players[playerId].lifetime;
			const isDeadALongTimeAgo = this.height - deathHeight > minDeathAge;
			const hasResources = this.players[playerId].getRecyclingResult().hasResources;
			if (isDeadALongTimeAgo || !hasResources) toRemove.push(playerId);
		}

		for (const playerId of toRemove) {
			delete this.players[playerId];
			this.deadPlayers.delete(playerId);
			if (this.verb > 1) console.log(`Player ${playerId} removed from game (dead).`);
		}

		for (const nodeId of this.node.peerStore.neighborsList)
			if (!this.players[nodeId]?.energy) this.node.kickPeer(nodeId, 'Player is dead');
	}
}