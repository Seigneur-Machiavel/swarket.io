class BuildingModuleComponent {
	mainElement;
	tooltipElement;
	currentLevelElement;

	/** @param {string} moduleKey @param {number} maxLevel */
	constructor(moduleKey, maxLevel) {
		const moduleElement = document.createElement('div');
		moduleElement.classList = `module hoverable-tooltip ${moduleKey}`;
		this.mainElement = moduleElement;

		const tooltip = document.createElement('div');
		tooltip.classList = 'tooltip';
		moduleElement.appendChild(tooltip);
		this.tooltipElement = tooltip;

		const levelElement = document.createElement('div');
		levelElement.classList = 'module-level';
		moduleElement.appendChild(levelElement);

		const currentLevelElement = document.createElement('span');
		currentLevelElement.textContent = '0';
		levelElement.appendChild(currentLevelElement);
		this.currentLevelElement = currentLevelElement;

		const maxLevelElement = document.createElement('span');
		maxLevelElement.textContent = `/${maxLevel}`;
		levelElement.appendChild(maxLevelElement);
	}
}

class TreeStepComponent { // wrap a step in the tree
	mainElement;
	unlockElement;
	currentLevelElement;
	/** @type {Record<string, BuildingModuleComponent>} */
	stepModules = {};

	constructor(tier = 0) {
		const mainElement = document.createElement('div');
		mainElement.classList = `tree-step`;
		this.mainElement = mainElement;

		const unlockElement = document.createElement('div');
		unlockElement.classList = 'tier-unlock';
		const text = document.createElement('div');
		const current = document.createElement('span');
		current.textContent = '0';
		this.currentLevelElement = current;
		
		text.appendChild(current);
		const unlockAt = document.createElement('span');
		unlockAt.textContent = `/${tier}`;
		text.appendChild(unlockAt);
		unlockElement.appendChild(text);
		this.mainElement.appendChild(unlockElement);
		this.unlockElement = unlockElement;
	}

	/** @param {string} moduleKey @param {number} maxLevel */
	addModule(moduleKey, maxLevel) {
		const m = new BuildingModuleComponent(moduleKey, maxLevel);
		this.stepModules[moduleKey] = m;
		this.mainElement.appendChild(m.mainElement);
		return m;
	}
}

export class ModuleTreeComponent {
	mainElement;
	/** @type {Record<string, TreeStepComponent>} */
	treeSteps = {};
	/** @type {Record<string, BuildingModuleComponent>} */
	modulesComponents = {}; // flat list of modules

	/** @param {HTMLElement} wrapper */
	constructor(wrapper) {
		const mainElement = document.createElement('div');
		mainElement.classList = 'modules-tree-component';
		wrapper.appendChild(mainElement);
		this.mainElement = mainElement;
	}

	/** @param {string} moduleKey @param {number} tier @param {number} maxLevel */
	addModule(moduleKey, tier, maxLevel) {
		if (this.treeSteps[tier] === undefined) {
			const step = new TreeStepComponent(tier);
			this.mainElement.appendChild(step.mainElement);
			this.treeSteps[tier] = step;
		}

		const m = this.treeSteps[tier].addModule(moduleKey, maxLevel);
		this.modulesComponents[moduleKey] = m;
		return m;
	}

	updateLevel(level = 0) {
		for (const tier in this.treeSteps) {
			const step = this.treeSteps[tier];
			step.unlockElement.classList.toggle('unlocked', level >= Number(tier));
			step.currentLevelElement.textContent = Math.min(level, Number(tier));
		}
	}

	/** @param {string} moduleKey @param {number} level @param {string} description @param {boolean} isClickable */
	updateModule(moduleKey, level, description, isClickable = false) {
		const m = this.modulesComponents[moduleKey];
		if (!m) return console.warn(`ModuleTreeComponent.update: unknown moduleKey "${moduleKey}"`);
		m.currentLevelElement.textContent = level;
		if (description) m.tooltipElement.textContent = description;
		m.mainElement.classList.toggle('isClickable', isClickable);
		m.mainElement.classList.toggle('isBought', level > 0);
	}
}