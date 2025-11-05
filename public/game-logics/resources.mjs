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
	catalyst_1: () => ({ inputs: { catalyzers: .1 }, outputs: { outputCoef: 1.2 } }),
	catalyst_2: () => ({ inputs: { catalyzers: .15 }, outputs: { outputCoef: 1.5 } }),
	catalyst_3: () => ({ inputs: { catalyzers: .2 }, outputs: { outputCoef: 1.8 } }),
	catalyst_4: () => ({ inputs: { catalyzers: .3 }, outputs: { outputCoef: 2.1 } }),
	catalyst_5: () => ({ inputs: { catalyzers: .4 }, outputs: { outputCoef: 2.5 } }),
	burst_1: () => ({ inputs: { prototypes: .05 }, outputs: { energy: 20 } }),
	burst_2: () => ({ inputs: { prototypes: .09 }, outputs: { energy: 50 } }),
	burst_3: () => ({ inputs: { prototypes: .16 }, outputs: { energy: 100 } }),
	quantum_1: () => ({ inputs: { energy: 100, aiModules: 1 }, outputs: { energy: 500 } }),

	// FABRICATOR PRODUCTION LINES
	// Tier 2 -- Basic Products
	algorithms: () => ({ inputs: { chips: 15, models: 6 }, outputs: { algorithms: .9 } }),
	datasets: () => ({ inputs: { datas: 50, models: 18 }, outputs: { datasets: 4 } }),
	prototypes: () => ({ inputs: { models: 10, engineers: 2 }, outputs: { prototypes: .75 } }),
	catalyzers: () => ({ inputs: { chips: 30, engineers: 5 }, outputs: { catalyzers: .4 } }),
	// Tier 3 -- Advanced Products
	aiModules: () => ({ inputs: { chips: 20, algorithms: 4, datasets: 10 }, outputs: { aiModules: .85 } }),
	robots: () => ({ inputs: { chips: 50, prototypes: 10, engineers: 4 }, outputs: { robots: .5 } }),
	experts: () => ({ inputs: { datas: 150, datasets: 2, engineers: 5 }, outputs: { experts: .3 } }),
	// Tier 4 -- Composite Products
	aiCores: () => ({ inputs: { aiModules: 5, experts: 2 }, outputs: { aiCores: .8 } }),
	drones: () => ({ inputs: { robots: 4, experts: 1.6 }, outputs: { drones: .35 } }),
	superconductors: () => ({ inputs: { energy: 20, aiModules: 2, robots: 2 }, outputs: { superconductors: .1 } }),
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
	turnChanges = newResourcesArray();	// changes during the current turn
	turnExcess = newResourcesArray(); // discarded resources during the current turn
	resources;
	
	/** @param {Array<number> | undefined} resources */
	constructor(resources) { this.resources = resources || newResourcesArray(); }
	extract() { return this.resources; }
	resetTemporaryTurnData() { // called at the start of each turn
		for (const r in this.turnChanges) this.turnChanges[r] = 0;
		for (const r in this.turnExcess) this.turnExcess[r] = 0;
	}

	/** Get a resource amount from the inventory @param {string} resourceName */
	getAmount(resourceName) {
		return RESOURCE_INDEX[resourceName] === undefined ? 0 : this.resources[RESOURCE_INDEX[resourceName]];
	}
	/** Get the excess amount of a resource generated this turn @param {string} resourceName */
	getTurnExcess(resourceName) {
		return RESOURCE_INDEX[resourceName] === undefined ? 0 : this.turnExcess[RESOURCE_INDEX[resourceName]];
	}
	/** Add a resource amount to the inventory
	 * @param {'energy' | 'chips' | 'datas' | 'models' | 'engineers' | 'algorithms' | 'datasets' | 'prototypes' | 'catalyzers' | 'aiModules' | 'robots' | 'experts' | 'aiCores' | 'drones' | 'superconductors' | 'geniuses' | 'agiCells'} resourceName
	 * @param {number} amount @param {number} [maxAmount] */
	addAmount(resourceName, amount, maxAmount) {
		if (RESOURCE_INDEX[resourceName] === undefined) return;
		const index = RESOURCE_INDEX[resourceName];
		const newAmount = maxAmount ? Math.min(this.resources[index] + amount, maxAmount) : this.resources[index] + amount;
		this.turnChanges[index] += newAmount - this.resources[index];
		this.resources[index] = newAmount;

		const remainAmount = maxAmount ? newAmount - maxAmount : 0;
		if (remainAmount > 0) this.turnExcess[index] += remainAmount;
	}
	/** Subtract a resource amount from the inventory @param {string} resourceName @param {number} amount */
	subtractAmount(resourceName, amount, minAmount = 0) {
		if (RESOURCE_INDEX[resourceName] === undefined) return;
		const index = RESOURCE_INDEX[resourceName];
		const newAmount = Math.max(this.resources[index] - Math.abs(amount), minAmount);
		this.turnChanges[index] -= this.resources[index] - newAmount;
		this.resources[index] = newAmount;
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