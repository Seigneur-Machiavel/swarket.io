import { text } from '../language.mjs';
import { SeededRandom } from './consensus.mjs';
import { RAW_RESOURCES, RAW_RESOURCES_PROD_BASIS } from './resources.mjs';
import { Reactor, Fabricator, TradeHub } from './buildings.mjs';

/**
 * @typedef {Object} Requirement
 * @property {Object<string, number>} [upgrades] Upgrades requirements
 * @property {Object<string, number>} [playerStats] Player stats requirements (ex: lifetime)
 */

// When adding a new upgrade => also update UpgradeSet
/** @type {Object<string, {maxLevel: number, requirement?: Requirement, rarity: string, subClass?: string}>} */
const upgradesInfo = {
	producer: { maxLevel: 10, rarity: 'common' },
	multiProducer: { maxLevel: 3, requirement: { upgrades: { producer: 5 }, rarity: 'rare' } },
	energyDrop: { maxLevel: Infinity, rarity: 'common' },
	cleaner: { maxLevel: 5, rarity: 'common' },
	maxEnergy: { maxLevel: 5, rarity: 'rare' },

	// AUTOMATISATION
	autoCleaner: { maxLevel: 1, requirement: { upgrades: { cleaner: 5 }, rarity: 'uncommon' } },

	// BUILDINGS CONSTRUCTION
	buildTradeHub: { maxLevel: 1, rarity: 'common' },
	buildReactor: { maxLevel: 1, rarity: 'common' },
	buildFabricator: { maxLevel: 1, rarity: 'common' },

	// BUILDINGS UPGRADE
	tradeHub: { maxLevel: 25, requirement: { upgrades: { buildTradeHub: 1 } }, subClass: 'levelUp', rarity: 'common' },
	reactor: { maxLevel: 20, requirement: { upgrades: { buildReactor: 1 } }, subClass: 'levelUp', rarity: 'common' },
	fabricator: { maxLevel: 20, requirement: { upgrades: { buildFabricator: 1 } }, subClass: 'levelUp', rarity: 'common' },
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
/*const UPGRADE_TRIGGERS = new Set([ 					// upgrades 7 per lines, based on lifetime
	5, 30, 60, 90, 120, 150, 180, 					// every 30sec  - 3min 		- 7upgrades
	240, 300, 360, 420, 480, 540, 600,				// every 60sec	- 10min		- 14upgrades
	690, 780, 870, 960, 1050, 1140, 1230,			// every 90sec	- 20min 	- 21upgrades
	1350, 1470, 1590, 1710, 1830, 1950, 2070,		// every 120sec	- 34min		- 28upgrades
	2250, 2430, 2610, 2790, 2970, 3150, 3330,		// every 180sec	- 55min		- 35upgrades
	3630, 3930, 4230, 4530, 4830, 5130, 5430,		// every 300sec	- 90min		- 42upgrades
	6030, 6630, 7230, 7830, 8430, 9030, 9630,		// every 600sec	- 160min	- 49upgrades
	10350, 11070, 11790, 12510, 13230, 13950, 14670	// every 720sec	- 244min	- 56upgrades
]);*/
const UPGRADE_TRIGGERS = new Set([ 					// upgrades 7 per lines, based on lifetime
	5, 60, 120, 180, 240, 300, 360, 				// every 60sec	- 6min 		- 7upgrades
	420, 480, 540, 600, 660, 720, 780,				// every 60sec	- 13min		- 14upgrades
	840, 900, 960, 1020, 1080, 1140, 1200,			// every 60sec	- 20min 	- 21upgrades
	1260, 1320, 1380, 1440, 1500, 1560, 1620,		// every 60sec	- 27min		- 28upgrades
	1680, 1740, 1800, 1860, 1920, 1980, 2040,		// every 60sec	- 34min		- 35upgrades
	2160, 2280, 2400, 2520, 2640, 2760, 2880,		// every 120sec	- 48min		- 42upgrades
	3000, 3120, 3240, 3360, 3480, 3600, 3720,		// every 120sec	- 62min		- 49upgrades
	3840, 3960, 4080, 4200, 4320, 4440, 4560,		// every 120sec	- 76min		- 56upgrades
	4680, 4800, 4920, 5040, 5160, 5280, 5400,		// every 120sec	- 90min		- 63upgrades
	5520, 5640, 5760, 5880, 6000, 6120, 6240,		// every 120sec	- 104min	- 70upgrades
	6360, 6480, 6600, 6720, 6840, 6960, 7080,		// every 120sec	- 118min	- 77upgrades
	7200 											// every 120sec	- 120min	- 78upgrades
]);

const upgradeNames = Object.keys(upgradesInfo);
const rarityScores = { common: 1, uncommon: .5, rare: .3, epic: .15, legendary: .07 };
export class UpgradesTool {
	/** @param {UpgradeSet} upgradeSet @param {string} upgradeName */
	static isMaxedUpgrade(upgradeSet, upgradeName) {
		if (!upgradesInfo[upgradeName] || typeof upgradeSet[upgradeName] !== 'number') return true;
		return upgradeSet[upgradeName] >= upgradesInfo[upgradeName].maxLevel;
	}
	static getUpgradeTooltipText(upgradeName = 'tradeHub') {
		if (!upgradesInfo[upgradeName]) return { tooltip: text('unknownUpgradeTooltip'), subClass: undefined };
		const { subClass, rarity } = upgradesInfo[upgradeName];
		const tooltip = text(`${upgradeName}Tooltip`);
		return { tooltip, subClass, rarity };
	}
} 

export class Upgrader {
	static shouldUpgrade(nodeLifetime = 0) { return UPGRADE_TRIGGERS.has(nodeLifetime); }

	/** @param {import('./player.mjs').PlayerNode} player @param {string} offerSeed @param {number} count default: 3 */
	static getRandomUpgradeOffer(player, offerSeed, count = 3) {
		// IF NO TRADE-HUB: FIRST UPGRADE MUST BE A TRADE-HUB ?
		if (!player.tradeHub && player.upgradeOffers.length === 0)
			return ['buildTradeHub', 'buildTradeHub', 'buildTradeHub'];

		/** @type {string[]} */
		const offers = [];
		for (let i = 0; i < 1000; i++) { // unique types only
			const u = SeededRandom.pickOne(upgradeNames, `${offerSeed}-hive-${i * 64}`);
			if (offers.includes(u)) continue;
			if (!Upgrader.#canApplyUpgrade(player, u)) continue;
			const { rarity } = upgradesInfo[u];
			const minScore = rarityScores[rarity] || 1;
			const rnd = SeededRandom.randomFloat(`${offerSeed}-chance-${i * 128}`);
			if (rnd > minScore) continue; // rarity check
			
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
		let consoleText = null;
		if (!player.getEnergy) return;
		switch (upgradeName) {
			case 'multiProducer':
				for (let i = 0; i < 100; i++) { // try up to 100 times to find a new resource
					const r = SeededRandom.pickOne(RAW_RESOURCES, randomSeed + `-multi-prod-${i}`);
					if (player.rawProductions[r] || !RAW_RESOURCES_PROD_BASIS[r]) continue;
					player.rawProductions[r] = RAW_RESOURCES_PROD_BASIS[r];
					consoleText = `${text('multiProducerUpgradeFeedback')} ${r}`;
					return true;
				}
				console.error('Failed to add multiProducer upgrade: no available resource found');
				break;
			case 'buildReactor':
				if (player.reactor) return;
				player.reactor = new Reactor();
				consoleText = text('buildReactorUpgradeFeedback');
				break;
			case 'buildFabricator':
				if (player.fabricator) return;
				player.fabricator = new Fabricator();
				consoleText = text('buildFabricatorUpgradeFeedback');
				break;
			case 'buildTradeHub':
				if (player.tradeHub) return;
				player.tradeHub = new TradeHub();
				consoleText = text('buildTradeHubUpgradeFeedback');
				break;
			case 'reactor':
				if (!player.reactor) return;
				player.reactor.upgradePoints += 1;
				consoleText = text('reactorUpgradeFeedback');
				break;
			case 'fabricator':
				if (!player.fabricator) return;
				player.fabricator.upgradePoints += 1;
				consoleText = text('fabricatorUpgradeFeedback');
				break;
			case 'tradeHub':
				if (!player.tradeHub) return;
				player.tradeHub.upgradePoints += 1;
				consoleText = text('tradeHubUpgradeFeedback');
				break;
			case 'energyDrop':
				player.inventory.addAmount('energy', player.maxEnergy, player.maxEnergy);
				consoleText = text('energyDropUpgradeFeedback');
				break;
			case 'maxEnergy':
				const max = player.maxEnergy;
				player.maxEnergy += max; // x2
				player.inventory.addAmount('energy', max); // add the difference
				consoleText = `${text('maxEnergyUpgradeFeedback')} ${player.maxEnergy}`;
				break;
		}

		return consoleText;
	}
}