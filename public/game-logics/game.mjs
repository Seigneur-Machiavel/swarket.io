import { PlayerNode } from './player.mjs';
import { TurnSystem } from './turn-system.mjs';
import { NodeInteractor } from './node-interactions.mjs';
import { SwapModule } from './swap.mjs';

/**
 * @typedef {import('hive-p2p').Node} Node
 * @typedef {import('./actions.mjs').UpgradeAction} UpgradeAction
 * @typedef {import('./actions.mjs').UpgradeModuleAction} UpgradeModuleAction
 * @typedef {import('./actions.mjs').SetParamAction} SetParamAction
 * @typedef {import('./actions.mjs').SetPrivateTradeOffer} SetPrivateTradeOffer
 * @typedef {import('./actions.mjs').CancelPrivateTradeOffer} CancelPrivateTradeOffer
 * @typedef {import('./actions.mjs').TakePrivateTradeOffer} TakePrivateTradeOffer
 * @typedef {import('./actions.mjs').SetTakerOrderAction} SetTakerOrderAction
 * @typedef {import('./actions.mjs').AuthorizedFillsAction} AuthorizedFillsAction
 * @typedef {import('./actions.mjs').RecycleAction} RecycleAction
 *
 * @typedef {UpgradeAction | UpgradeModuleAction | SetParamAction | SetPrivateTradeOffer | CancelPrivateTradeOffer | TakePrivateTradeOffer | SetTakerOrderAction | AuthorizedFillsAction | RecycleAction} Action
 */

export class GameClient {
	extractionMode = 'array'; // 'object'(safe) | 'array'(fast) for data extraction
	alive = true; // Flag to indicate the game is running
	node; verb; height = 0; // number of turns
	turnSystem;
	gameStateAskedFrom = null; // id of node we asked game state from

