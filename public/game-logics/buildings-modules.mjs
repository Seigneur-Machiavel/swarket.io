

/** @param {number} reactorLevel @param {string} moduleKey */
export function getModuleMaxLevel(reactorLevel, moduleKey) {
	console.log('getModuleMaxLevel', reactorLevel, moduleKey);
}

class ModuleLevelEffect { 								// TYPEDEF
	/** @type {string} */ 				description; 	// Tooltip description
	/** @type {number | undefined} */ 	outputCoef;		// Output coefficient
	/** @type {number | undefined} */ 	inputCoef;		// Input coefficient
}
class TradeHubModuleLevelEffect extends ModuleLevelEffect { // TYPEDEF
	/** @type {number | undefined} */ 	maxTradeOffer;
	/** @type {number | undefined} */ 	maxConnections;
	/** @type {number | undefined} */ 	maxThefts;
	/** @type {number | undefined} */ 	signalRange;
	/** @type {number | undefined} */ 	theftSuccessRate;
	/** @type {number | undefined} */ 	theftLossRate;
	/** @type {number | undefined} */ 	taxRate;
}
class ReactorModuleLevelEffect extends ModuleLevelEffect { 	// TYPEDEF
	/** @type {number | undefined} */ 	breakdownRiskCoef;
	/** @type {number | undefined} */ 	energyPerRawResource;
}
class FabricatorModuleLevelEffect extends ModuleLevelEffect { // TYPEDEF
	/** @type {number | undefined} */ 	breakdownRiskCoef;
	/** '2' = basic, '3' = advanced, '4' = composite, '5' = ultimate @type {string | undefined} */
	productTier;
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
			{ outputCoef: 1.1, description: 'Reactor production rate: 110% (passive)' },
			{ outputCoef: 1.2, description: 'Reactor production rate: 110% > 120% (passive)' },
			{ outputCoef: 1.3, description: 'Reactor production rate: 120% > 130% (passive)' },
			{ outputCoef: 1.4, description: 'Reactor production rate: 130% > 140% (passive)' },
			{ outputCoef: 1.5, description: 'Reactor production rate: 140% > 150% (passive)' }
		]
	}
	static overload = {
		minBuildingLevel: 0,
		levelEffect: [
			{ outputCoef: 1.3, inputCoef: 1.1, description: 'Produces 30% more but consumes 10% more resources' },
			{ outputCoef: 1.5, inputCoef: 1.3, description: 'Produces 50% more but consumes 30% more resources' },
			{ outputCoef: 2, inputCoef: 1.6, description: 'Production: 50% > 100%, Consumption: 30% > 60%' },
			{ outputCoef: 2.5, inputCoef: 1.9, description: 'Production: 100% > 150%, Consumption: 60% > 90%' },
			{ outputCoef: 3, inputCoef: 2.2, description: 'Production: 150% > 220%, Consumption: 90% > 120%' }
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
	static catalyst = { // associated with production line 'catalyst'
		minBuildingLevel: 5,
		levelEffect: [
			{ description: 'Consume catalyzer => Reactor production rate: +20%' },
			{ description: 'Consume catalyzer => Reactor production rate: +50%' },
			{ description: 'Consume catalyzer => Reactor production rate: +80%' },
			{ description: 'Consume catalyzer => Reactor production rate: +110%' },
			{ description: 'Consume catalyzer => Reactor production rate: +150%' }
		]
	}
	static burst = { // associated with production line 'burst'
		minBuildingLevel: 5,
		levelEffect: [
			{ description: 'Consume prototypes => Produce 20 energy' },
			{ description: 'Consume prototypes => Produce 50 energy' },
			{ description: 'Consume prototypes => Produce 100 energy' },
		]
	}

	// REACTOR LEVEL 10
	static quantum = { // associated with production line 'quantum'
		minBuildingLevel: 10,
		levelEffect: [
			{ description: 'Consume aiModules => Produce 500 energy' },
		]
	}
}
export class FABRICATOR_MODULES {
	/** @returns {Array<number>} */
	static emptyModulesArray() {
		return Array(FABRICATOR_MODULES.allModulesKeys.length).fill(0);
	}
	static allModulesKeys = [
		'basicProductionLine',
		'efficiency',
		'advancedProductionLine',
		'stability',
		'compositeProductionLine',
		'catalyst',
		'ultimateProductionLine',
		//TODO : the last one
	];
	/** @returns {{minBuildingLevel: number, maxLevel: number} | null} */
	static getModuleRequiredLevelAndMaxLevel(moduleKey = 'toto') {
		const m = FABRICATOR_MODULES[moduleKey];
		return { minBuildingLevel: m.minBuildingLevel, maxLevel: m.levelEffect.length };
	}
	/** @returns {FabricatorModuleLevelEffect | null} */
	static getModuleEffect(moduleKey = 'efficiency', level = 0) {
		return FABRICATOR_MODULES[moduleKey]?.levelEffect[level - 1] || null;
	}
	/** @returns {string} */
	static getModuleDescription(moduleKey = 'efficiency', level = 0) {
		let description = FABRICATOR_MODULES[moduleKey]?.levelEffect[level]?.description;
		if (!description) description = `${FABRICATOR_MODULES[moduleKey]?.levelEffect[level - 1]?.description} (Max level reached)`;
		return description;
	}

	// FABRICATOR LEVEL 0
	static basicProductionLine = {
		minBuildingLevel: 0,
		levelEffect: [
			{ productTier: '2', description: 'Create a random basic production line' },
			{ productTier: '2', description: 'Create a random basic production line' },
			{ productTier: '2', description: 'Create a random basic production line' },
			{ productTier: '2', description: 'Create a random basic production line' }
		]
	}
	static efficiency = {
		minBuildingLevel: 0,
		levelEffect: [
			{ inputCoef: .95, description: 'Fabricator consumption rate: -5% (passive)' },
			{ inputCoef: .9, description: 'Fabricator consumption rate: -5% > -10% (passive)' },
			{ inputCoef: .85, description: 'Fabricator consumption rate: -10% > -15% (passive)' },
			{ inputCoef: .8, description: 'Fabricator consumption rate: -15% > -20% (passive)' },
			{ inputCoef: .7, description: 'Fabricator consumption rate: -20% > -30% (passive)' },
			{ inputCoef: .6, description: 'Fabricator consumption rate: -30% > -40% (passive)' },
			{ inputCoef: .5, description: 'Fabricator consumption rate: -40% > -50% (passive)' },
			{ inputCoef: .4, description: 'Fabricator consumption rate: -50% > -60% (passive)' },
		]
	}

	// FABRICATOR LEVEL 3
	static advancedProductionLine = {
		minBuildingLevel: 3,
		levelEffect: [
			{ productTier: '3', description: 'Create a random advanced production line' },
			{ productTier: '3', description: 'Create a random advanced production line' },
			{ productTier: '3', description: 'Create a random advanced production line' }
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

	// FABRICATOR LEVEL 5
	static compositeProductionLine = {
		minBuildingLevel: 5,
		levelEffect: [
			{ productTier: '4', description: 'Create a random composite production line' },
			{ productTier: '4', description: 'Create a random composite production line' },
			{ productTier: '4', description: 'Create a random composite production line' }
		]
	}
	static catalyst = { // associated with production line 'catalyst'
		minBuildingLevel: 5,
		levelEffect: [
			{ description: 'Consume catalyzer => Fabricator production rate: +20%' },
			{ description: 'Consume catalyzer => Fabricator production rate: +50%' },
			{ description: 'Consume catalyzer => Fabricator production rate: +80%' },
			{ description: 'Consume catalyzer => Fabricator production rate: +110%' },
			{ description: 'Consume catalyzer => Fabricator production rate: +150%' }
		]
	}

	// FABRICATOR LEVEL 10
	static ultimateProductionLine = {
		minBuildingLevel: 10,
		levelEffect: [
			{ productTier: '5', description: 'Create a random ultimate production line' },
			{ productTier: '5', description: 'Create a random ultimate production line' }
		]
	}
}