export const RAW_RESOURCES_PROD_BASIS = {
	chips: 5,
	datas: 11,
	models: 3,
	engineers: 1
};
export const RAW_RESOURCES = Object.keys(RAW_RESOURCES_PROD_BASIS);

export function randomOperatingResource() {
	return RAW_RESOURCES[Math.floor(Math.random() * RAW_RESOURCES.length)];
}

/** @param {'chips' | 'datas' | 'models' | 'engineers' | undefined} operatingResource */
export function newRawResourcesSet(operatingResource) {
	const set = { energy: 0, chips: 0, datas: 0, models: 0, engineers: 0 };
	const operating = operatingResource;
	if (operating && RAW_RESOURCES_PROD_BASIS[operating]) set[operating] = RAW_RESOURCES_PROD_BASIS[operating];
	return set;
}

export function newResourcesSet() {
	return {
		1: { energy: 0, chips: 0, datas: 0, models: 0, engineers: 0 },		// raw resources
		2: { algorithms: 0, datasets: 0, prototypes: 0, catalyzers: 0 },	// basic products
		3: { aiModules: 0, robots: 0, experts: 0 },							// advanced products
		4: { aiCores: 0, drones: 0, superconductors: 0 }, 					// composite products
		5: { geniuses: 0, agiCells: 0 }										// ultimate products
	};
}

/** USED FOR TYPE DECLARATION AND RESOURCE_NAME VALIDITY EXPORT */
export class ResourcesProductionType {
	energy = 0;
	chips = 0;
	datas = 0;
	models = 0;
	engineers = 0;
	algorithms = 0;
	datasets = 0;
	prototypes = 0;
	catalyzers = 0;
	aiModules = 0;
	robots = 0;
	experts = 0;
	aiCores = 0;
	drones = 0;
	superconductors = 0;
	geniuses = 0;
	agiCells = 0;
}
export const RESOURCES_NAMES = Object.keys(new ResourcesProductionType());
export const VALID_RESOURCES = new Set(RESOURCES_NAMES);

// BLUEPRINTS
const RAW_PROD = RAW_RESOURCES_PROD_BASIS; // alias
/** @type {Record<string, () => { inputs: Record<string, number>, outputs: Record<string, number> }>} */
export const BLUEPRINT = {
	
	// REACTOR PRODUCTION LINES
	energyFromChipsAndEngineers: () => ({
		inputs: { chips: RAW_PROD.chips, engineers: RAW_PROD.engineers },
		outputs: { energy: 2 }
	}),
	catalyst_1: () => ({ inputs: { energy: 1, catalyzers: 1 }, outputs: { outputCoef: 1.2 } }),
	catalyst_2: () => ({ inputs: { energy: 2, catalyzers: 1.8 }, outputs: { outputCoef: 1.5 } }),
	catalyst_3: () => ({ inputs: { energy: 4, catalyzers: 2.5 }, outputs: { outputCoef: 1.8 } }),
	catalyst_4: () => ({ inputs: { energy: 6, catalyzers: 5 }, outputs: { outputCoef: 2.1 } }),
	catalyst_5: () => ({ inputs: { energy: 10, catalyzers: 10 }, outputs: { outputCoef: 2.5 } }),
	burst_1: () => ({ inputs: { energy: 5, prototypes: 1 }, outputs: { energy: 20 } }),
	burst_2: () => ({ inputs: { energy: 10, prototypes: 2 }, outputs: { energy: 50 } }),
	burst_3: () => ({ inputs: { energy: 30, prototypes: 3 }, outputs: { energy: 100 } }),
	quantum: () => ({ inputs: { energy: 100, aiModules: 1 }, outputs: { energy: 500 } }),

	// FABRICATOR PRODUCTION LINES
	// Tier 2 -- Basic Products
	algorithms: () => ({ inputs: { chips: 15, models: 6 }, outputs: { algorithms: .9 } }),
	datasets: () => ({ inputs: { datas: 100, models: 18 }, outputs: { datasets: 1.2 } }),
	prototypes: () => ({ inputs: { datas: 20, models: 10, engineers: 2 }, outputs: { prototypes: .75 } }),
	catalyzers: () => ({ inputs: { chips: 30, engineers: 5 }, outputs: { catalyzers: .4 } }),
	// Tier 3 -- Advanced Products
	aiModules: () => ({ inputs: { chips: 220, algorithms: 4, datasets: 10 }, outputs: { aiModules: .85 } }),
	robots: () => ({ inputs: { chips: 500, prototypes: 10, engineers: 4 }, outputs: { robots: .5 } }),
	experts: () => ({ inputs: { datas: 1500, datasets: 2, engineers: 5 }, outputs: { experts: .3 } }),
	// Tier 4 -- Composite Products
	aiCores: () => ({ inputs: { chips: 500, aiModules: 5, experts: 2 }, outputs: { aiCores: .8 } }),
	drones: () => ({ inputs: { datas: 5000, robots: 4, experts: 1 }, outputs: { drones: .35 } }),
	superconductors: () => ({ inputs: { models: 1000, aiModules: 2, robots: 2 }, outputs: { superconductors: .1 } }),
	// Tier 5 -- Ultimate Products
	geniuses: () => ({ inputs: { experts: 4, aiCores: 2 }, outputs: { geniuses: .05 } }),
	agiCells: () => ({ inputs: { drones: 3, superconductors: 3, geniuses: 3 }, outputs: { agiCells: .25 } })
}

