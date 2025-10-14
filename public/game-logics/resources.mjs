export const RAW_RESOURCES_PROD_BASIS = {
	chips: 5,
	datas: 11,
	models: 3,
	engineers: 1
};
const rawResources = Object.keys(RAW_RESOURCES_PROD_BASIS);

export function randomOperatingResource() {
	return rawResources[Math.floor(Math.random() * rawResources.length)];
}

/** @param {'chips' | 'datas' | 'models' | 'engineers' | undefined} operatingResource */
export function newRawResourcesSet(operatingResource) {
	const set = { chips: 0, datas: 0, models: 0, engineers: 0 };
	const operating = operatingResource;
	if (operating && RAW_RESOURCES_PROD_BASIS[operating]) set[operating] = RAW_RESOURCES_PROD_BASIS[operating];
	return set;
}

export function newResourcesSet() {
	return {
		1: { chips: 0, datas: 0, models: 0, engineers: 0 },
		2: { algorithms: 0, datasets: 0, prototypes: 0, catalyzers: 0 },
		3: { aiModules: 0, renderJobs: 0, robots: 0, experts: 0 },
		4: { aiCores: 0, drones: 0, superconductors: 0 },
		5: { geniuses: 0, agiCells: 0}
	};
}

const RAW_PROD = RAW_RESOURCES_PROD_BASIS; // alias
export class BLUEPRINT {
	static energy = () => ({
		inputs: { chips: RAW_PROD.chips, engineers: RAW_PROD.engineers },
		output: { energy: 2 }
	});

	// Tier 2 -- Basic Products
	static algorithms = () => ({ inputs: { chips: 15, models: 6 }, outputQty: .9 });
	static datasets = () => ({ inputs: { datas: 100, models: 18 }, outputQty: 1.2 });
	static prototypes = () => ({ inputs: { chips: 10, datas: 20, models: 10, engineers: 2 }, outputQty: .75 });
	static catalyzers = () => ({ inputs: { chips: 30, engineers: 5 }, outputQty: .4 });
	// Tier 3 -- Advanced Products
	static aiModules = () => ({ inputs: { chips: 220, algorithms: 4, datasets: 10 }, outputQty: .85 });
	static robots = () => ({ inputs: { chips: 500, models: 10, engineers: 4 }, outputQty: .5 });
	static experts = () => ({ inputs: { datas: 1500, models: 15, engineers: 6 }, outputQty: .3 });
	// Tier 4 -- Complex Products
	static aiCores = () => ({ inputs: { chips: 500, aiModules: 5, experts: 2 }, outputQty: .8 });
	static drones = () => ({ inputs: { datas: 5000, robots: 4, experts: 1 }, outputQty: .35 });
	static superconductors = () => ({ inputs: { models: 1000, aiModules: 2, robots: 2 }, outputQty: .1 });
	// Tier 5 -- Ultimate Products
	static geniuses = () => ({ inputs: { datas: 10000, experts: 4, aiCores: 2 }, outputQty: .05 });
	static agiCells = () => ({ inputs: { chips: 1000, algorithms: 10, datasets: 10, prototypes: 5, catalyzers: 5, geniuses: 3 }, outputQty: .25 });
}

/** LEXICON
Tier 2 -- Basic Products
algorithms	=>	chips + models						=> ingredient
datasets	=>	datas + models						=> ingredient
prototypes	=>	chips + datas + models + engineers	=> ingredient + fabricator booster
catalyzers	=>	chips + engineers					=> ingredient + reactor booster

Tier 3 -- Advanced Products
aiModules	=>	chips + algorithms + datasets		=> ingredient + fabricator booster
robots		=>	chips + models + engineers			=> ingredient + reactor booster
experts		=>	datas + models + engineers			=> ingredient + linker booster

Tier 4 -- Complex Products
aiCores	=>	chips + aiModules + experts			=> ingredient + fabricator booster
drones		=>	datas + robots + experts			=> ingredient + linker booster
superconductors => models + aiModules + robots => ingredient

Tier 5 -- Ultimate Products
geniuses	=>	datas + experts + aiCores		=> ingredient
agiCells
	inputs  =>	chips + algorithms + datasets + prototypes + catalyzers + geniuses
	used as => fabricator/reactor/linker booster + persistent storage->starting bonuses
*/