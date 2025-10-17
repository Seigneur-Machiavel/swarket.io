

/** @param {import('./player.mjs').PlayerNode} player */
export function getModulesDescriptionRelativeToPlayer(player) {
	if (!player.reactor) return null;
	/** @type {Record<string, { minBuildingLevel: number, currentLevel: number, description: string }>} */
	const modulesInfos = {};
	for (const m in REACTOR_MODULES) {
		const currentLevel = player.reactor.modulesLevel[m] || 0;
		const { minBuildingLevel } = REACTOR_MODULES[m];
		if (!modulesInfos[minBuildingLevel]) modulesInfos[minBuildingLevel] = {};
		const { description } = REACTOR_MODULES[m].levelEffect[currentLevel] || 'Max level reached';
		modulesInfos[minBuildingLevel][m] = { currentLevel, description };
	}
	return modulesInfos;
}

/** @param {number} reactorLevel @param {string} moduleKey */
export function getModuleMaxLevel(reactorLevel, moduleKey) {
	console.log('getModuleMaxLevel', reactorLevel, moduleKey);
}

/**
 * @typedef {{description: string, outputCoef?: number, inputCoef?: number, breakdownRiskCoef?: number, energyPerRawResource?: number}} LevelEffect
 */
export class REACTOR_MODULES {
	/** @returns {Array<number>} */
	static emptyModulesArray() {
		return Array(REACTOR_MODULES.allModulesKeys.length).fill(0);
	}
	static allModulesKeys = [
		'efficiency',
		'overload',
		'synergy',
		'stability',
		'catalyst',
		'burst',
		'quantum'
	];

	/** @returns {{minBuildingLevel: number, maxLevel: number} | null} */
	static getModuleRequiredLevelAndMaxLevel(moduleKey = 'toto') {
		const m = REACTOR_MODULES[moduleKey];
		return { minBuildingLevel: m.minBuildingLevel, maxLevel: m.levelEffect.length };
	}
	/** @returns {LevelEffect | null} */
	static getModuleEffect(moduleKey = 'efficiency', level = 0) {
		return REACTOR_MODULES[moduleKey]?.levelEffect[level] || null;
	}
	/** @returns {string} */
	static getModuleDescription(moduleKey = 'efficiency', level = 0) {
		let description = REACTOR_MODULES[moduleKey]?.levelEffect[level]?.description;
		if (!description) description = `${REACTOR_MODULES[moduleKey]?.levelEffect[level - 1]?.description} (Max level reached)`;
		return description;
	}

	// REACTOR LEVEL 1
	static efficiency = {
		minBuildingLevel: 0,
		levelEffect: [
			{ outputCoef: 1.2, description: 'Production rate: 120%' },
			{ outputCoef: 1.4, description: 'Production rate: 120% > 140%' },
			{ outputCoef: 1.6, description: 'Production rate: 140% > 160%' },
			{ outputCoef: 2, description: 'Production rate: 160% > 200%' },
			{ outputCoef: 2.5, description: 'Production rate: 200% > 250%' }
		]
	}
	static overload = {
		minBuildingLevel: 0,
		levelEffect: [
			{ outputCoef: 1.5, inputCoef: 1.3, description: 'Produces 50% more but consumes 30% more resources' },
			{ outputCoef: 2, inputCoef: 1.6, description: 'Production: 150% > 200%, Consumption: 30% > 60%' },
			{ outputCoef: 2.5, inputCoef: 1.9, description: 'Production: 200% > 250%, Consumption: 60% > 90%' },
			{ outputCoef: 3, inputCoef: 2.2, description: 'Production: 250% > 300%, Consumption: 90% > 120%' },
			{ outputCoef: 4.5, inputCoef: 2.5, description: 'Production: 300% > 450%, Consumption: 120% > 150%' }
		]
	}

	// REACTOR LEVEL 3
	static synergy = {
		minBuildingLevel: 3,
		levelEffect: [
			{ energyPerRawResource: 1, description: 'Produce 1 energy per each raw resource produced' },
			{ energyPerRawResource: 2, description: 'Produce 2 energy per each raw resource produced' },
		]
	}
	static stability = {
		minBuildingLevel: 3,
		levelEffect: [
			{ breakdownRiskCoef: .75, description: 'Decreases breakdown risk by 25%' },
			{ breakdownRiskCoef: .5, description: 'Breakdown risk: 75% > 50%' },
			{ breakdownRiskCoef: .3, description: 'Breakdown risk: 50% > 30%' },
			{ breakdownRiskCoef: .15, description: 'Breakdown risk: 30% > 15%' },
			{ breakdownRiskCoef: .05, description: 'Breakdown risk: 15% > 5%' }
		]
	}

	// REACTOR LEVEL 5
	static catalyst = {
		minBuildingLevel: 5,
		levelEffect: [
			{ outputCoef: 2, description: 'Consume catalyzer => Production rate: +100%' },
			{ outputCoef: 2.5, description: 'Consume catalyzer => Production rate: 150%' },
			{ outputCoef: 3.5, description: 'Consume catalyzer => Production rate: 250%' },
			{ outputCoef: 5, description: 'Consume catalyzer => Production rate: 400%' },
			{ outputCoef: 9, description: 'Consume catalyzer => Production rate: 800%' }
		]
	}
	static burst = {
		minBuildingLevel: 5,
		levelEffect: [
			{ description: 'Consume prototypes => Produce 100 energy' },
			{ description: 'Consume prototypes => Produce 200 energy' },
			{ description: 'Consume prototypes => Produce 300 energy' },
		]
	}

	// REACTOR LEVEL 10
	static quantum = {
		minBuildingLevel: 10,
		levelEffect: [
			{ description: 'Consume aiModules => Produce 5000 energy' },
		]
	}
}