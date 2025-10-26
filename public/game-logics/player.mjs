import { randomOperatingResource, newRawResourcesSet, Inventory } from './resources.mjs';
import { UpgradesTool, UpgradeSet, Upgrader } from './upgrades.mjs';
import { BuildingBuilder, Building, Reactor, Fabricator, TradeHub } from './buildings.mjs';

export class PlayerNode {
	name = 'PlayerName'; id;
	operatingResource; 	// 'chips' | 'datas' | 'models' | 'engineers' => first assigned
	lifetime = 0;		// in turns
	startTurn = 0;
	get getEnergy() { return this.inventory.getAmount('energy'); }
	maxEnergy = 100;

	production;			// raw (tier 1) resources only
	rawProductionRate = 1; // 0 | .25 | .5 | .75 | 1
	turnEnergyChanges = { consumptions: [], productions: [] }; // filled only during turn exec

	inventory; 			// inventory for resources
	upgradeSet;			// current upgrade set
	upgradeOffers = []; // upgrade offers

	/** @returns {number} */
	get getMaxConnections() { return this.tradeHub?.getMaxConnections || 0; }
	// BUILDINGS ------------------------------------------------------------------\
	/** @type {Reactor | null} */ 		reactor = null;		// reactor building		|
	/** @type {Fabricator | null} */ 	fabricator = null; 	// fabricator building	|
	/** @type {TradeHub | null} */		tradeHub = null;	// tradeHub building	|
	// ----------------------------------------------------------------------------/

	/** @param {string} id @param {'chip' | 'data' | 'models' | 'engineers' | undefined} operatingResource Randomly selected if undefined */
	constructor(id, operatingResource, upgradeSet = new UpgradeSet()) {
		this.id = id;
		this.operatingResource = operatingResource || randomOperatingResource();
		this.production = newRawResourcesSet(this.operatingResource);
		this.inventory = new Inventory();
		this.upgradeSet = upgradeSet;

		this.reactor = new Reactor(); // DEBUG
		this.reactor.upgradePoints = 10; // DEBUG bypass
		this.upgradeSet.buildReactor = 1; // DEBUG bypass
		this.fabricator = new Fabricator(); // DEBUG
		this.upgradeSet.buildFabricator = 1; // DEBUG bypass
		this.tradeHub = new TradeHub(); // DEBUG
		this.tradeHub.upgradePoints = 10; // DEBUG bypass
		this.upgradeSet.buildTradeHub = 1; // DEBUG bypass
		this.tradeHub.upgradeModule('trader'); // DEBUG bypass
		this.tradeHub.upgradeModule('trader'); // DEBUG bypass
		this.tradeHub.upgradeModule('connectivity'); // DEBUG bypass
	}
	/** @param {'object' | 'array'} extractionMode */
	static playerFromData(data, extractionMode) {
		if (extractionMode !== 'object' && extractionMode !== 'array') throw new Error('Invalid "from" parameter, must be "object" or "array".');
		const p = new PlayerNode();

		let i = 0;
		for (const k in extractionMode === 'object' ? data : p) {
			const d = extractionMode === 'object' ? data[k] : data[i++];
			if (k === 'inventory') p.inventory = new Inventory(d);
			else if (k === 'reactor') p.reactor = BuildingBuilder.rebuildClasseIfItCanBe(d, k, extractionMode);
			else if (k === 'fabricator') p.fabricator = BuildingBuilder.rebuildClasseIfItCanBe(d, k, extractionMode);
			else if (k === 'tradeHub') p.tradeHub = BuildingBuilder.rebuildClasseIfItCanBe(d, k, extractionMode);
			else p[k] = d;
		}
		return p;
	}
	/** @param {'object' | 'array'} extractionMode @returns {object | Array<any>} */
	extract(extractionMode = 'object') {
		if (extractionMode === 'object') {
			const sendable = {}; 	// TO OBJECT - SAFE
			for (const k in this) sendable[k] = this[k]?.extract ? this[k].extract(extractionMode) : this[k];
			return sendable;
		}

		const sendable = []; 		// TO ARRAY  - LIGHT
		for (const k in this) sendable.push(this[k]?.extract ? this[k].extract() : this[k]);
		return sendable;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} nodeId @param {{type: string}} intent */
	execIntent(gameClient, nodeId, intent) {
		if (intent.type === 'set-param') return this.#handleSetParamIntent(intent);
		else if (intent.type === 'transaction') console.log(`[${nodeId}] Transaction:`, intent.amount, intent.resource, '->', intent.to);
		else if (intent.type === 'upgrade') return this.#handleUpgradeIntent(gameClient, intent.upgradeName);
		else if (intent.type === 'upgrade-module') return this.#handleUpgradeModuleIntent(intent);
		else if (intent.type === 'set-private-trade-offer') return this.#handleSetPrivateTradeOfferIntent(intent);
		else if (intent.type === 'cancel-private-trade-offer') return this.#handleCancelPrivateTradeOfferIntent(intent);
		else if (intent.type === 'take-private-trade-offer') return this.#handleTakePrivateTradeOfferIntent(gameClient, intent);
		else if (intent.type === 'set-taker-order') return this.#handleSetTakerOrderIntent(intent);
		else if (intent.type === 'authorized-fills') return this.#handleAuthorizedFillsIntent(intent);
		else if (intent.type === 'recycle') return this.#handleRecycleIntent(gameClient, intent.fromDeadNodeId);
		else if (intent.type === 'new-player') return this.#handleNewPlayerIntent(gameClient, nodeId, intent);
	}
	execTurn(turnHash = 'toto', height = 0) {
		if (!this.startTurn || !this.getEnergy) return; // inactive
		this.lifetime++;
		//console.log(`[${this.id}] lifetimme:`, this.lifetime);
		const wear = Math.floor(this.lifetime / 10) * 0.01; // +1% every 10 turns
		const basis = .5 * (1 + wear); 		// base consumption
		this.#setEnergyChange(-basis);		// maintenance consumption
		this.#setEnergyChange(this.#produceRawResources(basis));
		this.#setEnergyChange(this.reactor?.consumeResourcesAndGetProduction(this, turnHash).energy);
		this.#applyEnergyChange();
		//TODO: tradeHub energy consumption
		//TODO: fabricator production & consumption
		this.#addUpgradeOffer(turnHash);

		if (!this.getEnergy) this.upgradeOffers = []; // clear offers if dead
	}

