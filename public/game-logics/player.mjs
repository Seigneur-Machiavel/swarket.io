import { newRawResourcesSet, newResourcesSet } from './resources.mjs';

const upgradeTriggersLifetime = new Set([10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
export class PlayerNode {
	id;
	lifetime = 0;		// in turns
	startTurn = 0;
	energy = 100; 		// in turns
	maxEnergy = 100;	// in turns
	production;			// raw (tier 1) resources only
	resourcesByTier; 	// all tiers

	/** @param {string} id @param {'chip' | 'data' | 'models' | 'engineers' | undefined} operatingResource Randomly selected if undefined */
	constructor(id, operatingResource) {
		this.id = id;
		this.production = newRawResourcesSet(operatingResource);
		this.resourcesByTier = newResourcesSet();
	}
	
	execTurn(height = 0) {
		if (this.energy <= 0) return; // inactive
		if (this.startTurn === 0) this.startTurn = height - 1;
		this.lifetime++;
		const energyReduceBasis = 1 + (Math.floor(this.lifetime / 100) * 0.02); // +2% every 100 turns
		this.#deductEnergy(energyReduceBasis);
		this.#produceResources();
	}
	get shouldUpgrade() {
		return upgradeTriggersLifetime.has(this.lifetime);
	}
	#produceResources() {
		for (const r in this.production) this.resourcesByTier[1][r] += this.production[r];
	}
	#deductEnergy(basis = 1) {
		this.energy -= basis;
		if (this.energy < 0) this.energy = 0;
		if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
	}
}