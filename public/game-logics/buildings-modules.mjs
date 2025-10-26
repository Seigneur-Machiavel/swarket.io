

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
		return REACTOR_MODULES[moduleKey]?.levelEffect[level - 1] || null;
	}
	/** @returns {string} */
	static getModuleDescription(moduleKey = 'efficiency', level = 0) {
		let description = REACTOR_MODULES[moduleKey]?.levelEffect[level]?.description;
		if (!description) description = `${REACTOR_MODULES[moduleKey]?.levelEffect[level - 1]?.description} (Max level reached)`;
		return description;
	}

	// REACTOR LEVEL 0
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
	static synergy = { // default : 0
		minBuildingLevel: 3,
		levelEffect: [
			{ energyPerRawResource: .05, description: 'Produce 0.05 energy per each raw resource produced' },
			{ energyPerRawResource: .1, description: 'Produce 0.1 energy per each raw resource produced' },
			{ energyPerRawResource: .2, description: 'Produce 0.2 energy per each raw resource produced' },
			{ energyPerRawResource: .3, description: 'Produce 0.3 energy per each raw resource produced' },
			{ energyPerRawResource: .5, description: 'Produce 0.5 energy per each raw resource produced' }
		]
	}
	static stability = { // default : 1
		minBuildingLevel: 3,
		levelEffect: [
			{ breakdownRiskCoef: .75, description: 'Decreases breakdown risk by 25%' },
			{ breakdownRiskCoef: .5, description: 'Breakdown risk reduction: 25% > 50%' },
			{ breakdownRiskCoef: .3, description: 'Breakdown risk reduction: 50% > 70%' },
			{ breakdownRiskCoef: .15, description: 'Breakdown risk reduction: 30% > 15%' },
			{ breakdownRiskCoef: .05, description: 'Breakdown risk reduction: 15% > 5%' }
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
	/** @type {number | undefined} */ 	maxThefts;
	/** @type {number | undefined} */ 	signalRange;
	/** @type {number | undefined} */ 	theftSuccessRate;
	/** @type {number | undefined} */ 	theftLossRate;
	/** @type {number | undefined} */ 	taxRate;
	/** @type {number | undefined} */ 	comissionRate; // DEPRECATED
}

export class TRADE_HUB_MODULES {
	/** @returns {Array<number>} */
	static emptyModulesArray() {
		return Array(TRADE_HUB_MODULES.allModulesKeys.length).fill(0);
	}
	static allModulesKeys = [
		'connectivity',
		'trader',
		'thief',
		'beacon',
		'planification',
		'protection',
		'hacker',
		'optimizer'
	];

	/** @returns {{minBuildingLevel: number, maxLevel: number} | null} */
	static getModuleRequiredLevelAndMaxLevel(moduleKey = 'toto') {
		const m = TRADE_HUB_MODULES[moduleKey];
		return { minBuildingLevel: m.minBuildingLevel, maxLevel: m.levelEffect.length };
	}
	/** @returns {TradeHubModuleLevelEffect | null} */
	static getModuleEffect(moduleKey = 'connectivity', level = 0) {
		return TRADE_HUB_MODULES[moduleKey]?.levelEffect[level - 1] || null;
	}
	/** @returns {string} */
	static getModuleDescription(moduleKey = 'connectivity', level = 0) {
		let description = TRADE_HUB_MODULES[moduleKey]?.levelEffect[level]?.description;
		if (!description) description = `${TRADE_HUB_MODULES[moduleKey]?.levelEffect[level - 1]?.description} (Max level reached)`;
		return description;
	}
	
	// TRADE-HUB LEVEL 0
	static connectivity = { // default : 2
		minBuildingLevel: 0,
		levelEffect: [
			{ maxConnections: 3, description: 'Increase connection capacity from 2 to 3' },
			{ maxConnections: 4, description: 'Increase connection capacity from 3 to 4' },
			{ maxConnections: 5, description: 'Increase connection capacity from 4 to 5' },
			{ maxConnections: 6, description: 'Increase connection capacity from 5 to 6' },
			{ maxConnections: 7, description: 'Increase connection capacity from 6 to 7' }
		]
	}
	static trader = { // default : 0
		minBuildingLevel: 0,
		levelEffect: [
			{ maxTradeOffer: 1, description: 'Increase trade offers capacity to 1' },
			{ maxTradeOffer: 2, description: 'Increase trade offers capacity from 1 to 2' },
			{ maxTradeOffer: 3, description: 'Increase trade offers capacity from 2 to 3' },
			{ maxTradeOffer: 5, description: 'Increase trade offers capacity from 3 to 5' },
			{ maxTradeOffer: 7, description: 'Increase trade offers capacity from 5 to 7' },
			{ maxTradeOffer: 10, description: 'Increase trade offers capacity from 7 to 10' }
		]
	}

	// TRADE-HUB LEVEL 3
	static broker = { // default : 0 // DISABLED FOR NOW (removed from allModulesKeys)
		minBuildingLevel: 3,
		levelEffect: [
			{ comissionRate: .02, description: 'Take comission of 2% on any neighbors trades' },
			{ comissionRate: .04, description: 'Increase comission rate from 2% to 4%' },
			{ comissionRate: .06, description: 'Increase comission rate from 4% to 6%' },
			{ comissionRate: .08, description: 'Increase comission rate from 6% to 8%' },
			{ comissionRate: .1, description: 'Increase comission rate from 8% to 10%' }
		]
	}
	static thief = { // default : 0 // For now, targets are randomly chosen
		minBuildingLevel: 3,
		levelEffect: [
			{ maxThefts: 1, description: 'Choose 1 target for theft (Success rate: 10%)' },
			{ maxThefts: 2, description: 'More theft targets from 1 to 2' },
			{ maxThefts: 3, description: 'More theft targets from 2 to 3' },
			{ maxThefts: 4, description: 'More theft targets from 3 to 4' },
			{ maxThefts: 5, description: 'More theft targets from 4 to 5' },
			{ maxThefts: 6, description: 'More theft targets from 5 to 6' },
			{ maxThefts: 7, description: 'More theft targets from 6 to 7' },
			{ maxThefts: 8, description: 'More theft targets from 7 to 8' },
			{ maxThefts: 10, description: 'More theft targets from 8 to 10' },
			{ maxThefts: 12, description: 'More theft targets from 10 to 12' }
		]
	}
	static beacon = { // default : 0
		minBuildingLevel: 3,
		levelEffect: [
			{ signalRange: 2, description: 'Increase signal range from 1 to 2' },
			{ signalRange: 3, description: 'Increase signal range from 2 to 3' },
			{ signalRange: 4, description: 'Increase signal range from 3 to 4' },
			{ signalRange: 5, description: 'Increase signal range from 4 to 5' },
			{ signalRange: 6, description: 'Increase signal range from 5 to 6' }
		]
	}

	// TRADE-HUB LEVEL 5
	static planification = { // default : .1
		minBuildingLevel: 5,
		levelEffect: [
			{ theftSuccessRate: .15, description: 'Increase theft success rate from 10% to 15%' },
			{ theftSuccessRate: .2, description: 'Increase theft success rate from 15% to 20%' },
			{ theftSuccessRate: .25, description: 'Increase theft success rate from 20% to 25%' },
			{ theftSuccessRate: .3, description: 'Increase theft success rate from 25% to 30%' },
			{ theftSuccessRate: .35, description: 'Increase theft success rate from 30% to 35%' },
			{ theftSuccessRate: .4, description: 'Increase theft success rate from 35% to 40%' },
			{ theftSuccessRate: .45, description: 'Increase theft success rate from 40% to 45%' },
			{ theftSuccessRate: .5, description: 'Increase theft success rate from 45% to 50%' }
		]
	}
	static protection = { // default: 1
		minBuildingLevel: 5,
		levelEffect: [
			{  theftLossRate: .9, description: 'Theft protection, decrease loss from 100% to 90%' },
			{  theftLossRate: .75, description: 'Theft protection, decrease loss from 90% to 75%' },
			{  theftLossRate: .6, description: 'Theft protection, decrease loss from 75% to 60%' },
			{  theftLossRate: .4, description: 'Theft protection, decrease loss from 60% to 40%' },
			{  theftLossRate: .2, description: 'Theft protection, decrease loss from 40% to 20%' },
			{  theftLossRate: .1, description: 'Theft protection, decrease loss from 20% to 10%' },
			{  theftLossRate: .05, description: 'Theft protection, decrease loss from 10% to 5%' },
		]
	}

	// TRADE-HUB LEVEL 10
	static hacker = { // default: false
		minBuildingLevel: 10,
		levelEffect: [
			{ description: 'Burglaries now affect private exchanges' },
		]
	}
	static optimizer = { // default: .3
		minBuildingLevel: 10,
		levelEffect: [
			{ taxRate: .25, description: 'Reduce tax on public offers from 30% to 25%' },
			{ taxRate: .2, description: 'Reduce tax on public offers from 25% to 20%' },
			{ taxRate: .15, description: 'Reduce tax on public offers from 20% to 15%' },
			{ taxRate: .1, description: 'Reduce tax on public offers from 15% to 10%' },
			{ taxRate: .05, description: 'Reduce tax on public offers from 10% to 5%' }
		]
	}
}

const buildingModules = { // NOT USED YET -> AND PROBABLY DEPRECATED SOON
	reactor: REACTOR_MODULES,
	// fabricator: FABRICATOR_MODULES, // TODO
	tradeHub: TRADE_HUB_MODULES
}