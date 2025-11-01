import { SeededRandom } from './consensus.mjs';
import { VALID_RESOURCES, BLUEPRINT, ResourcesProductionType, newResourcesSet } from './resources.mjs';
import { REACTOR_MODULES, FABRICATOR_MODULES, TRADE_HUB_MODULES } from './buildings-modules.mjs';
/** @type {import('hive-p2p/libs/xxhash32.mjs').xxHash32} */
const xxHash32 = typeof window !== 'undefined'
	? (await import('../hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32))
	: (await import('hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32));

const KEYS_TO_NOT_EXTRACT = new Set([
	// ALL BUILDINGS
	'linesWhoProducedThisTurn',		// FOR UI PURPOSES
	'linesWhoBrokeThisTurn',		// FOR UI PURPOSES
	'breakdownRiskBasis', 			// FOR GAME LOGIC PURPOSES

	// TRADE HUB
	'turnThiefs', 					// FOR GAME LOGIC PURPOSES
	'lastTakerOrderFullyFilled', 	// FOR UI PURPOSES
	'offersExpiryDefault', 			// FOR GAME LOGIC PURPOSES
	'offersExpiryCounter', 			// FOR GAME LOGIC PURPOSES
	'maxAuthorizedFillsPerTurn', 	// FOR GAME LOGIC PURPOSES
	'publicOffersDispatchRequested',// FOR GAME LOGIC PURPOSES
	'publicOffers', 				// MY PLAYER ONLY
	'publicOffersByResource', 		// REMOTE PLAYERS ONLY
	'localFillIntents' 				// FOR GAME LOGIC PURPOSES
]);

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
			for (const k in building)
				if (k === 'type' && building.type !== data[i]) throw new Error(`BuildingBuilder.rebuildClasseIfItCanBe: type mismatch (${building.type} != ${data[i]})`);
				else if (KEYS_TO_NOT_EXTRACT.has(k)) continue;
				else building[k] = data[i++];
		}
		
		return building;
	}
}
export class Building {
	type = 'b'; // generic building
	
	/** @type {Array<number>} */
	modulesLevel = [];
	upgradePoints = 1;

	// NOT EXTRACTED ----------------------------
	linesWhoProducedThisTurn = [];
	linesWhoBrokeThisTurn = [];
	breakdownRiskBasis = .25; 		// FOR GAME LOGIC PURPOSES: 25% base risk per turn
	// END NOT EXTRACTED ------------------------

	level() {
		return this.modulesLevel.reduce((acc, cur) => acc + cur, 0);
	}
	/** @returns {number} */
	getModuleIndex(moduleKey = '') {
		if (this.type === 'r') return REACTOR_MODULES.allModulesKeys.indexOf(moduleKey);
		if (this.type === 'f') return FABRICATOR_MODULES.allModulesKeys.indexOf(moduleKey);
		if (this.type === 't') return TRADE_HUB_MODULES.allModulesKeys.indexOf(moduleKey);
		return -1;
	}
	/** @returns {{minBuildingLevel: number, maxLevel: number} | null} */
	#getModuleMinMaxLevel(moduleKey = '') {
		if (this.type === 'r') return REACTOR_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
		if (this.type === 'f') return FABRICATOR_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
		if (this.type === 't') return TRADE_HUB_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
		return null;
	}
	/** @returns {{inputCoef: number | undefined, outputCoef: number | undefined}} */
	#getModuleInputOutputCoef(moduleIndex = 0) {
		const moduleLevel = this.modulesLevel[moduleIndex] || 0;
		if (this.type === 'r') return REACTOR_MODULES.getModuleEffect(REACTOR_MODULES.allModulesKeys[moduleIndex], moduleLevel) || {};
		if (this.type === 'f') return FABRICATOR_MODULES.getModuleEffect(FABRICATOR_MODULES.allModulesKeys[moduleIndex], moduleLevel) || {};
		if (this.type === 't') return TRADE_HUB_MODULES.getModuleEffect(TRADE_HUB_MODULES.allModulesKeys[moduleIndex], moduleLevel) || {};
		return {};
	}
	/** @param {string} moduleKey @param {string} [randomSeed] */
	upgradeModule(moduleKey, randomSeed) {
		if (!moduleKey) return console.warn('Building.upgradeModule: moduleKey and randomSeed are required');
		if (typeof moduleKey !== 'string') return console.warn('Building.upgradeModule: moduleKey must be strings');
		if (randomSeed && typeof randomSeed !== 'string') return console.warn('Building.upgradeModule: randomSeed must be a string if provided');
		
		const moduleIndex = this.getModuleIndex(moduleKey);
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

		this.createModuleUpgradeAssociateProductionline(currentLevel, moduleKey, randomSeed);
	}
	createModuleUpgradeAssociateProductionline(currentLevel = 0, moduleKey = '', randomSeed = '') {
		// OVERRIDE IN CHILD CLASSES
	}
	/** @param {import('./player.mjs').PlayerNode} player @param {string} randomSeed @returns {ResourcesProductionType} */
	consumeResourcesAndGetProduction(player, randomSeed) {
		const linesWhoBrokeLastTurn = this.linesWhoBrokeThisTurn;
		this.linesWhoProducedThisTurn = [];
		this.linesWhoBrokeThisTurn = [];
		if (!player.getEnergy) return {};
		
		let outputCoef = 1; 	// For lines who produce an output modificator
		const production = {}; 	// ResourcesProductionType
		for (const lineKey of this.activeProductionLines) {
			const { inputs, outputs, stopped } = this.getProductionLineEffect(lineKey);
			if (stopped) continue;

			let missingResource = false;
			for (const r in inputs) { // CHECK IF PLAYER HAS ENOUGH RESOURCES FOR THE LINE
				if (player.inventory.getAmount(r) >= inputs[r]) continue;
				missingResource = true;
				break;
			}
			if (missingResource) continue;
			
			// IF LINE BREAKDOWN AND NOT BROKE LAST TURN, CONSUME RESOURCES
			const hashBreakdown = this.#hasLineBreaked(player, lineKey, randomSeed);
			if (hashBreakdown && !linesWhoBrokeLastTurn.includes(lineKey))
				for (const r in inputs) player.inventory.subtractAmount(r, inputs[r]);
			if (hashBreakdown) continue; // line broke this turn

			// CONSUME RESOURCES && FILL PRODUCTION
			for (const r in inputs) player.inventory.subtractAmount(r, inputs[r]);
			for (const r in outputs) {
				if (r === 'outputCoef') outputCoef *= outputs[r]; // Special case for outputCoef
				else production[r] = (production[r] || 0) + outputs[r]; // other resources
			}
			this.linesWhoProducedThisTurn.push(lineKey);
		}

		// APPLY THE GLOBAL OUTPUT COEF AND RETURN PRODUCTIONS
		for (const r in production) production[r] *= outputCoef;
		return production;
	}
	#hasLineBreaked(player, lineKey, randomSeed) {
		let breakdownChance = this.breakdownRiskBasis; 		// basis 25%
		breakdownChance *= this.getBreakdownRiskCoef || 1;	// from 1 to .05
		const hash = xxHash32(`${randomSeed}-${lineKey}-${player.id}`);
		const rnd = SeededRandom.randomFloat(hash);
		if (rnd > breakdownChance) return false; // line did not break
		this.linesWhoBrokeThisTurn.push(lineKey);
		return true; // line broke
	}
	getProductionLineEffect(lineName = 'energyFromChipsAndEngineers') { // TODO: MAKE A LOOP WITH ALL PRODUCTION LINES
		const lineIndex = this.activeProductionLines.indexOf(lineName);
		if (lineIndex === -1) return { inputs: {}, outputs: {} };

		const productionRate = this.productionRates[lineIndex] || 0;
		const mod = { inputCoef: 1, outputCoef: 1 };
		for (let i = 0; i < this.modulesLevel.length; i++) {
			if (this.modulesLevel[i] === 0) continue;
			const { inputCoef, outputCoef } = this.#getModuleInputOutputCoef(i) || {};
			mod.inputCoef *= inputCoef !== undefined ? inputCoef : 1;
			mod.outputCoef *= outputCoef !== undefined ? outputCoef : 1;
		}

		const lineModuleLevelIndex = this.getModuleIndex(lineName);
		const lineModuleLevel = this.modulesLevel[lineModuleLevelIndex] || 0;
		const lineBluePrintName = lineModuleLevel > 0 ? `${lineName}_${lineModuleLevel}` : lineName;
		const bluePrint = BLUEPRINT[lineBluePrintName]();
		const { inputs, outputs } = bluePrint;
		for (const r in bluePrint.inputs) // APPLY CONSO COEF
			inputs[r] = inputs[r] * productionRate * mod.inputCoef;

		for (const r in outputs) // APPLY EFFICIENCY/OVERLOAD COEF
			outputs[r] = outputs[r] * productionRate * mod.outputCoef;

		return { inputs, outputs, stopped: productionRate === 0 };
	}
	/** @param {'object' | 'array'} extractionMode @returns {object | Array<any>} */
	extract(extractionMode) { // FOR SENDING OVER THE NETWORK -> Lighter ARRAY
		if (extractionMode === 'object') {
			const sendable = {}; 	// TO OBJECT - SAFE
			for (const k in this)
				if (KEYS_TO_NOT_EXTRACT.has(k)) continue;
				else sendable[k] = this[k]?.extract ? this[k].extract() : this[k];
			return sendable;
		}

		const sendable = []; 		// TO ARRAY  - LIGHT
		for (const k in this)
			if (KEYS_TO_NOT_EXTRACT.has(k))
				continue;
			else sendable.push(this[k]?.extract ? this[k].extract() : this[k]);
		return sendable;
	}
}

