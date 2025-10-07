import { randomOperatingResource, newRawResourcesSet, newResourcesSet } from './resources.mjs';
import { UpgradeSet, Upgrader } from './upgrades.mjs';

const upgradeTriggersLifetime = new Set([10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
export class PlayerNode {
	id; idHash = 0; verb = 0;
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
	execTurn(turnHash = 'toto', height = 0) {
		if (this.startTurn === 0 || this.energy <= 0) return; // inactive
		this.lifetime++;
		const energyReduceBasis = 1 + (Math.floor(this.lifetime / 100) * 0.02); // +2% every 100 turns
		this.#deductEnergy(energyReduceBasis);
		this.#produceResources();
		this.#addUpgradeOffer(turnHash);
	}
	extract() {
		const sendable = {};
		for (const k in this) sendable[k] = this[k];
		return sendable;
	}

	// PRIVATE
	#produceResources() {
		for (const r in this.production) this.resourcesByTier[1][r] += this.production[r];
	}
	#deductEnergy(basis = 1) {
		this.energy -= basis;
		if (this.energy < 0) this.energy = 0;
		if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
	}
	#addUpgradeOffer(turnHash) {
		if (!Upgrader.shouldUpgrade(this.lifetime)) return;

		const offerSeed = `${this.id}-${turnHash}`;
		const offer = Upgrader.getRandomUpgradeOffer(this.upgradeSet, offerSeed);
		this.upgradeOffers.push(offer);
		if (this.verb > 1) console.log(`[${this.id}] New upgrade offer: ${offer.join(', ')}`);
	}
}