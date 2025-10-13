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

export class Reactor {
	/** @type {0 | .25 | .5 | .75 | 1} */
	productionRate = 1;
	productionBasis = 2; // energy per turn
	level = 1;
	inputs = { chips: 0, engineers: 0 };
	modules = {
		overload: { level: 0, maxLevel: 5 }, 	// +50% production rate
		stability: { level: 0, maxLevel: 5 } 	// -50% breakdown risk
	};

	constructor() {
		this.inputs.chips = Math.ceil(RAW_RESOURCES_PROD_BASIS.chips);
		this.inputs.engineers = Math.ceil(RAW_RESOURCES_PROD_BASIS.engineers);
	};

	get energyProd() {
		const productionRate = this.productionRate;
		const overloadBonus = 1 + (this.modules.overload.level * .5); // +50% per level
		const conso = {
			chips: (this.inputs.chips || 0) * productionRate,
			engineers: (this.inputs.engineers || 0) * productionRate
		};

		return { conso, energy: this.productionBasis * overloadBonus * productionRate };
	}
	/** @param {import('./player.mjs').PlayerNode} player */
	consumeResourcesAndGetProduction(player) {
		if (!player.energy) return 0;
		const { conso, energy } = this.energyProd;
		if (player.rawResources.chips < conso.chips) return 0;
		if (player.rawResources.engineers < conso.engineers) return 0;
		player.rawResources.chips -= conso.chips;
		player.rawResources.engineers -= conso.engineers;
		return energy;
	}
}

export class Fabricator {
	level = 1;

}

export class Linker {
	level = 1;
}