import { ProductionLineIOParam, ProductionLineVerticalRangeParam, ProductionLineComponent } from './production-line-component.mjs';
import { getModulesDescriptionRelativeToPlayer } from '../game-logics/buildings-modules.mjs';

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
	/** @type {Record<string, HTMLElement>} */
	moduleElements;

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
		this.closeBtn.onclick = () => this.hide();

		/*this.reactorProductionRate.oninput = () => {
			if (!this.gameClient?.alive) return;
			const rate = parseFloat(this.reactorProductionRate.value);
			this.gameClient.digestMyAction({ type: 'set-param', param: 'reactorProductionRate', value: rate });
		}*/
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
	update() { // call only if reactor is present
		const reactor = this.gameClient?.myPlayer.reactor;
		if (!this.gameClient?.alive || !reactor) return this.hide();

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

		if (!this.moduleElements) this.#initModules();
	}
	#initModules() {
		const modulesWrapper = this.modal.querySelector('.modules-wrapper');
		/*const modulesInfos = getModulesDescriptionRelativeToPlayer(this.gameClient.myPlayer);
		if (!modulesInfos) return;
		this.moduleElements = {};
		for (const [moduleKey, { minReactorLevel, currentLevel, description }] of Object.entries(modulesInfos)) {
			const moduleElement = document.createElement('div');
			moduleElement.classList.add('module');
			const { minReactorLevel}
			modulesWrapper.appendChild(moduleElement);
			this.moduleElements[moduleKey] = moduleElement;
		}*/
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
}