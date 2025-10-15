import { BLUEPRINT, ResourcesProductionType } from './resources.mjs';

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
	/** @type {Array<0 | .25 | .5 | .75 | 1>} */
	productionRates = [1];
	activeProductionLines = ['energyFromChipsAndEngineers'];
	linesWhoProducedThisTurn = [];
	modulesLevel = {
		efficiency: 0,
		overload: 0,
		synergy: 0,
		stability: 0,
		catalyst: 0,
		burst: 0,
		quantuum: 0
	};

	getProductionLineEffect(lineName = 'energyFromChipsAndEngineers') { // TODO: MAKE A LOOP WITH ALL PRODUCTION LINES
		const lineIndex = this.activeProductionLines.indexOf(lineName);
		if (lineIndex === -1) return { inputs: {}, outputs: {} };

		const productionRate = this.productionRates[lineIndex] || 0;
		if (productionRate === 0) return { inputs: {}, outputs: {} };

		const { efficiency, overload } = this.modulesLevel;
		const efficiencyCoef = 1 + (efficiency * .2); // +20% per level
		const overloadCoef = 1 + (overload * .5); // +50% per level
		const consoCoef = 1 + (overload * .3); // +30% per level

		const bluePrint = BLUEPRINT[lineName]();
		const { inputs, outputs } = bluePrint;
		for (const r in bluePrint.inputs) // APPLY CONSO COEF
			inputs[r] = inputs[r] * productionRate * consoCoef;

		for (const r in outputs) // APPLY EFFICIENCY/OVERLOAD COEF
			outputs[r] = outputs[r] * efficiencyCoef * overloadCoef * productionRate;

		return { inputs, outputs };
	}
	/** @param {import('./player.mjs').PlayerNode} player @returns {ResourcesProductionType} */
	consumeResourcesAndGetProduction(player) {
		this.linesWhoProducedThisTurn = [];
		if (!player.energy) return {};
		const production = {}; 	// ResourcesProductionType
		for (const lineKey of this.activeProductionLines) {
			const { inputs, outputs } = this.getProductionLineEffect(lineKey);
			for (const r in inputs) // CHECK IF PLAYER HAS ENOUGH RESOURCES FOR THE LINE
				if ((player.rawResources[r] || 0) < inputs[r]) continue;

			// IF SO, APPLY CONSUMATION & FILL PRODUCTION
			for (const r in inputs) player.rawResources[r] -= inputs[r];
			for (const r in outputs) production[r] = (production[r] || 0) + outputs[r];
			this.linesWhoProducedThisTurn.push(lineKey);
		}

		return production;
	}
}

export class Fabricator {


}

export class Linker {
	maxConnections = 2;
	modulesLevel = {};

	
}