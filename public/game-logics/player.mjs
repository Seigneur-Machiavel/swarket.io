import { randomOperatingResource, newRawResourcesSet, newResourcesSet } from './resources.mjs';
import { UpgradesTool, UpgradeSet, Upgrader } from './upgrades.mjs';

const upgradeTriggersLifetime = new Set([10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
export class PlayerNode {
	name = 'PlayerName'; id; idHash = 0; verb = 0;
	operatingResource; 	// 'chips' | 'datas' | 'models' | 'engineers' => first assigned
	lifetime = 0;		// in turns
	startTurn = 0;
	energy = 100; 		// in turns
	maxEnergy = 100;	// in turns
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
	execIntent(nodeId, intent) {
		if (intent.type === 'set-param') console.log(`[${nodeId}] Set param:`, intent.param, intent.value);
		else if (intent.type === 'transaction') console.log(`[${nodeId}] Transaction:`, intent.amount, intent.resource, '->', intent.to);
		else if (intent.type === 'upgrade') this.#handleUpgradeIntent(intent.upgradeName);
	}
	#handleUpgradeIntent(upgradeName = '') {
		if (!this.energy) return;
		if (this.upgradeOffers.length === 0) return this.verb > 1 ? console.warn(`[${this.id}] No upgrade offers available.`) : null;
		if (this.upgradeOffers[0].indexOf(upgradeName) === -1) return this.verb > 1 ? console.warn(`[${this.id}] Upgrade not available:`, upgradeName) : null;
		if (UpgradesTool.isMaxedUpgrade(this.upgradeSet, upgradeName)) return this.verb > 1 ? console.warn(`[${this.id}] Upgrade already maxed:`, upgradeName) : null;
		this.upgradeOffers.shift();
		this.upgradeSet[upgradeName].level++;
		Upgrader.applyUpgradeEffects(this, upgradeName);
	}
	execTurn(turnHash = 'toto', height = 0) {
		if (this.startTurn === 0 || !this.energy) return; // inactive
		this.lifetime++;
		const energyReduceBasis = 1 + (Math.floor(this.lifetime / 100) * 0.02); // +2% every 100 turns
		this.#deductEnergy(energyReduceBasis);
		if (!this.energy) this.upgradeOffers = []; // clear offers if dead
		else {
			this.#produceResources();
			this.#addUpgradeOffer(turnHash);
		}
	}
	extract() {
		const sendable = {};
		for (const k in this) sendable[k] = this[k];
		return sendable;
	}

	// PRIVATE
	#produceResources() {
		const multiplier = 1 + (this.upgradeSet.producer.level * 0.4);
		for (const r in this.production) this.resourcesByTier[1][r] += this.production[r] * multiplier;
	}
	#deductEnergy(basis = 1) {
		this.energy -= basis;
		if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
		if (this.energy < 0) this.energy = 0;
	}
	#addUpgradeOffer(turnHash) {
		if (!Upgrader.shouldUpgrade(this.lifetime)) return;

		const offerSeed = `${this.id}-${turnHash}`;
		const offer = Upgrader.getRandomUpgradeOffer(this.upgradeSet, offerSeed);
		this.upgradeOffers.push(offer);
		if (this.verb > 1) console.log(`[${this.id}] New upgrade offer: ${offer.join(', ')}`);
	}
}