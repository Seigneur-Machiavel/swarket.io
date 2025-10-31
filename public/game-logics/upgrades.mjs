import { SeededRandom } from './consensus.mjs';
import { RAW_RESOURCES, RAW_RESOURCES_PROD_BASIS } from './resources.mjs';
import { Reactor, Fabricator, TradeHub } from './buildings.mjs';

/**
 * @typedef {Object} Requirement
 * @property {Object<string, number>} [upgrades] Upgrades requirements
 * @property {Object<string, number>} [playerStats] Player stats requirements (ex: lifetime)
 */


// When adding a new upgrade => also update UpgradeSet
/** @type {Object<string, {maxLevel: number, requirement?: Requirement, tooltip: string, subClass?: string}>} */
const upgradesInfo = {
	producer: { maxLevel: 10, tooltip: 'Increases the production rate of your raw resources by 25%' },
	multiProducer: { maxLevel: 3, requirement: { upgrades: { producer: 5 } }, tooltip: 'Add a random raw resource production' },
	energyDrop: { maxLevel: Infinity, tooltip: 'Instantly refills energy to maximum' },
	cleaner: { maxLevel: 5, tooltip: 'Increases the resources recycled by 10%' },
	maxEnergy: { maxLevel: 5, tooltip: 'Maximum energy x2' },

	// AUTOMATISATION
	autoCleaner: { maxLevel: 1, requirement: { upgrades: { cleaner: 5 } }, tooltip: 'Automatically select a random node to recycle' },

	// BUILDINGS CONSTRUCTION
	buildTradeHub: { maxLevel: 1, tooltip: 'Build a TradeHub to increase connectivity' },
	buildReactor: { maxLevel: 1, tooltip: 'Build a Reactor to produce energy' },
	buildFabricator: { maxLevel: 1, tooltip: 'Build a Fabricator to produce high tier resources' },
	
	// BUILDINGS UPGRADE
	tradeHub: { maxLevel: 25, requirement: { upgrades: { buildTradeHub: 1 } }, tooltip: 'Give module point to trade-hub', subClass: 'levelUp' },
	reactor: { maxLevel: 20, requirement: { upgrades: { buildReactor: 1 } }, tooltip: 'Give module point to reactor', subClass: 'levelUp' },
	fabricator: { maxLevel: 20, requirement: { upgrades: { buildFabricator: 1 } }, tooltip: 'Give module point to fabricator', subClass: 'levelUp' },
}
export class UpgradeSet {
	producer = 0;
	multiProducer = 0;
	energyDrop = 0;
	cleaner = 0;
	maxEnergy = 0;

	// AUTOMATISATION
	autoCleaner = 0;

	// BUILDINGS
	buildReactor = 0;
	buildFabricator = 0;
	buildTradeHub = 0;
	reactor = 0;
	fabricator = 0;
	tradeHub = 0;
}

/** The triggers to release upgrades offer */
const UPGRADE_TRIGGERS = new Set([ 					// upgrades 7 per lines, based on lifetime
	5, 30, 60, 90, 120, 150, 180, 					// every 30sec  - 3min 		- 7upgrades
	240, 300, 360, 420, 480, 540, 600,				// every 60sec	- 10min		- 14upgrades
	690, 780, 870, 960, 1050, 1140, 1230,			// every 90sec	- 20min 	- 21upgrades
	1350, 1470, 1590, 1710, 1830, 1950, 2070,		// every 120sec	- 34min		- 28upgrades
	2250, 2430, 2610, 2790, 2970, 3150, 3330,		// every 180sec	- 55min		- 35upgrades
	3630, 3930, 4230, 4530, 4830, 5130, 5430,		// every 300sec	- 90min		- 42upgrades
	6030, 6630, 7230, 7830, 8430, 9030, 9630,		// every 600sec	- 160min	- 49upgrades
	10350, 11070, 11790, 12510, 13230, 13950, 14670	// every 720sec	- 244min	- 56upgrades
]);
const upgradeNames = Object.keys(upgradesInfo);
export class UpgradesTool {
	/** @param {UpgradeSet} upgradeSet @param {string} upgradeName */
	static isMaxedUpgrade(upgradeSet, upgradeName) {
		if (!upgradesInfo[upgradeName] || typeof upgradeSet[upgradeName] !== 'number') return true;
		return upgradeSet[upgradeName] >= upgradesInfo[upgradeName].maxLevel;
	}
	static getUpgradeTooltipText(upgradeName = 'tradeHub') {
		if (!upgradesInfo[upgradeName]) return { tooltip: 'Unknown upgrade', subClass: undefined };
		const { tooltip, subClass } = upgradesInfo[upgradeName];
		return { tooltip, subClass };
	}
} 

