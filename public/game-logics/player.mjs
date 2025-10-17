import { randomOperatingResource, newRawResourcesSet, Inventory } from './resources.mjs';
import { UpgradesTool, UpgradeSet, Upgrader } from './upgrades.mjs';
import { BuildingBuilder, Building, Reactor, Fabricator, Linker } from './buildings.mjs';

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

	// BUILDINGS ------------------------------------------------------------------\
	/** @type {Reactor | null} */ 		reactor = null;		// reactor building		|
	/** @type {Fabricator | null} */ 	fabricator = null; 	// fabricator building	|
	/** @type {Linker | null} */		linker = null;		// linker building		|
	/** @returns {number} */ //														|
	get getMaxConnections() { return this.linker?.maxConnections() || 0; } //		|
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
	}
	
	static playerFromData(data) {
		const p = new PlayerNode(data.id);
		for (const k in data)
			if (k === 'inventory') p.inventory = new Inventory(data[k]);
			else if (k === 'reactor') p.reactor = BuildingBuilder.rebuildClasseIfItCanBe(data[k], k);
			else if (k === 'fabricator') p.fabricator = BuildingBuilder.rebuildClasseIfItCanBe(data[k], k);
			else if (k === 'linker') p.linker = BuildingBuilder.rebuildClasseIfItCanBe(data[k], k);
			else p[k] = data[k];
		return p;
	}
	extract() {
		const sendable = {};
		for (const k in this) sendable[k] = this[k]?.extract ? this[k].extract() : this[k];
		return sendable;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} nodeId @param {{type: string}} intent */
	execIntent(gameClient, nodeId, intent) {
		if (intent.type === 'set-param') return this.#handleSetParamIntent(intent);
		else if (intent.type === 'transaction') console.log(`[${nodeId}] Transaction:`, intent.amount, intent.resource, '->', intent.to);
		else if (intent.type === 'upgrade') return this.#handleUpgradeIntent(gameClient, intent.upgradeName);
		else if (intent.type === 'upgrade-module') return this.#handleUpgradeModuleIntent(intent);
		else if (intent.type === 'recycle') return this.#handleRecycleIntent(gameClient, intent.fromDeadNodeId);
	}
	execTurn(turnHash = 'toto', height = 0) {
		if (!this.startTurn || !this.getEnergy) return; // inactive
		this.lifetime++;
		//console.log(`[${this.id}] lifetimme:`, this.lifetime);
		const entropy = Math.floor(this.lifetime / 60) * 0.02; // +2% every 60 turns
		const basis = .5 * (1 + entropy); 	// base consumption
		this.#setEnergyChange(-basis);		// maintenance consumption
		this.#setEnergyChange(this.#produceRawResources(basis));
		this.#setEnergyChange(this.reactor?.consumeResourcesAndGetProduction(this).energy);
		this.#applyEnergyChange();
		//TODO: linker energy consumption
		//TODO: fabricator production & consumption
		this.#addUpgradeOffer(turnHash);

		if (!this.getEnergy) this.upgradeOffers = []; // clear offers if dead
	}

	// PRIVATE
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
		const multiplier = 1 + (this.upgradeSet.producer * .25);
		for (const r in this.production) {
			const prod = this.production[r] * multiplier * this.rawProductionRate;
			this.inventory.addAmount(r, prod);
			if (prod) totalConso -= consumptionBasis * this.rawProductionRate;
		}
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