// INVENTORY
const RESOURCE_INDEX = {};
((() => { let index = 0; const rSet = newResourcesSet();
for (const tier in rSet) for (const res in rSet[tier]) RESOURCE_INDEX[res] = index++; })());
function newResourcesArray() {
	const r = [];
	const rSet = newResourcesSet();
	for (const tier in rSet)
		for (const res in rSet[tier]) r.push(0);
	return r;
}
export class Inventory {
	resources;
	
	/** @param {Array<number> | undefined} resources */
	constructor(resources) { this.resources = resources || newResourcesArray(); }
	extract() { return this.resources; }

	/** Get a resource amount from the inventory @param {string} resourceName */
	getAmount(resourceName) {
		return RESOURCE_INDEX[resourceName] === undefined ? 0 : this.resources[RESOURCE_INDEX[resourceName]];
	}
	/** Set a resource amount in the inventory @param {string} resourceName @param {number} amount */
	setAmount(resourceName, amount) {
		if (RESOURCE_INDEX[resourceName] === undefined) return;
		this.resources[RESOURCE_INDEX[resourceName]] = amount;
	}
	/** Add a resource amount to the inventory
	 * @param {'energy' | 'chips' | 'datas' | 'models' | 'engineers' | 'algorithms' | 'datasets' | 'prototypes' | 'catalyzers' | 'aiModules' | 'robots' | 'experts' | 'aiCores' | 'drones' | 'superconductors' | 'geniuses' | 'agiCells'} resourceName
	 * @param {number} amount */
	addAmount(resourceName, amount) {
		if (RESOURCE_INDEX[resourceName] === undefined) return;
		this.resources[RESOURCE_INDEX[resourceName]] += amount;
	}
	/** Subtract a resource amount from the inventory @param {string} resourceName @param {number} amount */
	subtractAmount(resourceName, amount) {
		if (RESOURCE_INDEX[resourceName] === undefined) return;
		this.resources[RESOURCE_INDEX[resourceName]] -= amount;
	}

	// END OF LIFE
	getRecyclingResult(cleanerLevel = 0) {
		const efficiency = .25 + (cleanerLevel * .1); // 25% to 75%
		const resources = newRawResourcesSet();
		let hasResources = false;
		for (const r in resources) {
			resources[r] = this.getAmount(r) * efficiency;
			if (resources[r] > 0) hasResources = true;
		}
		return { hasResources, resources };
	}
	empty() {
		this.resources = newResourcesArray();
	}
}

/** LEXICON
Tier 2 -- Basic Products
algorithms	=>	chips + models						=> ingredient
datasets	=>	datas + models						=> ingredient
prototypes	=>	chips + datas + models + engineers	=> ingredient + fabricator booster
catalyzers	=>	chips + engineers					=> ingredient + reactor booster

Tier 3 -- Advanced Products
aiModules	=>	chips + algorithms + datasets		=> ingredient + fabricator booster
robots		=>	chips + prototypes + engineers		=> ingredient + reactor booster
experts		=>	datas + datasets + engineers		=> ingredient + tradeHub booster

Tier 4 -- Composite Products
aiCores		=>	chips + aiModules + experts			=> ingredient + fabricator booster
drones		=>	datas + robots + experts			=> ingredient + tradeHub booster
superconductors => models + aiModules + robots => ingredient

Tier 5 -- Ultimate Products
geniuses	=>	datas + experts + aiCores		=> ingredient
agiCells
	inputs  =>	chips + algorithms + datasets + prototypes + catalyzers + geniuses
	used as => fabricator/reactor/tradeHub booster + persistent storage->starting bonuses
*/