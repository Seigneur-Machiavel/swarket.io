/*
<div class="production-cycle two"> // TEMPLATE
	<div class="resource-inputs">
		<div class="resource">
			<div class="tooltip">Chips consumption</div>
			<div class="resource-icon chips"></div>
			<span class="resource-value">0</span>
		</div>
		<div class="resource">
			<div class="tooltip">Engineers consumption</div>
			<div class="resource-icon engineers"></div>
			<span class="resource-value">0</span>
		</div>
	</div>
	<div class="production-chain two">
		<div class="chain">========</div>
		<div class="chain">========</div>
	</div>
	<div class="production-chain-fitting two-inputs one-output">
		<div class="fitting">==</div>
		<div class="fitting">==</div>
	</div>
	<div class="resource-outputs">
		<div class="resource">
			<div class="tooltip">Energy production</div>
			<div class="resource-icon energy"></div>
			<span class="resource-value">0</span>
		</div>
	</div>
	<div class="input-vertical-range">
		<div class="five-steps-range-bars"></div>
		<input type="range" id="reactor-production-rate" min="0" max="1" step=".25" value="1">
	</div>
</div>*/

export class ReactorComponent {
	gameClient;
	modal = document.getElementById('reactor-modal');
	closeBtn = this.modal.querySelector('.close-btn');
	reactorProductionRate = this.modal.querySelector('#reactor-production-rate');
	// PRODUCTION-CYCLE ELEMENTS
	productionCycle = this.modal.querySelector('.production-cycle');
	reactorChipsInput = this.modal.querySelector('#reactor-chips-input');
	reactorEngineersInput = this.modal.querySelector('#reactor-engineers-input');
	//productionChain = this.modal.querySelector('.production-chain');
	//productionChainFitting = this.modal.querySelector('.production-chain-fitting');
	reactorEnergyOutput = this.modal.querySelector('#reactor-energy-output');

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
		const { conso, energy } = this.gameClient.myPlayer.reactor?.energyProd || {};
		this.reactorChipsInput.textContent = conso?.chips?.toFixed(1) || '0';
		this.reactorEngineersInput.textContent = conso?.engineers?.toFixed(1) || '0';
		this.reactorEnergyOutput.textContent = energy?.toFixed(1) || '0';
		const hasProducedThisTurn = this.gameClient.myPlayer.reactor?.hasProducedThisTurn;
		if (hasProducedThisTurn) this.productionCycle.classList.add('enabled');
		else this.productionCycle.classList.remove('enabled');
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
}