import { RAW_RESOURCES_PROD_BASIS } from './resources.mjs';

export class BuildingBuilder {
	/** @type {'reactor' | 'fabricator' | 'linker' | null} */
	thisSubClasseName = null;

	/** @param {Reactor} data @param {'reactor' | 'fabricator' | 'linker'} subClassName */
	static rebuildClasseIfItCanBe(data, subClassName) {
		let r;
		if (subClassName === 'reactor') r = new Reactor();
		else if (subClassName === 'fabricator') r = new Fabricator();
		else if (subClassName === 'linker') r = new Linker();
		else return null;
		for (const k in data) r[k] = data[k];
		return r;
	}
}

const productionsBasisByBuilding = {
	reactor: { energy: 2 },
	fabricator: {
		2: { algorithms: 0, datasets: 0, prototypes: 0 },
		3: { aiModules: 0, trainingJobs: 0, renderJobs: 0, robots: 0 },
		4: { aiInstances: 0, services: 0, factories: 0, drones: 0 },
		5: { agiCells: 0 }
	}
};

export class Reactor {
	/** @type {0 | .25 | .5 | .75 | 1} */
	productionRate = 1;
	hasProducedThisTurn = false;
	inputs = { chips: 0, engineers: 0 };
	modules = {
		efficiency: { level: 0, maxLevel: 5, tooltip: 'Increases production rate by 20%' },
		overload: { level: 0, maxLevel: 5, tooltip: 'Increases production rate by 50% and resources consumption by 30%' },
		stability: { level: 0, maxLevel: 5, tooltip: 'Decreases breakdown risk by 50%' }
	};

	constructor() {
		this.inputs.chips = Math.ceil(RAW_RESOURCES_PROD_BASIS.chips);
		this.inputs.engineers = Math.ceil(RAW_RESOURCES_PROD_BASIS.engineers);
	};

	get energyProd() {
		const productionRate = this.productionRate;
		const efficiencyCoef = 1 + (this.modules.efficiency.level * .2); // +20% per level
		const overloadCoef = 1 + (this.modules.overload.level * .5); // +50% per level
		const consoCoef = 1 + (this.modules.overload.level * .3); // +30% per level
		const conso = {
			chips: (this.inputs.chips || 0) * productionRate * consoCoef,
			engineers: (this.inputs.engineers || 0) * productionRate * consoCoef
		};

		const prodBasis = productionsBasisByBuilding.reactor.energy;
		return { conso, energy: prodBasis * efficiencyCoef * overloadCoef * productionRate };
	}

	/** @param {import('./player.mjs').PlayerNode} player */
	consumeResourcesAndGetProduction(player) {
		this.hasProducedThisTurn = false;
		if (!player.energy) return 0;
		const { conso, energy } = this.energyProd;
		if (!energy) return 0;
		if (player.rawResources.chips < conso.chips) return 0;
		if (player.rawResources.engineers < conso.engineers) return 0;
		player.rawResources.chips -= conso.chips;
		player.rawResources.engineers -= conso.engineers;
		this.hasProducedThisTurn = true;
		return energy;
	}
}

export class Fabricator {

}

export class Linker {
	maxConnections = 2;
	modules = {
	}
}