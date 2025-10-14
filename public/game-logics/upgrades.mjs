import { SeededRandom } from './seededRandom.mjs';
import { Reactor, Fabricator, Linker } from './buildings.mjs';

/**
 * @typedef {Object} Requirement
 * @property {Object<string, number>} [upgrades] Upgrades requirements
 * @property {Object<string, number>} [playerStats] Player stats requirements (ex: lifetime)
 */


// When adding a new upgrade => also update UpgradeSet
/** @type {Object<string, {maxLevel: number, requirement?: Requirement, tooltip: string, subClass?: string}>} */
const upgradesInfo = {
	producer: { maxLevel: 10, tooltip: 'Increases the production rate of your resources by 25%' },
	energyDrop: { maxLevel: Infinity, tooltip: 'Instantly refills energy to maximum' },
	cleaner: { maxLevel: 5, tooltip: 'Increases the resources recycled by 10%' },
	autoCleaner: { maxLevel: 1, requirement: { upgrades: { cleaner: 5 } }, tooltip: 'Automatically select a random node to recycle' },

	// BUILDINGS CONSTRUCTION
	buildReactor: { maxLevel: 1, tooltip: 'Build a Reactor to produce energy' },
	buildFabricator: { maxLevel: 1, tooltip: 'Build a Fabricator to produce high tier resources' },
	buildLinker: { maxLevel: 1, tooltip: 'Build a Linker to increase connectivity' },
	
	// BUILDINGS UPGRADE
	reactor: { maxLevel: 10, requirement: { upgrades: { buildReactor: 1 } }, tooltip: 'Give upgrade point to reactor', subClass: 'levelUp' },
	fabricator: { maxLevel: 10, requirement: { upgrades: { buildFabricator: 1 } }, tooltip: 'Give upgrade point to fabricator', subClass: 'levelUp' },
	linker: { maxLevel: 10, requirement: { upgrades: { buildLinker: 1 } }, tooltip: 'Give upgrade point to linker', subClass: 'levelUp' },

}
export class UpgradeSet {
	producer = { level: 0 };
	energyDrop = { level: 0 };
	cleaner = { level: 0 };
	autoCleaner = { level: 0 };

	// BUILDINGS
	buildReactor = { level: 0 };
	buildFabricator = { level: 0 };
	buildLinker = { level: 0 };
	reactor = { level: 0 };
	fabricator = { level: 0 };
	linker = { level: 0 };
}

/** The triggers to release upgrades offer */
const upgradeTriggersLifetime = new Set([5, 50, 100, 200, 300, 450, 600, 800, 1000]);
const upgradeNames = Object.keys(upgradesInfo);
export class UpgradesTool {
	/** @param {UpgradeSet} upgradeSet @param {string} upgradeName */
	static isMaxedUpgrade(upgradeSet, upgradeName) {
		if (!upgradesInfo[upgradeName] || !upgradeSet[upgradeName]) return true;
		return upgradeSet[upgradeName].level >= upgradesInfo[upgradeName].maxLevel;
	}
	static getUpgradeTooltipText(upgradeName = 'linker') {
		if (!upgradesInfo[upgradeName]) return { tooltip: 'Unknown upgrade', subClass: undefined };
		const { tooltip, subClass } = upgradesInfo[upgradeName];
		return { tooltip, subClass };
	}
} 

export class Upgrader {
	static shouldUpgrade(nodeLifetime = 0) { return upgradeTriggersLifetime.has(nodeLifetime); }

	/** @param {import('./player.mjs').PlayerNode} player @param {string} id @param {number} count default: 3 */
	static getRandomUpgradeOffer(player, id, count = 3) {
		if (!player.linker) return ['buildLinker', 'buildLinker', 'buildLinker']; // first upgrade must be linker

		/** @type {string[]} */
		const offers = [];
		for (let i = 0; i < 10_000; i++) { // unique types only
			const u = SeededRandom.pickOne(upgradeNames, `${id}-hive-${i * 64}`);
			const { requirement, maxLevel } = upgradesInfo[u];
			if (UpgradesTool.isMaxedUpgrade(player.upgradeSet, u)) continue;
			for (const ps in requirement?.playerStats || {})
				if (player[ps] === undefined || player[ps] < requirement.playerStats[ps]) continue;
			for (const ru in requirement?.upgrades || {})
				if (!player.upgradeSet[ru] || player.upgradeSet[ru].level < requirement.upgrades[ru]) continue;

			offers.push(u);
			if (offers.length >= count) break;
		}
		return offers;
	}
	/** @param {import('./player.mjs').PlayerNode} player @param {string} upgradeName */
	static applyUpgradeEffects(player, upgradeName) {
		if (!player.energy) return;
		switch (upgradeName) {
			case 'buildReactor':
				if (!player.reactor) player.reactor = new Reactor();
				break;
			case 'buildFabricator':
				if (!player.fabricator) player.fabricator = new Fabricator();
				break;
			case 'buildLinker':
				if (!player.linker) player.linker = new Linker();
				break;
			case 'energyDrop':
				player.energy = player.maxEnergy;
				break;
		}
	}
}