// -------------------------------- TRADE HUB ---------------------------------
export class PrivateTradeOffer { 	// TYPE: MY PLAYER'S PRIVATE OFFER (INTENT)
	/** @type {string} */ resourceName;
	/** @type {number} */ amount;
	/** @type {string} */ requestedResourceName;
	/** @type {number} */ requestedAmount;
}
export class MyPublicTradeOffer { 	// TYPE: MY PLAYER'S OFFER (LOCAL)
	/** @type {string} */ 	resourceName; // amount is always 1
	/** @type {string} */ 	requestedResourceName;
	/** @type {number} */ 	requestedAmount;
	/** @type {number} */ 	minStock;
	/** @type {boolean} */ 	isActive;
}
export class PublicTradeOffer { 	// TYPE: REMOTE PLAYER'S OFFER (LOCAL)
	/** @type {string} */ 	playerId;
	/** @type {string} */ 	offerId;
	/** @type {string} */ 	resourceName;
	/** @type {string} */ 	requestedResourceName;
	/** @type {number} */ 	requestedAmount;
	/** @type {number} */ 	minStock;
	/** @type {boolean} */ 	isActive;
}
export class TakerOrder { 			// TYPE: TRADE REQUEST (INTENT)
	/** @type {string} */ soldResource;
	/** @type {number} */ soldAmount;
	/** @type {string} */ boughtResource;
	/** @type {number} */ maxPricePerUnit;
	/** @type {number} */ filledAmount;
	/** @type {number} */ expiry; // usually the next turn
}
export class TradeHub extends Building {
	type = 't'; // 'trade hub'
	
