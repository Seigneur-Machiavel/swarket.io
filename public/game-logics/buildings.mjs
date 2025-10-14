import { BLUEPRINT } from './resources.mjs';

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
	hasProducedThisTurn = false;
	modulesLevel = {
		efficiency: 0,
		overload: 0,
		synergy: 0,
		stability: 0,
		catalyst: 0,
		burst: 0,
		quantuum: 0
	};

	get energyProd() {
		const productionRate = this.productionRate;
		const { efficiency, overload } = this.modulesLevel;
		const efficiencyCoef = 1 + (efficiency * .2); // +20% per level
		const overloadCoef = 1 + (overload * .5); // +50% per level
		const consoCoef = 1 + (overload * .3); // +30% per level
		const bluePrint = BLUEPRINT.energy();
		for (const r in bluePrint.inputs) // APPLY CONSO COEF
			bluePrint.inputs[r] = bluePrint.inputs[r] * productionRate * consoCoef;

		return {
			conso: bluePrint.inputs,
			energy: bluePrint.output.energy * efficiencyCoef * overloadCoef * productionRate
		};
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
	modulesLevel = {};

	
}