import { SeededRandom } from './seededRandom.mjs';
import { Reactor, Fabricator, Linker } from './buildings.mjs';

// When adding a new upgrade => also update UpgradeSet
const upgradesInfo = {
	/** Number of node connection permitted (excluding bootstrap nodes) */
	//linker: { maxLevel: 10, tooltip: 'Increases the connectivity of your nodes by 1' },
	/** Multiplier to production rate of operating resource */
	producer: { maxLevel: 10, tooltip: 'Increases the production rate of your resources by 40%' },
	/** One-shot energy refill -> To MaxEnergy */
	energyDrop: { maxLevel: Infinity, tooltip: 'Instantly refills energy to maximum' },
	/** Recycling efficiency => maxed = auto recycle */
	cleaner: { maxLevel: 5, tooltip: 'Increases the resources recycled by 10%' },

	// BUILDINGS UPGRADE
	buildReactor: { maxLevel: 1, tooltip: 'Build a Reactor to produce energy' },
	reactor: { maxLevel: 10, required: 'buildReactor', tooltip: 'Give upgrade point to reactor' },

	buildFabricator: { maxLevel: 1, tooltip: 'Build a Fabricator to produce high tier resources' },
	fabricator: { maxLevel: 10, required: 'buildFabricator', tooltip: 'Give upgrade point to fabricator' },

	buildLinker: { maxLevel: 1, tooltip: 'Build a Linker to increase connectivity' },
	linker: { maxLevel: 10, required: 'buildLinker', tooltip: 'Give upgrade point to linker' },
}
export class UpgradeSet {
	producer = { level: 0 };
	energyDrop = { level: 0 };
	cleaner = { level: 0 };

	// BUILDINGS
	buildReactor = { level: 0 };
	reactor = { level: 0 };
	buildFabricator = { level: 0 };
	fabricator = { level: 0 };
	buildLinker = { level: 0 };
	linker = { level: 0 };
}

/** The triggers to release upgrades offer */
const upgradeTriggersLifetime = new Set([5, 50, 100, 200, 300, 450, 600, 800, 1000]);
const upgradeNames = Object.keys(upgradesInfo);
export class UpgradesTool {
	static isMaxedUpgrade(upgradeSet, upgradeName) {
		return upgradeSet[upgradeName].level >= upgradesInfo[upgradeName].maxLevel;
	}
	static getUpgradeTooltipText(upgradeName = 'linker') {
		if (!upgradesInfo[upgradeName]) return 'Unknown upgrade';
		return upgradesInfo[upgradeName].tooltip;
	}
} 

export class Upgrader {
	static shouldUpgrade(nodeLifetime = 0) { return upgradeTriggersLifetime.has(nodeLifetime); }

	/** @param {import('./player.mjs').PlayerNode} player @param {string} id @param {number} count default: 3 */
	static getRandomUpgradeOffer(player, id, count = 3) {
		// first upgrade must be linker
		if (!player.linker) return ['buildLinker', 'buildLinker', 'buildLinker'];

		/** @type {string[]} */
		const offers = [];
		for (let i = 0; i < 10_000; i++) { // unique types only
			const u = SeededRandom.pickOne(upgradeNames, `${id}-hive-${i * 64}`);
			const required = upgradesInfo[u].required;
			if (required && player.upgradeSet[required].level === 0) continue;
			if (player.upgradeSet[u].level >= upgradesInfo[u].maxLevel) continue;
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