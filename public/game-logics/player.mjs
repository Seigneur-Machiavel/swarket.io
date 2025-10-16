import { randomOperatingResource, newRawResourcesSet, newResourcesSet } from './resources.mjs';
import { UpgradesTool, UpgradeSet, Upgrader } from './upgrades.mjs';
import { BuildingBuilder, Building, Reactor, Fabricator, Linker } from './buildings.mjs';

export class PlayerNode {
	name = 'PlayerName'; id;
	operatingResource; 	// 'chips' | 'datas' | 'models' | 'engineers' => first assigned
	lifetime = 0;		// in turns
	startTurn = 0;
	energy = 100; 		// in turns
	maxEnergy = 100;	// in turns

	production;			// raw (tier 1) resources only
	rawProductionRate = 1; // 0 | .25 | .5 | .75 | 1
	turnEnergyChanges = { consumptions: [], productions: [] }; // filled only during turn exec

	resourcesByTier; 	// all tiers
	get rawResources() { return this.resourcesByTier['1']; }
	upgradeSet;			// current upgrade set
	upgradeOffers = []; // upgrade offers

	// BUILDINGS ------------------------------------------------------------------\
	/** @type {Reactor | null} */ 		reactor = null;		// reactor building		|
	/** @type {Fabricator | null} */ 	fabricator = null; 	// fabricator building	|
	/** @type {Linker | null} */		linker = null;		// linker building		|
	get maxConnections() { return this.linker?.maxConnections || 0; } //			|
	// ----------------------------------------------------------------------------/

	/** @param {string} id @param {'chip' | 'data' | 'models' | 'engineers' | undefined} operatingResource Randomly selected if undefined */
	constructor(id, operatingResource, upgradeSet = new UpgradeSet()) {
		this.id = id;
		this.operatingResource = operatingResource || randomOperatingResource();
		this.production = newRawResourcesSet(this.operatingResource);
		this.resourcesByTier = newResourcesSet();
		this.upgradeSet = upgradeSet;

		this.reactor = new Reactor(); // DEBUG
		this.upgradeSet.buildReactor = 1; // DEBUG bypass
		this.fabricator = new Fabricator(); // DEBUG
		this.upgradeSet.buildFabricator = 1; // DEBUG bypass
	}
	
	static playerFromData(data) {
		const p = new PlayerNode(data.id);
		for (const k in data)
			if (!data[k] || !['reactor', 'fabricator', 'linker'].includes(k)) p[k] = data[k];
			else p[k] = BuildingBuilder.rebuildClasseIfItCanBe(data[k], k);
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
		else if (intent.type === 'recycle') return this.#handleRecycleIntent(gameClient, intent.fromDeadNodeId);
	}
	execTurn(turnHash = 'toto', height = 0) {
		if (!this.startTurn || !this.energy) return; // inactive
		this.lifetime++;
		//const consumptionBasis = 1 + (Math.floor(this.lifetime / 60) * 0.02); // +2% every 60 turns
		const entropy = Math.floor(this.lifetime / 60) * 0.02; // +2% every 60 turns
		const basis = .5 * (1 + entropy); 	// base consumption
		this.#setEnergyChange(-basis);		// maintenance consumption
		this.#setEnergyChange(this.#produceRawResources(basis));
		this.#setEnergyChange(this.reactor?.consumeResourcesAndGetProduction(this).energy);
		this.#applyEnergyChange();
		//TODO: linker energy consumption
		//TODO: fabricator production & consumption
		this.#addUpgradeOffer(turnHash);

		if (!this.energy) this.upgradeOffers = []; // clear offers if dead
	}
	getRecyclingResult(cleanerLevel = 0) {
		const efficiency = .25 + (cleanerLevel * .1); // 25% to 75%
		const resources = newRawResourcesSet();
		let hasResources = false;
		for (const r in this.resourcesByTier['1']) { // only tier 1 resources
			if (this.resourcesByTier['1'][r] <= 0) continue;
			hasResources = true;
			resources[r] = this.resourcesByTier['1'][r] * efficiency;
		}
		return { hasResources, resources };
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
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} upgradeName */
	#handleUpgradeIntent(gameClient, upgradeName) {
		const verb = gameClient.verb;
		if (!this.energy) return;
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
		if (deadPlayer.energy) return verb > 1 ? console.warn(`[${this.id}] Cannot recycle alive node:`, fromDeadNodeId) : null;
		if (!deadPlayer.startTurn) return verb > 1 ? console.warn(`[${this.id}] Cannot recycle unknown node:`, fromDeadNodeId) : null;

		const { hasResources, resources } = deadPlayer.getRecyclingResult(this.upgradeSet.cleaner);
		if (!hasResources) return verb > 2 ? console.warn(`[${this.id}] Cannot recycle empty node:`, fromDeadNodeId) : null;

		for (const r in resources) this.resourcesByTier['1'][r] += resources[r];
		if (verb > 1) console.log(`[${this.id}] Recycled resources from ${fromDeadNodeId}:`, resources);

		deadPlayer.resourcesByTier = newResourcesSet();
		return true;
	}

	// TURN EXEC => ENERGY & PRODUCTION
	#setEnergyChange(amount = 0) {
		if (!this.turnEnergyChanges) this.turnEnergyChanges = { consumptions: [], productions: [] };
		if (typeof amount !== 'number' && amount === 0) return;
		if (amount < 0) this.turnEnergyChanges.consumptions.push(Math.abs(amount));
		else this.turnEnergyChanges.productions.push(amount);
	}
	get #getAndClearTotalTurnEnergyChange() {
		if (!this.turnEnergyChanges) return { totalConso: 0, totalProd: 0 };
		const totalConso = this.turnEnergyChanges.consumptions.reduce((a, b) => a + b, 0);
		const totalProd = this.turnEnergyChanges.productions.reduce((a, b) => a + b, 0);
		this.turnEnergyChanges = null;
		return { totalConso, totalProd };
	}
	#produceRawResources(consumptionBasis = 1) {
		if (!this.energy) return 0;
		let totalConso = 0;
		const multiplier = 1 + (this.upgradeSet.producer * .25);
		for (const r in this.production) {
			const prod = this.production[r] * multiplier * this.rawProductionRate;
			this.resourcesByTier[1][r] += prod;
			if (prod) totalConso -= consumptionBasis * this.rawProductionRate;
		}
		return totalConso;
	}
	#applyEnergyChange() {
		const { totalConso, totalProd } = this.#getAndClearTotalTurnEnergyChange;
		this.energy += totalProd - totalConso;
		if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
		if (this.energy < 0) this.energy = 0;
		if (!this.energy) console.log(`%c[${this.id}] Node has run out of energy!`, 'color: red; font-weight: bold;');
	}
	#addUpgradeOffer(turnHash) {
		if (!this.energy) return;
		if (!Upgrader.shouldUpgrade(this.lifetime)) return;

		const offerSeed = `${this.id}-${turnHash}`;
		const offer = Upgrader.getRandomUpgradeOffer(this, offerSeed);
		this.upgradeOffers.push(offer);
		// console.log(`%c[${this.id}] New upgrade offer: ${offer.join(', ')}`, 'color: green; font-weight: bold;');
	}
}