	/** @type {Array<0 | 1 | 2 | 3 | 4 | 5>} */
	modulesLevel = TRADE_HUB_MODULES.emptyModulesArray();
	/** key: targetPlayerId, value: [resourceName, amount, requestedResourceName, requestedAmount] @type {Record<string, [string, number, string, number]>} */
	privateOffers = {};
	/** [soldResource, soldAmount, boughtResource, maxPricePerUnit, filledAmount, expiry] @type {Array | null}*/
	takerOrder = null;
	/** key: playerId, value: [sentResource, minStock, tookResource, price] @type {Record<string, [string, number, string, number]>} */
	authorizedFills = {}; 			// (from intent) erased after each turn
	
	// NOT EXTRACTED ----------------------------
	turnThiefs = []; 				// FOR GAME LOGIC PURPOSES
	lastTakerOrderFullyFilled = false; // FOR UI PURPOSES
	offersExpiryDefault = 7; 		// in turns
	offersExpiryCounter = 0; 		// in turns
	maxAuthorizedFillsPerTurn = 5;
	publicOffersDispatchRequested = false;
	/** key: id(hash), value: [resourceName, requestedResourceName, requestedAmount, minStock, isActive] @type {Record<string, [string, string, number, number, boolean]>} */
	publicOffers = {}; 			 	// MY PLAYER ONLY
	/** key: requestedResourceName, key: offerId(hash), value: PublicTradeOffer @type {Record<string, Record<string, PublicTradeOffer>>} */
	publicOffersByResource = {}; 	// REMOTE PLAYERS ONLY
	/** key: playerId, value: [soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry] @type {Record<string, [string, number, string, number, number]>} */
	localFillIntents = {};
	// END NOT EXTRACTED ------------------------

