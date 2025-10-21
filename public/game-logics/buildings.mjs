import { VALID_RESOURCES, BLUEPRINT, ResourcesProductionType } from './resources.mjs';
import { REACTOR_MODULES, FABRICATOR_MODULES, TRADE_HUB_MODULES } from './buildings-modules.mjs';

export class BuildingBuilder {
	/** @param {Reactor} data @param {'reactor' | 'fabricator' | 'tradeHub'} subClassName @param {'object' | 'array'} extractionMode */
	static rebuildClasseIfItCanBe(data, subClassName, extractionMode) {
		if (extractionMode !== 'object' && extractionMode !== 'array') return console.error('BuildingBuilder.rebuildClasseIfItCanBe: extractionMode must be "object" or "array"');
		if (!data || !subClassName) return null;

		let building;
		if (subClassName === 'reactor') building = new Reactor();
		else if (subClassName === 'fabricator') building = new Fabricator();
		else if (subClassName === 'tradeHub') building = new TradeHub();
		else return null;

		// AS OBJECT
		if (extractionMode === 'object') for (const k in data) building[k] = data[k];
		else { // AS ARRAY
			let i = 0;
			for (const k in building) building[k] = data[i++];
		}
		
		return building;
	}
}

export class Building {
	type = 'b'; // generic building
	
	/** @type {Array<number>} */
	modulesLevel = [];
	upgradePoints = 0;

	level() {
		return this.modulesLevel.reduce((acc, cur) => acc + cur, 0);
	}
	#getModuleIndex(moduleKey = '') {
		if (this.type === 'r') return REACTOR_MODULES.allModulesKeys.indexOf(moduleKey);
		if (this.type === 'f') return FABRICATOR_MODULES.allModulesKeys.indexOf(moduleKey);
		if (this.type === 't') return TRADE_HUB_MODULES.allModulesKeys.indexOf(moduleKey);
		return -1;
	}
	/** @returns {{minBuildingLevel: number, maxLevel: number} | null} */
	#getModuleMinMaxLevel(moduleKey = '') {
		if (this.type === 'r') return REACTOR_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
	}
	upgradeModule(moduleKey = '') {
		const moduleIndex = this.#getModuleIndex(moduleKey);
		if (moduleIndex === -1) return;

		const { minBuildingLevel, maxLevel } = this.#getModuleMinMaxLevel(moduleKey) || {};
		if (minBuildingLevel === undefined || maxLevel === undefined) return;
		
		const currentLevel = this.modulesLevel[moduleIndex] || 0;
		const buildingLevel = this.level();
		if (this.upgradePoints <= 0) return;
		if (buildingLevel < minBuildingLevel) return;
		if (currentLevel >= maxLevel) return;

		this.modulesLevel[moduleIndex] = currentLevel + 1;
		this.upgradePoints--;
	}
	getProductionLineEffect(lineKey = 'toto') { // TEMPLATE -> WILL BE OVERRIDDEN
		/** @type {BLUEPRINT} */
		const bluePrints = {};
		return bluePrints['toto'];
	}
	/** @param {import('./player.mjs').PlayerNode} player @returns {ResourcesProductionType} */
	consumeResourcesAndGetProduction(player) {
		this.linesWhoProducedThisTurn = [];
		if (!player.getEnergy) return {};
		const production = {}; 	// ResourcesProductionType
		for (const lineKey of this.activeProductionLines) {
			const { inputs, outputs } = this.getProductionLineEffect(lineKey);
			let missingResource = false;
			for (const r in inputs) { // CHECK IF PLAYER HAS ENOUGH RESOURCES FOR THE LINE
				if (player.inventory.getAmount(r) >= inputs[r]) continue;
				missingResource = true;
				break;
			}
			if (missingResource) continue;

			// IF SO, APPLY CONSUMATION & FILL PRODUCTION
			for (const r in inputs) player.inventory.subtractAmount(r, inputs[r]);
			for (const r in outputs) production[r] = (production[r] || 0) + outputs[r];
			this.linesWhoProducedThisTurn.push(lineKey);
		}

		return production;
	}
	/** @param {'object' | 'array'} extractionMode @returns {object | Array<any>} */
	extract(extractionMode) { // FOR SENDING OVER THE NETWORK -> Lighter ARRAY
		if (extractionMode === 'object') {
			const sendable = {}; 	// TO OBJECT - SAFE
			for (const k in this) sendable[k] = this[k]?.extract ? this[k].extract() : this[k];
			return sendable;
		}

		const sendable = []; 		// TO ARRAY  - LIGHT
		for (const k in this) sendable.push(this[k]?.extract ? this[k].extract() : this[k]);
		return sendable;
	}
}

export class Reactor extends Building {
	type = 'r'; // 'reactor'

	/** @type {Array<0 | .25 | .5 | .75 | 1>} */
	productionRates = [1];
	linesWhoProducedThisTurn = [];
	activeProductionLines = ['energyFromChipsAndEngineers'];
	modulesLevel = REACTOR_MODULES.emptyModulesArray();