export class Upgrader {
	static shouldUpgrade(nodeLifetime = 0) { return UPGRADE_TRIGGERS.has(nodeLifetime); }

	/** @param {import('./player.mjs').PlayerNode} player @param {string} id @param {number} count default: 3 */
	static getRandomUpgradeOffer(player, id, count = 3) {
		// IF NO TRADE-HUB: FIRST UPGRADE MUST BE A TRADE-HUB ?
		if (!player.tradeHub && player.upgradeOffers.length === 0)
			return ['buildTradeHub', 'buildTradeHub', 'buildTradeHub'];

		/** @type {string[]} */
		const offers = [];
		for (let i = 0; i < 100; i++) { // unique types only
			const u = SeededRandom.pickOne(upgradeNames, `${id}-hive-${i * 64}`);
			if (offers.includes(u)) continue;
			if (!Upgrader.#canApplyUpgrade(player, u)) continue;

			offers.push(u);
			if (offers.length >= count) break;
		}

		return offers;
	}
	static #canApplyUpgrade(player, upgradeName) {
		// GENERIC CHECKS
		if (UpgradesTool.isMaxedUpgrade(player.upgradeSet, upgradeName)) return false;
		const { requirement: r } = upgradesInfo[upgradeName];
		for (const ps in r?.playerStats || {})
			if (player[ps] === undefined || player[ps] < r.playerStats[ps]) return false;
		for (const ru in r?.upgrades || {})
			if (!player.upgradeSet[ru] || player.upgradeSet[ru] < r.upgrades[ru]) return false;

		// SPECIFIC CHECKS
		if (upgradeName === 'buildReactor' && player.reactor) return false;
		if (upgradeName === 'buildFabricator' && player.fabricator) return false;
		if (upgradeName === 'buildTradeHub' && player.tradeHub) return false;
		if (upgradeName === 'reactor' && !player.reactor) return false;
		if (upgradeName === 'fabricator' && !player.fabricator) return false;
		if (upgradeName === 'tradeHub' && !player.tradeHub) return false;
		if (upgradeName === 'multiProducer')
			for (const res of RAW_RESOURCES)
				if (player.rawProductions[res] === 0) continue;
				else if (player.rawProductions[res] === undefined) return false;
				else return false;

		return true;
	}
	/** @param {import('./player.mjs').PlayerNode} player @param {string} upgradeName @param {string} randomSeed */
	static applyUpgradeEffects(player, upgradeName, randomSeed) {
		if (!player.getEnergy) return;
		switch (upgradeName) {
			case 'multiProducer':
				for (let i = 0; i < 100; i++) { // try up to 100 times to find a new resource
					const r = SeededRandom.pickOne(RAW_RESOURCES, randomSeed + `-multi-prod-${i}`);
					if (player.rawProductions[r] || !RAW_RESOURCES_PROD_BASIS[r]) continue;
					player.rawProductions[r] = RAW_RESOURCES_PROD_BASIS[r];
					return true;
				}
				console.error('Failed to add multiProducer upgrade: no available resource found');
				break;
			case 'buildReactor':
				if (!player.reactor) player.reactor = new Reactor();
				break;
			case 'buildFabricator':
				if (!player.fabricator) player.fabricator = new Fabricator();
				break;
			case 'buildTradeHub':
				if (!player.tradeHub) player.tradeHub = new TradeHub();
				break;
			case 'reactor':
				if (player.reactor) player.reactor.upgradePoints += 1;
				break;
			case 'fabricator':
				if (player.fabricator) player.fabricator.upgradePoints += 1;
				break;
			case 'tradeHub':
				if (player.tradeHub) player.tradeHub.upgradePoints += 1;
				break;
			case 'energyDrop':
				player.inventory.addAmount('energy', player.maxEnergy, player.maxEnergy);
				break;
			case 'maxEnergy':
				const max = player.maxEnergy;
				player.maxEnergy += max; // x2
				player.inventory.addAmount('energy', max); // add the difference
				break;
		}
	}
}