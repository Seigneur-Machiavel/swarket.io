import { ProductionLineIOParam, ProductionLineComponent, getLineActions } from './production-line.mjs';
import { FABRICATOR_MODULES } from '../game-logics/buildings-modules.mjs';
import { ModuleTreeComponent } from './modules-tree.mjs';

export class FabricatorComponent {
	gameClient;
	modal = document.getElementById('fabricator-modal');
	closeBtn = this.modal.querySelector('.close-btn');

	/** @type {Record<string, ProductionLineComponent>} */
	productionsLines = {};
	moduleTree = new ModuleTreeComponent(this.modal.querySelector('.modules-wrapper'));

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
		this.closeBtn.onclick = () => this.hide();
		this.#initModulesTree();
	}

	update() { // call only if fabricator is present
		if (!this.#isVisible()) return;
		const fabricator = this.gameClient?.myPlayer.fabricator;
		if (!this.gameClient?.alive || !fabricator) return this.hide();

		const fabricatorLevel = fabricator.level();
		this.moduleTree.updateLevel(fabricatorLevel);
		for (let i = 0; i < FABRICATOR_MODULES.allModulesKeys.length; i++) {
			const m = FABRICATOR_MODULES.allModulesKeys[i];
			const moduleLevel = fabricator.modulesLevel[i] || 0;
			const description = FABRICATOR_MODULES.getModuleDescription(m, moduleLevel);
			const { maxLevel, minBuildingLevel } = FABRICATOR_MODULES.getModuleRequiredLevelAndMaxLevel(m) || {};
			const isClickable = fabricatorLevel >= minBuildingLevel && moduleLevel < maxLevel;
			this.moduleTree.updateModule(m, moduleLevel, description, isClickable);
		}

		for (const lineKey of fabricator.activeProductionLines) {
			const { inputs, outputs } = fabricator.getProductionLineEffect(lineKey);
			if (!this.productionsLines[lineKey]) this.#initProductionLine(lineKey, inputs, outputs);

			// UPDATE IO VALUES
			for (const r in inputs) this.productionsLines[lineKey].updateIOValue('input', r, inputs[r]);
			for (const r in outputs) this.productionsLines[lineKey].updateIOValue('output', r, outputs[r]);

			this.productionsLines[lineKey].mainElement.classList.remove('produced');
			const hasBroken = fabricator.linesWhoBrokeThisTurn.indexOf(lineKey) !== -1;
			if (hasBroken) setTimeout(() => this.productionsLines[lineKey].mainElement.classList.add('broken'), 300);
			else this.productionsLines[lineKey].mainElement.classList.remove('broken');

			const hasProduced = fabricator.linesWhoProducedThisTurn.indexOf(lineKey) !== -1;
			if (hasProduced || hasBroken) setTimeout(() => this.productionsLines[lineKey].mainElement.classList.add('produced'), 10);
		}
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
	#isVisible() { return this.modal.classList.contains('visible'); }

	#initModulesTree() {
		for (let i = 0; i < FABRICATOR_MODULES.allModulesKeys.length; i++) {
			const moduleKey = FABRICATOR_MODULES.allModulesKeys[i];
			const { minBuildingLevel, maxLevel } = FABRICATOR_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
			if (minBuildingLevel === undefined || maxLevel === undefined) return;
			const moduleElement = this.moduleTree.addModule(moduleKey, minBuildingLevel, maxLevel);
			moduleElement.mainElement.onclick = () => {
				const fabricator = this.gameClient?.myPlayer.fabricator;
				if (!this.gameClient?.alive || !fabricator) return;
				if (!fabricator.upgradePoints) return;

				const fabricatorLevel = fabricator.level();
				const moduleLevel = fabricator.modulesLevel[i] || 0;
				if (fabricatorLevel < minBuildingLevel || moduleLevel >= maxLevel) return;

				const myAction = { type: 'upgrade-module', buildingName: 'fabricator', value: moduleKey };
				this.gameClient.digestMyAction(myAction);
				console.log('onclick module', myAction);
				this.moduleTree.updateModule(moduleKey, moduleLevel + 1); // feedback instantly
			};
		}
	}
	/** @param {string} lineKey @param {Record<string, number>} inputs @param {Record<string, number>} outputs */
	#initProductionLine(lineKey, inputs, outputs) {
		// HTML INJECTION & STORE COMPONENT FOR UPDATES
		const inputsParam = [];
		const outputsParam = [];
		for (const r in inputs) inputsParam.push(new ProductionLineIOParam(r, inputs[r]));
		for (const r in outputs) outputsParam.push(new ProductionLineIOParam(r, outputs[r]));
		
		//const actionParam = lineActionsParam[lineKey] || [];
		const actionParam = getLineActions(lineKey, 'fabricator');
		const actions = actionParam.map(a => a.actionParam);
		const productionLineComponent = new ProductionLineComponent(inputsParam, outputsParam, actions);
		
		for (let i = 0; i < actionParam.length; i++) // FOR EACH ACTION
			for (const eventName in actionParam[i].events) { // FOR EACH EVENT
				const actionElement = productionLineComponent.elements.actions[i];
				actionElement[eventName] = (e) => actionParam[i].events[eventName](this.gameClient, parseFloat(e.target.value));
			}

		const productionLinesWrapper = this.modal.querySelector('.production-lines-wrapper');
		productionLinesWrapper.appendChild(productionLineComponent.mainElement);
		this.productionsLines[lineKey] = productionLineComponent;
	}
}