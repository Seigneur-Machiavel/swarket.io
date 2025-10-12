import { randomOperatingResource, newRawResourcesSet, newResourcesSet } from './resources.mjs';
import { UpgradesTool, UpgradeSet, Upgrader } from './upgrades.mjs';

export class PlayerNode {
	name = 'PlayerName'; id;
	operatingResource; 	// 'chips' | 'datas' | 'models' | 'engineers' => first assigned
	lifetime = 0;		// in turns
	startTurn = 0;
	energy = 60; 		// in turns
	maxEnergy = 60;		// in turns
	production;			// raw (tier 1) resources only
	resourcesByTier; 	// all tiers
	upgradeSet;			// current upgrade set
	upgradeOffers = []; // current upgrade offers

	/** @param {string} id @param {'chip' | 'data' | 'models' | 'engineers' | undefined} operatingResource Randomly selected if undefined */
	constructor(id, operatingResource, upgradeSet = new UpgradeSet()) {
		this.id = id;
		this.operatingResource = operatingResource || randomOperatingResource();
		this.production = newRawResourcesSet(this.operatingResource);
		this.resourcesByTier = newResourcesSet();
		this.upgradeSet = upgradeSet;
	}
	
	static playerFromData(data) {
		const p = new PlayerNode(data.id);
		for (const k in data) p[k] = data[k];
		return p;
	}
	extract() {
		const sendable = {};
		for (const k in this) sendable[k] = this[k];
		return sendable;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} nodeId @param {{type: string}} intent */
	execIntent(gameClient, nodeId, intent) {
		if (intent.type === 'set-param') console.log(`[${nodeId}] Set param:`, intent.param, intent.value);
		else if (intent.type === 'transaction') console.log(`[${nodeId}] Transaction:`, intent.amount, intent.resource, '->', intent.to);
		else if (intent.type === 'upgrade') return this.#handleUpgradeIntent(gameClient, intent.upgradeName);
		else if (intent.type === 'recycle') return this.#handleRecycleIntent(gameClient, intent.fromDeadNodeId);
	}
	execTurn(turnHash = 'toto', height = 0) {
		if (!this.startTurn || !this.energy) return; // inactive
		this.lifetime++;
		const energyReduceBasis = 1 + (Math.floor(this.lifetime / 100) * 0.02); // +2% every 100 turns
		this.#deductEnergy(energyReduceBasis);
		if (!this.energy) this.upgradeOffers = []; // clear offers if dead
		else {
			this.#produceResources();
			this.#addUpgradeOffer(turnHash);
		}
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
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} upgradeName */
	#handleUpgradeIntent(gameClient, upgradeName) {
		const verb = gameClient.verb;
		if (!this.energy) return;
		if (this.upgradeOffers.length === 0) return verb > 1 ? console.warn(`[${this.id}] No upgrade offers available.`) : null;
		if (this.upgradeOffers[0].indexOf(upgradeName) === -1) return verb > 1 ? console.warn(`[${this.id}] Upgrade not available:`, upgradeName) : null;
		if (UpgradesTool.isMaxedUpgrade(this.upgradeSet, upgradeName)) return verb > 1 ? console.warn(`[${this.id}] Upgrade already maxed:`, upgradeName) : null;
		this.upgradeOffers.shift();
		this.upgradeSet[upgradeName].level++;
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

		const { hasResources, resources } = deadPlayer.getRecyclingResult(this.upgradeSet.cleaner.level);
		if (!hasResources) return verb > 1 ? console.warn(`[${this.id}] Cannot recycle empty node:`, fromDeadNodeId) : null;

		for (const r in resources) this.resourcesByTier['1'][r] += resources[r];
		if (verb > 1) console.log(`[${this.id}] Recycled resources from ${fromDeadNodeId}:`, resources);

		deadPlayer.resourcesByTier = newResourcesSet();
		return true;
	}
	#produceResources() {
		const multiplier = 1 + (this.upgradeSet.producer.level * 0.4);
		for (const r in this.production) this.resourcesByTier[1][r] += this.production[r] * multiplier;
	}
	#deductEnergy(basis = 1) {
		this.energy -= basis;
		if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
		if (this.energy < 0) this.energy = 0;
		if (!this.energy) console.log(`%c[${this.id}] Node has run out of energy!`, 'color: red; font-weight: bold;');
	}
	#addUpgradeOffer(turnHash) {
		if (!Upgrader.shouldUpgrade(this.lifetime)) return;

		const offerSeed = `${this.id}-${turnHash}`;
		const offer = Upgrader.getRandomUpgradeOffer(this.upgradeSet, offerSeed);
		this.upgradeOffers.push(offer);
		// console.log(`%c[${this.id}] New upgrade offer: ${offer.join(', ')}`, 'color: green; font-weight: bold;');
	}
}