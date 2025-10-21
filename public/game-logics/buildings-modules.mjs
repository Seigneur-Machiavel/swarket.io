

/** @param {import('./player.mjs').PlayerNode} player */
export function getModulesDescriptionRelativeToPlayer(player) { // DEPRECATED
	if (!player.reactor) return null;
	/** @type {Record<string, { minBuildingLevel: number, currentLevel: number, description: string }>} */
	const modulesInfos = {};
	for (const b in buildingModules)
		for (const m in buildingModules[b]) {
			const currentLevel = player.reactor.modulesLevel[m] || 0;
			const { minBuildingLevel } = buildingModules[b][m];
			if (!modulesInfos[b]) modulesInfos[b] = {};
			const { description } = buildingModules[b][m].levelEffect[currentLevel] || 'Max level reached';
			modulesInfos[b][m] = { minBuildingLevel, currentLevel, description };
		}
	return modulesInfos;
}

/** @param {number} reactorLevel @param {string} moduleKey */
export function getModuleMaxLevel(reactorLevel, moduleKey) {
	console.log('getModuleMaxLevel', reactorLevel, moduleKey);
}

class ReactorModuleLevelEffect { // TYPEDEF ONLY
	/** @type {string} */ 				description;
	/** @type {number | undefined} */ 	outputCoef;
	/** @type {number | undefined} */ 	inputCoef;
	/** @type {number | undefined} */ 	breakdownRiskCoef;
	/** @type {number | undefined} */ 	energyPerRawResource;
}

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
	/** @returns {ReactorModuleLevelEffect | null} */
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

export class FABRICATOR_MODULES {
	// TO BE DEFINED
}

class TradeHubModuleLevelEffect { // TYPEDEF ONLY
	/** @type {string} */ 				description;
	/** @type {number | undefined} */ 	outputCoef;
	/** @type {number | undefined} */ 	inputCoef;
	/** @type {number | undefined} */ 	maxTradeOffer;
	/** @type {number | undefined} */ 	maxConnections;
}

export class TRADE_HUB_MODULES {
	/** @returns {Array<number>} */
	static emptyModulesArray() {
		return Array(TRADE_HUB_MODULES.allModulesKeys.length).fill(0);
	}
	static allModulesKeys = [
		'connectivity',
		'negotiation'
	];

	/** @returns {{minBuildingLevel: number, maxLevel: number} | null} */
	static getModuleRequiredLevelAndMaxLevel(moduleKey = 'toto') {
		const m = TRADE_HUB_MODULES[moduleKey];
		return { minBuildingLevel: m.minBuildingLevel, maxLevel: m.levelEffect.length };
	}
	/** @returns {TradeHubModuleLevelEffect | null} */
	static getModuleEffect(moduleKey = 'connectivity', level = 0) {
		return TRADE_HUB_MODULES[moduleKey]?.levelEffect[level] || null;
	}
	/** @returns {string} */
	static getModuleDescription(moduleKey = 'connectivity', level = 0) {
		let description = TRADE_HUB_MODULES[moduleKey]?.levelEffect[level]?.description;
		if (!description) description = `${TRADE_HUB_MODULES[moduleKey]?.levelEffect[level - 1]?.description} (Max level reached)`;
		return description;
	}
	
	// TRADE-HUB LEVEL 1
	static connectivity = {
		minBuildingLevel: 0,
		levelEffect: [
			{ maxConnections: 3, description: 'Increase trade route capacity from 2 to 3' },
			{ maxConnections: 4, description: 'Increase trade route capacity from 3 to 4' },
			{ maxConnections: 5, description: 'Increase trade route capacity from 4 to 5' },
			{ maxConnections: 6, description: 'Increase trade route capacity from 5 to 6' },
			{ maxConnections: 7, description: 'Increase trade route capacity from 6 to 7' }
		]
	}
	static negotiation = {
		minBuildingLevel: 0,
		levelEffect: [
			{ maxTradeOffer: 1, description: 'Increase the capacity of trade offers to 1' },
			{ maxTradeOffer: 2, description: 'Increase the capacity of trade offers to 2' },
			{ maxTradeOffer: 3, description: 'Increase the capacity of trade offers to 3' },
			{ maxTradeOffer: 4, description: 'Increase the capacity of trade offers to 4' },
			{ maxTradeOffer: 5, description: 'Increase the capacity of trade offers to 5' }
		]
	}
}

const buildingModules = { // NOT USED YET -> AND PROBABLY DEPRECATED SOON
	reactor: REACTOR_MODULES,
	// fabricator: FABRICATOR_MODULES, // TODO
	tradeHub: TRADE_HUB_MODULES
}