import { newRawResourcesSet, newResourcesSet } from './resources.mjs';

export class PlayerNode {
	id;
	energy = 100; 		// in turns
	production;			// raw (tier 1) resources only
	resourcesByTier; 	// all tiers

	/** @param {string} id @param {'chip' | 'data' | 'models' | 'engineers' | undefined} operatingResource Randomly selected if undefined */
	constructor(id, operatingResource) {
		this.id = id;
		this.production = newRawResourcesSet(operatingResource);
		this.resourcesByTier = newResourcesSet();
	}
	
	produceResources() {
		for (const r in this.production) this.resourcesByTier[1][r] += this.production[r];
	}
}