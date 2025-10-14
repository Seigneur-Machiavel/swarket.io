

/** @param {import('./player.mjs').PlayerNode} player */
export function getModulesDescriptionRelativeToPlayer(player) {
	if (!player.reactor) return null;
	/** @type {Record<string, { minReactorLevel: number, currentLevel: number, description: string }>} */
	const modulesInfos = {};
	for (const m in REACTOR_MODULES) {
		const currentLevel = player.reactor.modulesLevel[m] || 0;
		const { minReactorLevel } = REACTOR_MODULES[m];
		if (!modulesInfos[minReactorLevel]) modulesInfos[minReactorLevel] = {};
		const { description } = REACTOR_MODULES[m].levelEffect[currentLevel] || 'Max level reached';
		modulesInfos[minReactorLevel][m] = { currentLevel, description };
	}
	return modulesInfos;
}

/** @param {number} reactorLevel @param {string} moduleKey */
export function getModuleMaxLevel(reactorLevel, moduleKey) {
	console.log('getModuleMaxLevel', reactorLevel, moduleKey);
}

/**
 * @typedef {{description: string, outputCoef?: number, consoCoef?: number, breakdownRiskCoef?: number, energyPerRawResource?: number, energyQty?: number}} LevelEffect
 */
/** @type {Record<string, { minReactorLevel: number, levelEffect: Array<LevelEffect> }>} */
export class REACTOR_MODULES {

	// REACTOR LEVEL 1
	static efficiency = {
		minReactorLevel: 1,
		levelEffect: [
			{ outputCoef: 1.2, description: 'Increases production rate by 20%' },
			{ outputCoef: 1.4, description: 'Increases production rate by 40%' },
			{ outputCoef: 1.6, description: 'Increases production rate by 60%' },
			{ outputCoef: 2, description: 'Increases production rate by 100%' },
			{ outputCoef: 2.5, description: 'Increases production rate by 150%' }
		]
	}
	static overload = {
		minReactorLevel: 1,
		levelEffect: [
			{ outputCoef: 1.5, consoCoef: 1.3, description: 'Increases production rate by 50% and resources consumption by 30%' },
			{ outputCoef: 2, consoCoef: 1.6, description: 'Increases production rate by 100% and resources consumption by 60%' },
			{ outputCoef: 2.5, consoCoef: 1.9, description: 'Increases production rate by 150% and resources consumption by 90%' },
			{ outputCoef: 3, consoCoef: 2.2, description: 'Increases production rate by 200% and resources consumption by 120%' },
			{ outputCoef: 4.5, consoCoef: 2.5, description: 'Increases production rate by 300% and resources consumption by 150%' }
		]
	}

	// REACTOR LEVEL 3
	static synergy = {
		minReactorLevel: 3,
		levelEffect: [
			{ energyPerRawResource: 1, description: 'Produce 1 energy per each raw resource produced' },
			{ energyPerRawResource: 2, description: 'Produce 2 energy per each raw resource produced' },
		]
	}
	static stability = {
		minReactorLevel: 3,
		levelEffect: [
			{ breakdownRiskCoef: .75, description: 'Decreases breakdown risk by 25%' },
			{ breakdownRiskCoef: .5, description: 'Decreases breakdown risk by 50%' },
			{ breakdownRiskCoef: .3, description: 'Decreases breakdown risk by 70%' },
			{ breakdownRiskCoef: .15, description: 'Decreases breakdown risk by 85%' },
			{ breakdownRiskCoef: .05, description: 'Decreases breakdown risk by 95%' }
		]
	}

	// REACTOR LEVEL 5
	static catalyst = {
		minReactorLevel: 5,
		levelEffect: [
			{ outputCoef: 1, description: 'Consume catalyzer => Increases production rate by 100%' },
			{ outputCoef: 1.5, description: 'Consume catalyzer => Increases production rate by 150%' },
			{ outputCoef: 2.5, description: 'Consume catalyzer => Increases production rate by 250%' },
			{ outputCoef: 4, description: 'Consume catalyzer => Increases production rate by 400%' },
			{ outputCoef: 8, description: 'Consume catalyzer => Increases production rate by 800%' }
		]
	}
	static burst = {
		minReactorLevel: 5,
		levelEffect: [
			{ energyQty: 100, description: 'Consume prototypes => Produce 100 energy' },
			{ energyQty: 200, description: 'Consume prototypes => Produce 200 energy' },
			{ energyQty: 300, description: 'Consume prototypes => Produce 300 energy' },
		]
	}

	// REACTOR LEVEL 10
	static quantum = {
		minReactorLevel: 10,
		levelEffect: [
			{ energyQty: 5000, description: 'Consume aiModules => Produce 5000 energy' },
		]
	}
}