	/** @type {Record<string, PlayerNode>} */ players = {};
	playersCount = 0;
	alivePlayersCount() { return this.playersCount - this.deadPlayers.size; }
	deadPlayers = new Set();	// temp storage of dead players to be removed
	onExecutedTurn = []; 		// callbacks
	syncAskedBy = []; 			// ids of nodes who asked for sync
	selectedDeadNodeId = null; 	// selected node to recycle from UI
	showingCardOfId = null;		// id of node currently shown in node card UI
	swapModule;

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
	constructor(node, createPlayerAndStart = false, operatingResource) {
		this.#turnExecutionLoop(); // start turn loop => do nothing until scheduled time
		this.node = node; this.verb = node.verbose;
		this.turnSystem = new TurnSystem(this.node);
		this.swapModule = new SwapModule(this);

		node.onPeerConnect((peerId, direction) => this.#onPeerConnect(peerId, direction));
		node.onMessageData((id, message) => this.#onDirectMessage(id, message));
		node.onGossipData((senderId, data, HOPS, message) => this.#onGossipMessage(senderId, data, HOPS, message));
		node.onSignalOffer((fromId, offer) => {
			console.log(`Connection offer received from ${fromId}`, offer);
			this.connectionOffers[fromId] = { offer, expiration: node.time + 30000 };
		});

		if (!createPlayerAndStart) return;
		this.players[node.id] = new PlayerNode(node.id, operatingResource); // operatingResource randomly assigned
		this.turnSystem.T0 = this.node.time; // set T0 to now
		console.log(`%cT0: ${this.turnSystem.T0 / 1000}`, 'color: green');
	}

	get myPlayer() { return this.players[this.node.id]; }
	get getSpectatingPlayer() {
		if (!this.showingCardOfId || !this.players[this.showingCardOfId]) return null;
		return this.players[this.showingCardOfId];
	}

	/** @param {Action} action @param {number} [height] default to this/height or this.height + 1 */
	digestMyAction(action, height) { this.turnSystem.digestMyAction(action, height, this.height); }
	
	/** @param {Action[]} intents @param {number} height @param {string} prevHash @param {string} id */
	digestPlayerIntents(intents, height, prevHash, id) { this.turnSystem.digestPlayerIntents(intents, height, prevHash, id); }
	
	// NODE EVENTS HANDLERS
	/** @param {string} peerId @param {'in'|'out'} direction */
	#onPeerConnect(peerId, direction) {
		if (!this.node.publicUrl || direction !== 'in') return; // we are not a public node
		if (this.players[peerId]) {
			this.syncAskedBy.push(peerId); // send game state at the end of the turn
			return console.warn(`Player already exists for connected peer: ${peerId}`);
		}
		
		const p = new PlayerNode(peerId); // operatingResource randomly assigned
		p.inventory.setAmount('energy', p.maxEnergy);
		p.startTurn = Math.max(this.height, 1); // active from next turn

		if (p.rawProductions.chips) p.rawProductions.engineers = 1; // DEBUG
		else if (p.rawProductions.engineers) p.rawProductions.chips = 5; // DEBUG

		const as = this.extractionMode;
		this.digestMyAction({ type: 'new-player', playerData: p.extract(as), extractionMode: as });
	}
	/** @param {string} senderId @param {import('../../node_modules/hive-p2p/core/unicast.mjs').DirectMessage} message */
	#onDirectMessage(senderId, message) {
		const { type, data } = message;
		if (type === 'get-game-state') this.syncAskedBy.push(senderId);
		else if (type === 'game-state-incoming') this.turnSystem.T0Reference = this.node.time - data;
		else if (type === 'game-state' && this.height === 0) {
			if (!this.turnSystem.T0Reference) return console.warn(`T0Reference not set, cannot calculate T0 drift`);
			console.log(`%cGame state received from ${senderId}`, 'color: green');
			if (!this.node.cryptoCodex.isPublicNode(senderId) && this.gameStateAskedFrom !== senderId) return; // ignore if not from public node or not the one we asked from
			this.#importGameState(data);
		} else if (type === 'set-taker-order' && this.myPlayer?.tradeHub) {
			// TAKER ORDER INTENT RECEIVED -> USE IT TO PRESHOT 'fill-taker-order' ACTION
			const { soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry } = message || {};
			if (expiry <= this.height) return; // expired order

			// TODO: CHECK IF WE WILL BE IMPLICATED IN THE SWAP FROM OUR ACTUAL KNOWLEDGE

			// IF WE ARE IMPLICATED, WE SIGNAL THAT WE WANT TO FILL THE ORDER
			this.myPlayer.tradeHub.handleTakerOrderIntent(senderId, soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry);
		}
	}
	/** @param {string} senderId @param {any} d @param {number} HOPS @param {import('../../node_modules/hive-p2p/core/gossip.mjs').GossipMessage} message */
	#onGossipMessage(senderId, d, HOPS, message) {
		if (senderId === this.node.id) return console.warn(`We received our own gossip message back, ignoring.`);

		const { topic, data } = d;
		const { timestamp } = message;
		//if (this.node.time - timestamp > this.turnSystem.turnDuration / 2) return; // too old message
		if (topic === 'ti') { // 'turn-intents'
			// IF INTENT FOR COMING TURN, SHOULD BE SENT AT A MAXIMUM HALFWAY THROUGH THE TURN
			const [ height, prevHash, intents ] = data;
			const isForComingTurn = height === this.height;
			if (isForComingTurn && this.node.time > this.turnSystem.maxSentTime) {
				if (this.verb > 1) console.warn(`Intent for turn #${height} from ${senderId} received too late (at ${this.node.time}, max was ${this.turnSystem.maxSentTime}), ignoring.`);
				return this.node.arbiter.adjustTrust(senderId, -60_000, 'Peer sent intents too late');
			}

			this.digestPlayerIntents(intents, height, prevHash, senderId);
		} else if (topic === 'pto') { // 'public-trade-offers'
			const player = this.players[senderId];
			if (!player) return console.warn(`No player associated to gossip sender ${senderId}, ignoring 'public-trade-offers' message.`);
			if (player.tradeHub.getSignalRange < HOPS) return this.node.arbiter.adjustTrust(senderId, -600_000, 'Peer sent public trade offers with insufficient signal range');
			if (data[1] <= this.height) return; // expired offers
			player.tradeHub.handleIncomingPublicOffers(senderId, data[0], data[1] - this.height);
			if (this.verb > 2) console.log(`Public trade offers received from ${senderId}:`, data);
		}
	}

