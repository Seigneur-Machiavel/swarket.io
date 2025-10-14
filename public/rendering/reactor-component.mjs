import { getModulesDescriptionRelativeToPlayer } from '../game-logics/buildings-modules.mjs';

export class ReactorComponent {
	gameClient;
	modal = document.getElementById('reactor-modal');
	closeBtn = this.modal.querySelector('.close-btn');
	reactorProductionRate = this.modal.querySelector('#reactor-production-rate');
	// PRODUCTION-CYCLE ELEMENTS
	productionCycle = this.modal.querySelector('.production-cycle');
	reactorChipsInput = this.modal.querySelector('#reactor-chips-input');
	reactorEngineersInput = this.modal.querySelector('#reactor-engineers-input');
	reactorEnergyOutput = this.modal.querySelector('#reactor-energy-output');
	// MODULES
	modulesWrapper = this.modal.querySelector('.modules-wrapper');
	/** @type {Record<string, HTMLElement>} */
	moduleElements = null;

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
		this.closeBtn.onclick = () => this.hide();

		this.reactorProductionRate.oninput = () => {
			if (!this.gameClient?.alive) return;
			const rate = parseFloat(this.reactorProductionRate.value);
			this.gameClient.digestMyAction({ type: 'set-param', param: 'reactorProductionRate', value: rate });
		}
	}

	update() { // call only if reactor is present
		if (!this.gameClient.alive) return this.hide();
		const { conso, energy } = this.gameClient.myPlayer.reactor?.energyProd || {};
		this.reactorChipsInput.textContent = conso?.chips?.toFixed(1) || '0';
		this.reactorEngineersInput.textContent = conso?.engineers?.toFixed(1) || '0';
		this.reactorEnergyOutput.textContent = energy?.toFixed(1) || '0';
		const hasProducedThisTurn = this.gameClient.myPlayer.reactor?.hasProducedThisTurn;
		if (hasProducedThisTurn) this.productionCycle.classList.add('enabled');
		else this.productionCycle.classList.remove('enabled');
		if (!this.moduleElements) this.#initModules();
	}
	#initModules() {
		/*const modulesInfos = getModulesDescriptionRelativeToPlayer(this.gameClient.myPlayer);
		if (!modulesInfos) return;
		this.moduleElements = {};
		for (const [moduleKey, { minReactorLevel, currentLevel, description }] of Object.entries(modulesInfos)) {
			const moduleElement = document.createElement('div');
			moduleElement.classList.add('module');
			const { minReactorLevel}
			this.modulesWrapper.appendChild(moduleElement);
			this.moduleElements[moduleKey] = moduleElement;
		}*/
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
}