	// TURN EXEC => INTENTS
	/** @param {{param: string, buildingName: string, lineName: string, value: any}} intent */
	#handleSetParamIntent(intent) {
		const { param, buildingName, lineName, value } = intent;
		/** @type {Building | null} */
		const building = this[buildingName] || null;
		if (!buildingName && building === null) return console.warn(`[${this.id}] Cannot set param, no building:`, buildingName);
		
		const lineIndex = lineName ? building?.activeProductionLines.indexOf(lineName) : -1;
		if (lineName && lineIndex === -1) return console.warn(`[${this.id}] Cannot set param, unknown production line:`, lineName);
		
		console.log(`[${this.id}] Set param:`, param, value);
		switch (param) {
			case 'rawProductionRate':
				if (![0, .25, .5, .75, 1].includes(value)) return;
				this.rawProductionRate = value;
				break;
			case 'buildingProductionRate':
				if (!building || ![0, .25, .5, .75, 1].includes(value)) return;
				if (lineIndex === -1) return console.warn(`[${this.id}] Cannot set param, unknown production line:`, lineName);
				building.productionRates[lineIndex] = value;
				break;
			default:
				return console.warn(`[${this.id}] Unknown param to set:`, param);
		}
		return true;
	}
	/** @param {{buildingName: string, value: string}} intent */
	#handleUpgradeModuleIntent(intent) {
		const buildingName = intent.buildingName;
		const moduleKey = intent.value;
		this[buildingName]?.upgradeModule(moduleKey);
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} upgradeName */
	#handleUpgradeIntent(gameClient, upgradeName) {
		const verb = gameClient.verb;
		if (!this.getEnergy) return;
		if (this.upgradeOffers.length === 0) return verb > 1 ? console.warn(`[${this.id}] No upgrade offers available.`) : null;
		if (this.upgradeOffers[0].indexOf(upgradeName) === -1) return verb > 1 ? console.warn(`[${this.id}] Upgrade not available:`, upgradeName) : null;
		if (UpgradesTool.isMaxedUpgrade(this.upgradeSet, upgradeName)) return verb > 1 ? console.warn(`[${this.id}] Upgrade already maxed:`, upgradeName) : null;
		this.upgradeOffers.shift();
		this.upgradeSet[upgradeName]++;
		Upgrader.applyUpgradeEffects(this, upgradeName);
		return true;
	}
	/** @param {{resourceName: string, amount: number, requestedResourceName: string, requestedAmount: number, targetPlayerId: string}} intent */
	#handleSetPrivateTradeOfferIntent(intent) {
		if (!this.tradeHub) return;
		const { resourceName, amount, requestedResourceName, requestedAmount, targetPlayerId } = intent;
		this.tradeHub.setPrivateTradeOffer(targetPlayerId, resourceName, amount, requestedResourceName, requestedAmount);
	}
	/** @param {{targetPlayerId: string}} intent */
	#handleCancelPrivateTradeOfferIntent(intent) {
		if (!this.tradeHub) return;
		this.tradeHub.cancelPrivateTradeOffer(intent.targetPlayerId);
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {{offererId: string}} intent */
	#handleTakePrivateTradeOfferIntent(gameClient, intent) {
		if (!intent.offererId || typeof intent.offererId !== 'string') return;
		const offerer = gameClient.players[intent.offererId];
		if (!this.tradeHub || !offerer || !offerer.tradeHub) return;

		const offer = offerer.tradeHub.getPrivateTradeOffer(this.id);
		if (!offer) return;

		const { resourceName, amount, requestedResourceName, requestedAmount } = offer || {};
		const selfStock = this.inventory.getAmount(requestedResourceName);
		const offererStock = offerer.inventory.getAmount(resourceName);
		if (offererStock < amount || selfStock < requestedAmount) return; // cannot take private offer if not fully available
		offerer.inventory.subtractAmount(resourceName, amount);
		offerer.inventory.addAmount(requestedResourceName, requestedAmount);
		this.inventory.addAmount(resourceName, amount);
		this.inventory.subtractAmount(requestedResourceName, requestedAmount);
		offerer.tradeHub.cancelPrivateTradeOffer(this.id);
	}
	/** @param {{soldResource: string, soldAmount: number, boughtResource: string, maxPricePerUnit: number, expiry: number}} intent */
	#handleSetTakerOrderIntent(intent) {
		if (!this.tradeHub) return;
		const { soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry } = intent;
		this.tradeHub.setTakerOrder(soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry);
	}
	/** fills: key: playerId, value: [sentResource, minStock, tookResource, price]
	 * @param {{fills: Record<string, [string, number, string, number]>}} intent */
	#handleAuthorizedFillsIntent(intent) {
		if (!this.tradeHub) return;
		this.tradeHub.authorizedFills = intent.fills;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} fromDeadNodeId */
	#handleRecycleIntent(gameClient, fromDeadNodeId) {
		const verb = gameClient.verb;
		const deadPlayer = gameClient.players[fromDeadNodeId];
		if (!deadPlayer) return verb > 1 ? console.warn(`[${this.id}] Cannot recycle unknown node:`, fromDeadNodeId) : null;
		if (deadPlayer.getEnergy) return verb > 1 ? console.warn(`[${this.id}] Cannot recycle alive node:`, fromDeadNodeId) : null;
		if (!deadPlayer.startTurn) return verb > 1 ? console.warn(`[${this.id}] Cannot recycle unknown node:`, fromDeadNodeId) : null;

		const { hasResources, resources } = deadPlayer.inventory.getRecyclingResult(this.upgradeSet.cleaner);
		if (!hasResources) return verb > 2 ? console.warn(`[${this.id}] Cannot recycle empty node:`, fromDeadNodeId) : null;

		for (const r in resources) this.inventory.addAmount(r, resources[r]);
		if (verb > 1) console.log(`[${this.id}] Recycled resources from ${fromDeadNodeId}:`, resources);

		deadPlayer.inventory.empty();
		return true;
	}

	/** @param {import('./game.mjs').GameClient} gameClient @param {string} playerId @param {{ playerData: Object | Array, extractionMode: 'object' | 'array' }} intent */
	#handleNewPlayerIntent(gameClient, playerId, intent) {
		const { verb, node, players } = gameClient;
		if (!node.cryptoCodex.isPublicNode(playerId)) return; // only accept new players from public nodes
		const p = PlayerNode.playerFromData(intent.playerData, intent.extractionMode);
		if (!players[p.id]) { players[p.id] = p; gameClient.playersCount++; }
		if (node.publicUrl) gameClient.syncAskedBy.push(p.id); // send game state at the end of the turn
		if (verb > 2) console.log(`%cImported new player from intent:`, 'color: orange', p.id);
		return true;
	}

	// TURN EXEC => ENERGY & PRODUCTION
	#setEnergyChange(amount = 0) {
		if (!this.turnEnergyChanges) this.turnEnergyChanges = { consumptions: [], productions: [] };
		if (typeof amount !== 'number' && amount === 0) return;
		if (amount < 0) this.turnEnergyChanges.consumptions.push(Math.abs(amount));
		else this.turnEnergyChanges.productions.push(amount);
	}
	#getAndClearTotalTurnEnergyChange() {
		if (!this.turnEnergyChanges) return { totalConso: 0, totalProd: 0 };
		const totalConso = this.turnEnergyChanges.consumptions.reduce((a, b) => a + b, 0);
		const totalProd = this.turnEnergyChanges.productions.reduce((a, b) => a + b, 0);
		this.turnEnergyChanges = null;
		return { totalConso, totalProd };
	}
	#produceRawResources(consumptionBasis = 1) {
		if (!this.getEnergy) return 0;
		let totalConso = 0;
		let totalProd = 0;
		// CALCULATE PRODUCTION WITH UPGRADE MULTIPLIER
		const multiplier = 1 + (this.upgradeSet.producer * .25);
		for (const r in this.production) {
			if (!this.production[r] || !this.rawProductionRate) continue;
			const prod = this.production[r] * multiplier * this.rawProductionRate;
			this.inventory.addAmount(r, prod);
			totalConso -= consumptionBasis * this.rawProductionRate;
			totalProd += prod;
		}

		// ENERGY FROM RAW RESOURCES (if reactor has the synergy module)
		const getEnergyPerRawResource = this.reactor?.getEnergyPerRawResource || 0;
		if (totalProd && getEnergyPerRawResource) this.inventory.addAmount('energy', totalProd * getEnergyPerRawResource);

		return totalConso;
	}
	#applyEnergyChange() {
		const { totalConso, totalProd } = this.#getAndClearTotalTurnEnergyChange();
		this.inventory.addAmount('energy', totalProd - totalConso);
		if (this.inventory.getAmount('energy') > this.maxEnergy) this.inventory.setAmount('energy', this.maxEnergy);
		if (this.inventory.getAmount('energy') < 0) this.inventory.setAmount('energy', 0);
		if (!this.inventory.getAmount('energy')) console.log(`%c[${this.id}] Node has run out of energy!`, 'color: red; font-weight: bold;');
	}
	#addUpgradeOffer(turnHash) {
		if (!this.getEnergy) return;
		if (!Upgrader.shouldUpgrade(this.lifetime)) return;

		const offerSeed = `${this.id}-${turnHash}`;
		const offer = Upgrader.getRandomUpgradeOffer(this, offerSeed);
		this.upgradeOffers.push(offer);
		// console.log(`%c[${this.id}] New upgrade offer: ${offer.join(', ')}`, 'color: green; font-weight: bold;');
	}
}