	getProductionLineEffect(lineName = 'energyFromChipsAndEngineers') { // TODO: MAKE A LOOP WITH ALL PRODUCTION LINES
		const lineIndex = this.activeProductionLines.indexOf(lineName);
		if (lineIndex === -1) return { inputs: {}, outputs: {} };

		const productionRate = this.productionRates[lineIndex] || 0;
		if (productionRate === 0) return { inputs: {}, outputs: {} };

		const mod = { inputCoef: 1, outputCoef: 1, breakdownRiskCoef: 1, energyPerRawResource: 0 };
		for (let i = 0; i < this.modulesLevel.length; i++) {
			const moduleLevel = this.modulesLevel[i];
			if (moduleLevel === 0) continue;
			const moduleKey = REACTOR_MODULES.allModulesKeys[i];
			const { inputCoef, outputCoef, breakdownRiskCoef, energyPerRawResource } = REACTOR_MODULES.getModuleEffect(moduleKey, moduleLevel - 1) || {};
			mod.inputCoef *= inputCoef !== undefined ? inputCoef : 1;
			mod.outputCoef *= outputCoef !== undefined ? outputCoef : 1;
			mod.breakdownRiskCoef *= breakdownRiskCoef !== undefined ? breakdownRiskCoef : 1;
			//mod.energyPerRawResource += energyPerRawResource || 0; => TODO
		}

		const bluePrint = BLUEPRINT[lineName]();
		const { inputs, outputs } = bluePrint;
		for (const r in bluePrint.inputs) // APPLY CONSO COEF
			inputs[r] = inputs[r] * productionRate * mod.inputCoef;

		for (const r in outputs) // APPLY EFFICIENCY/OVERLOAD COEF
			outputs[r] = outputs[r] * productionRate * mod.outputCoef;

		return { inputs, outputs };
	}
}

export class Fabricator extends Building {
	type = 'f'; // 'fabricator'
	/** @type {Array<0 | .25 | .5 | .75 | 1>} */
	productionRates = [1];
	linesWhoProducedThisTurn = [];
	/** @type {string[]} */
	activeProductionLines = [];
	modulesLevel = [];

}

export class TradeOffer {
	/** @type {string} */ resourceName = '';
	/** @type {number} */ amount = 0;
	/** @type {string} */ requestedResourceName = '';
	/** @type {number} */ requestedAmount = 0;
	/** Public offer only @type {number | undefined} */ 	minStock = 0;
	/** Public offer only @type {boolean | undefined} */ 	isActive = false;
}
export class TradeHub extends Building {
	type = 't'; // 'trade hub'
	maxConnections = 2;
	maxPublicOffers = 1;

	/** @type {Array<0 | 1 | 2 | 3 | 4 | 5>} */
	modulesLevel = TRADE_HUB_MODULES.emptyModulesArray();
	/** key: resourceName, value: [amount, requestedResourceName, requestedAmount, minStock, isActive] @type {Record<string, [number, string, number, number, boolean]>} */
	publicOffers = {};
	/** key: targetPlayerId, value: [resourceName, amount, requestedResourceName, requestedAmount] @type {Record<string, [string, number, string, number]>} */
	privateOffers = {};

	/** @returns {TradeOffer | null} */
	getPublicTradeOffer(resourceName = '') {
		if (!this.publicOffers[resourceName]) return null;
		const [amount, requestedResourceName, requestedAmount, minStock, isActive] = this.publicOffers[resourceName];
		return { resourceName, amount, requestedResourceName, requestedAmount, minStock, isActive };
	}
	/** @returns {TradeOffer | null} */
	getPrivateTradeOffer(targetPlayerId = '') {
		if (!this.privateOffers[targetPlayerId]) return null;
		const [resourceName, amount, requestedResourceName, requestedAmount] = this.privateOffers[targetPlayerId];
		return { resourceName, amount, requestedResourceName, requestedAmount };
	}
	/** @param {string} resourceName @param {number} amount @param {string} requestedResourceName @param {number} requestedAmount @param {number} minStock @param {boolean} isActive */
	setPublicTradeOffer(resourceName, amount, requestedResourceName, requestedAmount, minStock, isActive) {
		if (typeof isActive !== 'boolean') return;
		if (typeof minStock !== 'number' || minStock < 0) return;
		if (!this.#checkOfferValues(resourceName, amount, requestedResourceName, requestedAmount)) return;
		this.publicOffers[resourceName] = [amount, requestedResourceName, requestedAmount, minStock, isActive];
	}
	/** @param {string} targetPlayerId @param {string} resourceName @param {number} amount @param {string} requestedResourceName @param {number} requestedAmount */
	setPrivateTradeOffer(targetPlayerId, resourceName, amount, requestedResourceName, requestedAmount) {
		if (typeof targetPlayerId !== 'string') return;
		if (!this.#checkOfferValues(resourceName, amount, requestedResourceName, requestedAmount)) return;
		this.privateOffers[targetPlayerId] = [resourceName, amount, requestedResourceName, requestedAmount];
	}
	/** @param {string} resourceName @param {number} amount @param {string} requestedResourceName @param {number} requestedAmount */
	#checkOfferValues(resourceName, amount, requestedResourceName, requestedAmount) {
		if (typeof resourceName !== 'string') return false;
		if (!VALID_RESOURCES.has(resourceName)) return false;
		if (typeof amount !== 'number' || amount <= 0) return false;
		if (typeof requestedResourceName !== 'string') return false;
		if (!VALID_RESOURCES.has(requestedResourceName)) return false;
		if (typeof requestedAmount !== 'number' || requestedAmount <= 0) return false;
		return true;
	}
	/** @param {string} targetPlayerId */
	cancelPrivateTradeOffer(targetPlayerId) {
		delete this.privateOffers[targetPlayerId];
	}
	/** @param {string} resourceName */
	cancelPublicTradeOffer(resourceName) {
		delete this.publicOffers[resourceName];
	}
}