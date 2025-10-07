/*const resourcesByTiers = { // TEMPLATE
	1: { chips: 0, datas: 0, models: 0, engineers: 0 }, 			// raw materials
	2: { algorithms: 0, datasets: 0, prototypes: 0 }, 				// basic products
	3: { aiModules: 0, trainingJobs: 0, renderJobs: 0, robots: 0 }, // advanced products
	4: { aiInstances: 0, services: 0, factories: 0, drones: 0 }, 	// complex products
	5: { agiCells: 0 } 												// ultimate products
}*/

const rawResourcesProductionBasis = {
	chips: 5,
	datas: 11,
	models: 3,
	engineers: 1
};
const rawResources = Object.keys(rawResourcesProductionBasis);

export function randomOperatingResource() {
	return rawResources[Math.floor(Math.random() * rawResources.length)];
}

/** @param {'chips' | 'datas' | 'models' | 'engineers'} operatingResource */
export function newRawResourcesSet(operatingResource) {
	const set = { chips: 0, datas: 0, models: 0, engineers: 0 };
	const operating = operatingResource;
	set[operating] = rawResourcesProductionBasis[operating];
	return set;
}

export function newResourcesSet() {
	return {
		1: { chips: 0, datas: 0, models: 0, engineers: 0 },
		2: { algorithms: 0, datasets: 0, prototypes: 0 },
		3: { aiModules: 0, trainingJobs: 0, renderJobs: 0, robots: 0 },
		4: { aiInstances: 0, services: 0, factories: 0, drones: 0 },
		5: { agiCells: 0 }
	};
}