	get getMaxConnections() { // DEFAULT 2
		const connectivityModuleIndex = this.getModuleIndex('connectivity');
		const { maxConnections } = TRADE_HUB_MODULES.getModuleEffect('connectivity', this.modulesLevel[connectivityModuleIndex]) || {};
		return maxConnections || 2;
	}
	get getMaxPublicOffers() { // DEFAULT 0
		const traderModuleIndex = this.getModuleIndex('trader');
		const { maxTradeOffer } = TRADE_HUB_MODULES.getModuleEffect('trader', this.modulesLevel[traderModuleIndex]) || {};
		return maxTradeOffer || 0;
	}
	get getMaxThefts() { // DEFAULT 0
		const thiefModuleIndex = this.getModuleIndex('thief');
		const { maxThefts } = TRADE_HUB_MODULES.getModuleEffect('thief', this.modulesLevel[thiefModuleIndex]) || {};
		return maxThefts || 0;
	}
	get getSignalRange() { // DEFAULT 1
		const brokerModuleIndex = this.getModuleIndex('broker');
		const { signalRange } = TRADE_HUB_MODULES.getModuleEffect('broker', this.modulesLevel[brokerModuleIndex]) || {};
		return signalRange || 1;
	}
	get getTheftSuccessRate() { // DEFAULT 10%
		const planificationModuleIndex = this.getModuleIndex('planification');
		const { theftSuccessRate } = TRADE_HUB_MODULES.getModuleEffect('planification', this.modulesLevel[planificationModuleIndex]) || {};
		return theftSuccessRate || .1;
	}
	get getTheftLossRate() { // DEFAULT 1 (100%)
		const protectionModuleIndex = this.getModuleIndex('protection');
		const { theftLossRate } = TRADE_HUB_MODULES.getModuleEffect('protection', this.modulesLevel[protectionModuleIndex]) || {};
		return theftLossRate || 1;
	}
	get hasHacker() { // DEFAULT false
		const hacker = this.getModuleIndex('hacker');
		return this.modulesLevel[hacker] > 0;
	}
	get getTaxRate() { // DEFAULT 30%
		const optimizerModuleIndex = this.getModuleIndex('optimizer');
		const { taxRate } = TRADE_HUB_MODULES.getModuleEffect('optimizer', this.modulesLevel[optimizerModuleIndex]) || {};
		return taxRate || .3;
	}
	/** @returns {TakerOrder | null} */
	get getTakerOrder() {
		if (!this.takerOrder) return null;
		const [soldResource, soldAmount, boughtResource, maxPricePerUnit, filledAmount, expiry] = this.takerOrder;
		return { soldResource, soldAmount, boughtResource, maxPricePerUnit, filledAmount, expiry };
	}
	getEnergyConsumption(consumptionBasis = .1) {
		return 0; // TODO: TRADE HUB DOES NOT CONSUME ENERGY FOR NOW (impossible to use publicOffers who are locales)
	}
	/** @param {string} resourceName @param {string} requestedResourceName @param {number} requestedAmount @param {number} minStock @param {boolean} isActive */
	#checkPublicOfferValueAndGetHash(resourceName, requestedResourceName, requestedAmount, minStock, isActive) {
		if (typeof isActive !== 'boolean') return;
		if (typeof minStock !== 'number' || minStock < 0) return;
		if (!this.#checkOfferValues(resourceName, 1, requestedResourceName, requestedAmount)) return;
		return TradeHub.getOfferHash(resourceName, 1, requestedResourceName, requestedAmount, minStock, isActive);
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
	/** @param {string} soldResource @param {number} soldAmount @param {string} boughtResource @param {number} maxPricePerUnit @param {number} expiry */
	#checkTakerOrderValues(soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry) {
		if (typeof soldResource !== 'string') return false;
		if (!VALID_RESOURCES.has(soldResource)) return false;
		if (typeof soldAmount !== 'number' || soldAmount <= 0) return false;
		if (typeof boughtResource !== 'string') return false;
		if (!VALID_RESOURCES.has(boughtResource)) return false;
		if (typeof maxPricePerUnit !== 'number' || maxPricePerUnit <= 0) return false;
		if (typeof expiry !== 'number' || expiry <= 0) return false;
		return true;
	}
	#getMyPublicOfferRelatedToResource(resourceName = '', requestedResourceName = '') {
		for (const offerId in this.publicOffers) {
			const offer = this.publicOffers[offerId];
			if (offer[0] !== requestedResourceName || offer[1] !== resourceName) continue;
			return offer;
		}
		return null;
	}
	/** @param {string} resourceName @param {number} amount @param {string} requestedResourceName @param {number} requestedAmount @param {number} minStock @param {boolean} isActive */
	static getOfferHash(resourceName, amount, requestedResourceName, requestedAmount, minStock = 0, isActive = false) {
		return xxHash32(`${resourceName}-${amount}-${requestedResourceName}-${requestedAmount}-${minStock}-${isActive}`).toString(16);
	}
	/** @returns {MyPublicTradeOffer | null} */
	getPublicTradeOffer(offerId = '') {
		if (!this.publicOffers[offerId]) return null;
		const [resourceName, requestedResourceName, requestedAmount, minStock, isActive] = this.publicOffers[offerId];
		return { resourceName, requestedResourceName, requestedAmount, minStock, isActive };
	}
	/** @returns {PrivateTradeOffer | null} */
	getPrivateTradeOffer(targetPlayerId = '') {
		if (!this.privateOffers[targetPlayerId]) return null;
		const [resourceName, amount, requestedResourceName, requestedAmount] = this.privateOffers[targetPlayerId];
		return { resourceName, amount, requestedResourceName, requestedAmount };
	}
	/** @param {string} resourceName @param {string} requestedResourceName @param {number} requestedAmount @param {number} minStock @param {boolean} isActive */
	setMyPublicTradeOffer(resourceName, requestedResourceName, requestedAmount, minStock, isActive) {
		const id = this.#checkPublicOfferValueAndGetHash(resourceName, requestedResourceName, requestedAmount, minStock, isActive);
		if (!id || this.publicOffers[id]) return; // offer already exists

		// REMOVE OFFER OF THE SAME RESOURCES IF ANY
		for (const offerId in this.publicOffers)
			if (this.publicOffers[offerId][0] !== resourceName) continue;
			else if (this.publicOffers[offerId][1] !== requestedResourceName) continue;
			else delete this.publicOffers[offerId];
		
		this.publicOffers[id] = [resourceName, requestedResourceName, requestedAmount, minStock, isActive];
		this.publicOffersDispatchRequested = true;

		return id;
	}
	/** @param {string} playerId @param {Record<string, MyPublicTradeOffer>} offersData @param {number} expiry */
	handleIncomingPublicOffers(playerId, offersData, expiry) {
		this.publicOffersByResource = {}; // RESET ALL OFFERS
		for (const offerId in offersData) {
			const offer = offersData[offerId];
			if (!offer) continue;

			const [resourceName, requestedResourceName, requestedAmount, minStock, isActive] = offer;
			const hash = this.#checkPublicOfferValueAndGetHash(resourceName, requestedResourceName, requestedAmount, minStock, isActive);
			if (offerId !== hash) return; // invalid offer

			if (!this.publicOffersByResource[requestedResourceName]) this.publicOffersByResource[requestedResourceName] = {};
			this.publicOffersByResource[requestedResourceName][offerId] = { playerId, offerId, resourceName, requestedResourceName, requestedAmount, minStock, isActive };
		}
		this.offersExpiryCounter = expiry;
	}
	/** @param {string} playerId @param {string} soldResource @param {number} soldAmount @param {string} boughtResource @param {number} maxPricePerUnit @param {number} expiry */
	handleTakerOrderIntent(playerId, soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry) {
		if (this.localFillIntents[playerId]) return; // already has an intent for this player
		if (!this.#checkTakerOrderValues(soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry)) return;
	
		this.localFillIntents[playerId] = [soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry];
	}
	/** @param {string} targetPlayerId @param {string} resourceName @param {number} amount @param {string} requestedResourceName @param {number} requestedAmount */
	setPrivateTradeOffer(targetPlayerId, resourceName, amount, requestedResourceName, requestedAmount) {
		if (typeof targetPlayerId !== 'string') return;
		if (!this.#checkOfferValues(resourceName, amount, requestedResourceName, requestedAmount)) return;
		this.privateOffers[targetPlayerId] = [resourceName, amount, requestedResourceName, requestedAmount];
	}
	/** @param {string} soldResource @param {number} soldAmount @param {string} boughtResource @param {number} maxPricePerUnit @param {number} expiry */
	setTakerOrder(soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry) {
		if (!this.#checkTakerOrderValues(soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry)) return;
		this.takerOrder = [soldResource, soldAmount, boughtResource, maxPricePerUnit, 0, expiry];
		return true;
	}
	countFillOfTakerOrder(amountFilled = 0) {
		if (!this.takerOrder || !amountFilled) return;
		this.takerOrder[4] += amountFilled;
		if (this.takerOrder[4] < this.takerOrder[1]) return; // not fully filled yet
		this.takerOrder = null; // fully filled
		this.lastTakerOrderFullyFilled = true;
	}
	/** @param {string} targetPlayerId */
	cancelPrivateTradeOffer(targetPlayerId) {
		delete this.privateOffers[targetPlayerId];
	}
	/** @param {string} offerId */
	cancelPublicTradeOffer(offerId) {
		const r = this.publicOffers[offerId]?.[0];
		if (r && this.publicOffersByResource[r]) delete this.publicOffersByResource[r][offerId];
		delete this.publicOffers[offerId];
		this.publicOffersDispatchRequested = true;
	}
	cancelAllPublicTradeOffers() {
		this.publicOffers = {};
		this.publicOffersByResource = {};
		this.publicOffersDispatchRequested = true;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {boolean} [isMyNode] */
	turnUpdate(gameClient, isMyNode = false) {
		// IF IS_MY_NODE: DISPATCH BEFORE EXPIRY
		this.offersExpiryCounter--;
		if (isMyNode && this.offersExpiryCounter <= 1)
			if (Object.keys(this.publicOffers).length > 0)
				this.publicOffersDispatchRequested = true;

		// IF NOT MY NODE: EXPIRE OFFERS AFTER COUNTER
		if (!isMyNode && this.offersExpiryCounter <= 0)
			this.cancelAllPublicTradeOffers();

		// EXPIRE TAKER ORDER IF NEEDED
		if (this.takerOrder && this.takerOrder[5] <= gameClient.height) {
			this.takerOrder = null;
			this.lastTakerOrderFullyFilled = false;
		}

		// RESET OFFERS EXPIRY COUNTER IF NEEDED
		if (this.offersExpiryCounter <= 0)
			this.offersExpiryCounter = this.offersExpiryDefault;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} pid */
	#authorizeFillIfOfferMatchOrder(gameClient, pid) {
		const order = this.localFillIntents[pid] || gameClient.players[pid]?.tradeHub?.takerOrder;
		if (!order) return;

		const [soldResource, soldAmount, boughtResource, maxPricePerUnit] = order;
		const relatedOffer = this.#getMyPublicOfferRelatedToResource(soldResource, boughtResource);
		const isActive = relatedOffer ? relatedOffer[4] : false;
		if (!relatedOffer || !isActive) return; // no offer to fill this order (or inactive)

		const remoteStock = gameClient.players[pid].inventory.getAmount(soldResource);
		if (remoteStock <= 0) return; // remote player has no stock
		
		const myPrice = relatedOffer[2] / 1; // requestedAmount / amount
		if (myPrice > maxPricePerUnit) return; // price too high

		// IF WE ARE HERE > AUTHORIZE FILL > REGISTER IT WITH MIN_STOCK AND PRICE=MAX_ACCEPTED
		const minStock = relatedOffer[3]; // minStock
		return [boughtResource, minStock, soldResource, maxPricePerUnit];
	}
	/** @param {import('./game.mjs').GameClient} gameClient */
	prepareAuthorizedFill(gameClient) {
		// FOR NOW WE GO BLIND, SHOULD BE IMPROVED TO OPTIMIZE SALES and avoid abuse
		let authorizedFillCount = 0;
		let treatedPids = new Set();
		const authorizedFills = {};

		// WE FIRST TRY TO FILL ORDERS THAT ARE LOCALLY KNOWN (pre-shot by directMessage)
		for (const pid in this.localFillIntents) {
			const [soldResource, soldAmount, boughtResource, maxPricePerUnit, expiry] = this.localFillIntents[pid];
			if (expiry < gameClient.height) { delete this.localFillIntents[pid]; continue; }

			// IF ORDER IS KNOWN FROM ALL PEERS > ABORT > TREATED BEHIND
			const [sR, sA, bR, mPPU, f, e] = gameClient.players[pid].tradeHub.takerOrder || [];
			if (sR === soldResource && sA === soldAmount && bR === boughtResource && mPPU === maxPricePerUnit && e === expiry)
				continue;

			treatedPids.add(pid);
			const authorizedFill = this.#authorizeFillIfOfferMatchOrder(gameClient, pid);
			if (!authorizedFill) continue;
			authorizedFills[pid] = authorizedFill;
			authorizedFillCount++;
			if (authorizedFillCount >= this.maxAuthorizedFillsPerTurn) break;
		}

		// CLEAR LOCAL INTENTS > THEY WILL BE KNOWN FROM ALL PEERS NEXT TURN
		this.localFillIntents = {};

		// THEN WE CAN SEARCH TO FILL ANY OTHER PLAYERS' ORDERS
		for (const pid in gameClient.players) {
			if (treatedPids.has(pid)) continue; // ALREADY TREATED

			const authorizedFill = this.#authorizeFillIfOfferMatchOrder(gameClient, pid);
			if (!authorizedFill) continue;
			authorizedFills[pid] = authorizedFill;
			authorizedFillCount++;
			if (authorizedFillCount >= this.maxAuthorizedFillsPerTurn) break;
		}

		return { fills: authorizedFills, count: authorizedFillCount };
	}
}

// --------------------------------- REACTOR ----------------------------------
export class Reactor extends Building {
	type = 'r'; // 'reactor'

	/** @type {Array<0 | .25 | .5 | .75 | 1>} */
	productionRates = [1];
	activeProductionLines = ['energyFromChipsAndEngineers'];
	modulesLevel = REACTOR_MODULES.emptyModulesArray();

	get getEnergyPerRawResource() { // default : 0
		const efficiencyModuleIndex = this.getModuleIndex('efficiency');
		const { energyPerRawResource } = REACTOR_MODULES.getModuleEffect('efficiency', this.modulesLevel[efficiencyModuleIndex]) || {};
		return energyPerRawResource || 0;
	}
	get getBreakdownRiskCoef() { // default : 1
		const efficiencyModuleIndex = this.getModuleIndex('efficiency');
		const { breakdownRiskCoef } = REACTOR_MODULES.getModuleEffect('efficiency', this.modulesLevel[efficiencyModuleIndex]) || {};
		return breakdownRiskCoef || 1;
	}
	getEnergyConsumption(consumptionPerProdLine = .5) { // default : 0.5 energy per production line
		for (let i = 0; i < this.activeProductionLines.length; i++) {
			if (!this.linesWhoProducedThisTurn.includes(this.activeProductionLines[i])) continue;
			const productionRate = this.productionRates[i] || 0;
			return productionRate * consumptionPerProdLine;
		}
	}
	createModuleUpgradeAssociateProductionline(currentLevel = 0, moduleKey = '', randomSeed = '') {
		// CHECK IF WE NEED TO ADD A NEW PRODUCTION LINE
		if (currentLevel > 0 || BLUEPRINT[`${moduleKey}_1`] === undefined) return;
		this.activeProductionLines.push(moduleKey);
		this.productionRates.push(1); // default rate
	}
}

// -------------------------------- FABRICATOR --------------------------------
export class Fabricator extends Building {
	type = 'f'; // 'fabricator'
	/** @type {Array<0 | .25 | .5 | .75 | 1>} */
	productionRates = [];
	/** @type {string[]} */
	activeProductionLines = [];
	modulesLevel = FABRICATOR_MODULES.emptyModulesArray();

	getEnergyConsumption(consumptionPerProdLine = .5) { // default : 0.5 energy per production line
		for (let i = 0; i < this.activeProductionLines.length; i++) {
			if (!this.linesWhoProducedThisTurn.includes(this.activeProductionLines[i])) continue;
			const productionRate = this.productionRates[i] || 0;
			return productionRate * consumptionPerProdLine;
		}
	}
	createModuleUpgradeAssociateProductionline(currentLevel = 0, moduleKey = '', randomSeed = '') {
		// CHECK IF WE NEED TO ADD A NEW PRODUCTION LINE
		if (currentLevel === 0 && BLUEPRINT[`${moduleKey}_1`] !== undefined) {
			this.activeProductionLines.push(moduleKey);
			this.productionRates.push(1); // default rate
		}
		
		const { productTier } = FABRICATOR_MODULES.getModuleEffect(moduleKey, currentLevel + 1) || {};
		if (!productTier) return;
		
		const newLineResourceName = this.#getUnusedProductionLineResourceName(productTier, randomSeed);
		if (BLUEPRINT[newLineResourceName] === undefined) return;
		this.activeProductionLines.push(newLineResourceName);
		this.productionRates.push(1); // default rate
	}
	/** @param {'2' | '3' | '4' | '5'} productTier @param {string} randomSeed */
	#getUnusedProductionLineResourceName(productTier, randomSeed) {
		const basicResourcesSet = newResourcesSet()[productTier];
		const resourceNames = Object.keys(basicResourcesSet);
		const unproductedResouces = resourceNames.filter(rn => this.activeProductionLines.indexOf(rn) === -1);
		if (unproductedResouces.length === 0) return null;
		if (unproductedResouces.length === 1) return unproductedResouces[0];
		return SeededRandom.pickOne(unproductedResouces, randomSeed);
	}
}