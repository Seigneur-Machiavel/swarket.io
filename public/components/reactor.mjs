import { ProductionLineIOParam, ProductionLineVerticalRangeParam, ProductionLineComponent } from './production-line.mjs';
import { ModuleTreeComponent } from './modules-tree.mjs';
import { REACTOR_MODULES } from '../game-logics/buildings-modules.mjs';

/** @type {Record<string, Array<{actionParam: ProductionLineVerticalRangeParam, events: Record<string, (gameClient: import('../game-logics/game.mjs').GameClient, value: any) => void>}>>} */
const lineActionsParam = {
	energyFromChipsAndEngineers: [
		{
			actionParam: new ProductionLineVerticalRangeParam(5, 0, 1, 0.25, 1),
			events: {
				/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
				oninput: (gameClient, value) => {
					if (!gameClient?.alive) return;
					const myAction = { type: 'set-param', param: 'buildingProductionRate', buildingName: 'reactor', lineName: 'energyFromChipsAndEngineers', value };
					gameClient.digestMyAction(myAction);
					console.log('oninput', myAction);
				}
			}
		}
	]
};

export class ReactorComponent {
	gameClient;
	modal = document.getElementById('reactor-modal');
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

	update() { // call only if reactor is present
		if (!this.#isVisible()) return;
		const reactor = this.gameClient?.myPlayer.reactor;
		if (!this.gameClient?.alive || !reactor) return this.hide();

		const reactorLevel = reactor.level();
		this.moduleTree.updateLevel(reactorLevel);
		for (let i = 0; i < REACTOR_MODULES.allModulesKeys.length; i++) {
			const m = REACTOR_MODULES.allModulesKeys[i];
			const moduleLevel = reactor.modulesLevel[i] || 0;
			const description = REACTOR_MODULES.getModuleDescription(m, moduleLevel);
			const { maxLevel, minBuildingLevel } = REACTOR_MODULES.getModuleRequiredLevelAndMaxLevel(m) || {};
			const isClickable = reactorLevel >= minBuildingLevel && moduleLevel < maxLevel;
			this.moduleTree.updateModule(m, moduleLevel, description, isClickable);
		}

		for (const lineKey of reactor.activeProductionLines) {
			const { inputs, outputs } = reactor.getProductionLineEffect(lineKey);
			if (!this.productionsLines[lineKey]) this.#initProductionLine(lineKey, inputs, outputs);

			// UPDATE IO VALUES
			for (const r in inputs) this.productionsLines[lineKey].updateIOValue('input', r, inputs[r]);
			for (const r in outputs) this.productionsLines[lineKey].updateIOValue('output', r, outputs[r]);

			const hasProduced = reactor.linesWhoProducedThisTurn.indexOf(lineKey) !== -1;
			if (hasProduced) this.productionsLines[lineKey].mainElement.classList.add('enabled');
			else this.productionsLines[lineKey].mainElement.classList.remove('enabled');
		}
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
	#isVisible() { return this.modal.classList.contains('visible'); }

	#initModulesTree() {
		for (let i = 0; i < REACTOR_MODULES.allModulesKeys.length; i++) {
			const moduleKey = REACTOR_MODULES.allModulesKeys[i];
			const { minBuildingLevel, maxLevel } = REACTOR_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
			if (minBuildingLevel === undefined || maxLevel === undefined) return;
			const moduleElement = this.moduleTree.addModule(moduleKey, minBuildingLevel, maxLevel);
			moduleElement.mainElement.onclick = () => {
				const reactor = this.gameClient?.myPlayer.reactor;
				if (!this.gameClient?.alive || !reactor) return;
				if (!reactor.upgradePoints) return;

				const reactorLevel = reactor.level();
				const moduleLevel = reactor.modulesLevel[i] || 0;
				if (reactorLevel < minBuildingLevel || moduleLevel >= maxLevel) return;

				const myAction = { type: 'upgrade-module', buildingName: 'reactor', value: moduleKey };
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
		const actionParam = lineActionsParam[lineKey] || [];
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