	// PRIVATE METHODS
	/** @param {'object' | 'array'} as */
	#extractPlayersData(as = this.extractionMode) {
		const playersData = [];
		for (const playerId in this.players) playersData.push(this.players[playerId].extract(as));
		return { playersData, extractionMode: as };
	}
	#extractGameState() {
		const { extractionMode, playersData } = this.#extractPlayersData();
		return {
			height: this.height,
			prevHash: this.turnSystem.prevHash,
			extractionMode,
			playersData,
			playersIntents: this.turnSystem.playersIntents,
		}
	}
	/** @param {object} data */
	#importGameState(data) { // CALL ONLY IF T0Reference IS SET!
		const { height, playersData, prevHash, playersIntents, extractionMode } = data;
		if (extractionMode !== 'object' && extractionMode !== 'array') return console.warn(`Invalid extraction mode for game state import: ${extractionMode}`);
		this.height = height; 				// next turn
		this.turnSystem.setT0(height);
		this.turnSystem.T0Reference = null; // reset
		this.players = {}; 					// reset
		this.turnSystem.prevHash = prevHash;
		this.turnSystem.playersIntents = playersIntents;
		for (const playerData of playersData) {
			const p = PlayerNode.playerFromData(playerData, extractionMode);
			this.players[p.id] = p;
			this.playersCount++;
		}

		console.log('Imported players:');
		for (const playerId in this.players) console.log(this.players[playerId]);
	}
	/** @param {Set<string>} nodeIds */
	#handleDesync(nodeIds = new Set()) {
		console.warn(`%cDesync detected! => trying to resync`, 'color: yellow');

		let peerId = this.node.peerStore.publicNeighborsList[0]; // prefer public nodes

		// TRY SYNC FROM NEIGHBORS FIRST (if possible)
		if (!peerId) for (const id of this.node.peerStore.neighborsList)
			if (nodeIds.has(id)) { peerId = id; break; }

		// IF NO NEIGHBORS, TRY FROM ANY PEER
		if (!peerId) peerId = nodeIds.values().next().value;
		if (!peerId) return console.warn(`No peer to ask for game state!`);
		
		this.height = 0; // resync only permitted if we are at turn 0
		this.turnSystem.T0 = null;
		this.gameStateAskedFrom = peerId; // good luck ;)
		this.node.sendMessage(peerId, { type: 'get-game-state' });
		console.log(`%cAsked game state from ${peerId}`, 'color: yellow');
	}
	#sendSyncToAskers(turnExecTime = 0) {
		if (this.syncAskedBy.length === 0) return;
		for (const fromId of this.syncAskedBy) // small message for clock synchronization
			this.node.sendMessage(fromId, { type: 'game-state-incoming', data: turnExecTime });
		
		const data = this.#extractGameState();
		for (const fromId of this.syncAskedBy) // heavy data
			this.node.sendMessage(fromId, { type: 'game-state', data });

		if (this.verb > 1) console.log(`%cSent game state #${this.height} to ${this.syncAskedBy.length} askers: ${this.syncAskedBy.join(', ')}`, 'color: green');
		this.syncAskedBy = []; // reset
	}
	async #turnExecutionLoop(frequency = 10) {
		let myIntentsSent = false;
		while (this.alive) {
			await new Promise(r => setTimeout(r, frequency));
			const [time, scheduleTime] = [this.node.time, this.turnSystem.getTurnSchedule(this.height)];
			if (!scheduleTime) continue;

			// CHECK IF WE HAVE HALFWAY INTENTS TO SEND FOR THE CURRENT TURN
			const turnDuration = this.turnSystem.turnDuration;
			const [min, max] = [scheduleTime - (turnDuration * .6), scheduleTime - (turnDuration * .55)];
			if (!myIntentsSent && time > min && time < max) {
				const { fills, count } = this.myPlayer.tradeHub?.prepareAuthorizedFill(this); // prepare authorized fills for taker orders
				if (count > 0) this.digestMyAction({ type: 'authorized-fills', fills });
				if (this.#cleanAndDispatchMyPlayerIntents()) myIntentsSent = true;
			}

			// CHECK IF THE TURN SHOULD BE EXECUTED
			if (scheduleTime > time) continue;

			// CHECK IF WE ARE DESYNCED: 3 or more peers have a different prevHash than us
			const consensus = this.turnSystem.getConsensus(this.height);
			const needSync = !consensus.prevHash
			|| (consensus.nodeIds.size > 1 && consensus.prevHash !== this.turnSystem.prevHash);
			console.log(`> #${this.height.toString().padStart(4, '0')} | co: ${consensus.prevHash} <=> $${consensus.nodeIds.size}/${consensus.total} nodes`);
			if (needSync) {
				console.warn(`%cDesync detected! ${this.turnSystem.prevHash} !== consensus => trying to resync`, 'color: yellow');
				this.#handleDesync(consensus.nodeIds);
				continue;
			}

			const startTime = time;
			const newTurnHash = this.#execTurn();
			const timeDrift = time - this.turnSystem.T0 - (turnDuration * this.height);
			if (this.verb > 2) console.log(`> #${this.height.toString().padStart(4, '0')} | ph: ${this.turnSystem.prevHash} | Drift: ${timeDrift}ms | T0: ${this.turnSystem.T0 / 1000}`);
			
			this.height++; // next turn
			this.turnSystem.prevHash = newTurnHash;
			myIntentsSent = false; // reset

			// MANAGHE PUBLIC TRADE OFFERS => EXPIRY & SELF DISPATCH
			for (const playerId in this.players)
				this.players[playerId].tradeHub?.turnUpdate(this, playerId === this.node.id);
			if (this.alive && this.myPlayer.tradeHub?.publicOffersDispatchRequested)
				NodeInteractor.dispatchPublicTradeOffers(this);

			for (const cb of this.onExecutedTurn) cb(this.height);
			if (this.height > 2) this.#sendSyncToAskers(startTime - time);
		}
	}
	#execTurn() {
		// EXECUTE INTENTS (PLAYERS ACTIONS) => Set startTurn for new active players
		const organizedIds = this.turnSystem.getOrganizedAlivePlayerIds(this);
		const turnIntents = this.turnSystem.playersIntents[this.height] || {};
		this.turnSystem.freeIntentsMemoryUpToHeight(this.height);
		this.#execTurnIntents(organizedIds, turnIntents);
		this.swapModule.attributeTurnThefts(organizedIds, this.turnSystem.prevHash);
		this.swapModule.execTurnSwaps(this, organizedIds);
		
		// HASH THE TURN AFTER INTENTS EXECUTION > LAST TIME TO AVOID ANTICIPATION
		const newTurnHash = this.turnSystem.getTurnHash(this.height, this.#extractPlayersData().playersData);
		this.deadPlayers = new Set(); 	// reset

		// EXECUTE PLAYER TURNS (RESOURCE PRODUCTION, ENERGY DEDUCTION, UPGRADE OFFERS...)
		this.#execPlayersTurn(organizedIds, newTurnHash); // will fill deadPlayers set
		this.#removeDeadPlayers();

		// MANAGE OUR NODE DEATH IF WE HAVE NO ENERGY LEFT
		if (!this.myPlayer.getEnergy) {
			this.alive = false; // stop the game client
			this.connectionOffers = {}; // clear offers if dead
			this.node.topologist.automation.incomingOffer = false; // disable auto-accept if dead
			this.node.topologist.automation.connectBootstraps = false; // disable auto-connect to bootstraps if dead
			if (typeof window !== 'undefined') alert('You have run out of energy and are now dead. Refresh the page to restart as a new player.');
		}

		return newTurnHash;
	}
	#cleanAndDispatchMyPlayerIntents(height = this.height) {
		const validActions = this.turnSystem.getMyCleanIntents(this.selectedDeadNodeId, height);
		this.selectedDeadNodeId = null; // reset
		if (!validActions) return; // no valid actions to send

		const data = [height, this.turnSystem.prevHash, validActions];
		this.node.broadcast({ topic: 'ti', data });
		if (this.verb > 3) console.log(`%c[${this.node.id}] Dispatched intents for turn #${height}`, 'color: white');
		return true;
	}
	/** @param {string[]} playerIds @param {Object<string, { actions: Action[] }>} turnIntents */
	#execTurnIntents(playerIds, turnIntents) {
		for (const playerId of playerIds) {
			const player = this.players[playerId];
			if (!player) continue;
			if (!player.startTurn) player.startTurn = this.height;
			for (const intent of turnIntents[playerId]?.actions || []) {
				if (!player.execIntent(this, playerId, intent)) continue;
				if (this.verb > 2) console.log(`%cExecuted intent of ${playerId}:`, 'color: orange', intent.type);
			}
		}
	}
	/** @param {string} playerIds @param {string} newTurnHash */
	#execPlayersTurn(playerIds, newTurnHash) {
		for (const playerId of playerIds) {
			const player = this.players[playerId];
			if (!player.getEnergy && !this.deadPlayers.has(playerId)) this.deadPlayers.add(playerId);
			else player.execTurn(newTurnHash, this.height);
		}
	}
	/** @param {number} [minDeathAge] in turns | default 30 */
	#removeDeadPlayers(minDeathAge = 30) {
		const toRemove = [];
		for (const playerId of this.deadPlayers) {
			if (playerId === this.node.id) continue;
			// CHECK IF PLAYER HAS NO RAW RESOURCES or DIED A LONG TIME AGO BEFORE REMOVING.
			const deathHeight = this.players[playerId].startTurn + this.players[playerId].lifetime;
			const isDeadALongTimeAgo = this.height - deathHeight > minDeathAge;
			const hasResources = this.players[playerId].inventory.getRecyclingResult().hasResources;
			if (isDeadALongTimeAgo || !hasResources) toRemove.push(playerId);
		}

		for (const playerId of toRemove) {
			// REMOVE PLAYER FROM ALL TRACKING STRUCTURES
			delete this.players[playerId];
			this.deadPlayers.delete(playerId);
			this.playersCount--;
			if (this.verb > 1) console.log(`Player ${playerId} removed from game (dead).`);

			// KICK PEER IF CONNECTED
			for (const nodeId of this.node.peerStore.neighborsList)
				if (nodeId === playerId) this.node.kickPeer(nodeId, 'Player is dead');
		}
	}
}