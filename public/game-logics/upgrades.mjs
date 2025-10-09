import { SeededRandom } from './seededRandom.mjs';

// When adding a new upgrade => also update UpgradeSet
const upgradesInfo = {
	/** Number of node connection permitted (excluding bootstrap nodes) */
	linker: { maxLevel: 10, tooltip: 'Increases the connectivity of your nodes by 1' },
	/** Multiplier to production rate of operating resource */
	producer: { maxLevel: 10, tooltip: 'Increases the production rate of your resources by 40%' },
	/** One-shot energy refill -> To MaxEnergy */
	energyDrop: { maxLevel: Infinity, tooltip: 'Instantly refills energy to maximum' },
	/** Recycling efficiency => maxed = auto recycle */
	cleaner: { maxLevel: 5, tooltip: 'Increases the resources recycled by 10%' },
}
export class UpgradeSet {
	linker = { level: 0 };
	producer = { level: 0 };
	energyDrop = { level: 0 };
	cleaner = { level: 0 };
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

	/** @param {UpgradeSet} playerUpgradeSet @param {string} id @param {number} count default: 3 */
	static getRandomUpgradeOffer(playerUpgradeSet, id, count = 3) {
		// first upgrade must be linker
		if (playerUpgradeSet.linker.level === 0) return ['linker', 'linker', 'linker'];

		/** @type {string[]} */
		const offers = [];
		for (let i = 0; i < 10_000; i++) { // unique types only
			const u = SeededRandom.pickOne(upgradeNames, `${id}-hive-${i * 64}`);
			if (playerUpgradeSet[u].level >= upgradesInfo[u].maxLevel) continue;
			offers.push(u);
			if (offers.length >= count) break;
		}
		return offers;
	}
	/** @param {import('./player.mjs').PlayerNode} player @param {string} upgradeName */
	static applyUpgradeEffects(player, upgradeName) {
		if (!player.energy) return;
		switch (upgradeName) {
			case 'energyDrop':
				player.energy = player.maxEnergy;
				break;
		}
	}
}