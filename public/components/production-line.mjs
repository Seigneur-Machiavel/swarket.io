/* TEMPLATE
<div class="production-line two">
	<div class="resource-inputs">
		<div class="resource">
			<div class="tooltip">Chips consumption</div>
			<div class="resource-icon chips"></div>
			<span class="resource-value" id="reactor-chips-input">0</span>
		</div>
		<div class="resource">
			<div class="tooltip">Engineers consumption</div>
			<div class="resource-icon engineers"></div>
			<span class="resource-value" id="reactor-engineers-input">0</span>
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
			<span class="resource-value" id="reactor-energy-output">0</span>
		</div>
	</div>
	<div class="input-vertical-range">
		<div class="five-steps-range-bars"></div>
		<input type="range" id="reactor-production-rate" min="0" max="1" step=".25" value="1">
	</div>
</div>*/

import { formatCompact3Digits } from '../utils.mjs';
const numberToWord = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };

// IO PARAM
export class ProductionLineIOParam {
	resourceName; qty;
	constructor(resourceName = 'toto', qty = 0) {
		this.resourceName = resourceName; this.qty = qty;
	}
}
// ACTIONS PARAM
class ProductionLineVerticalRangeParam {
	type = 'input-vertical-range';
	steps; min; max; step; value;
	constructor(steps = 5, min = 0, max = 1, step = 0.25, value = 1) {
		this.steps = steps; this.min = min; this.max = max; this.step = step; this.value = value;
	}
}

class ElementsBuilder {
	static createProductionLine(size = 2) {
		const sizeWord = numberToWord[size];
		if (!sizeWord) return;
		const productionLine = document.createElement('div');
		productionLine.classList = `production-line ${sizeWord}`;
		return productionLine;
	}
	static createResourceElement(resourceName, qty = 0, type = 'input') {
		const resourceElement = document.createElement('div');
		resourceElement.classList = `resource`;

		const tooltip = document.createElement('div');
		tooltip.classList = 'tooltip';
		tooltip.textContent = `${resourceName} ${type === 'input' ? 'consumption' : 'production'}`;
		resourceElement.appendChild(tooltip);

		const resourceIcon = document.createElement('div');
		resourceIcon.classList = `resource-icon ${resourceName.toLowerCase()}`;
		resourceElement.appendChild(resourceIcon);

		const resourceValue = document.createElement('span');
		resourceValue.classList = 'resource-value';
		resourceValue.textContent = formatCompact3Digits(qty);
		resourceElement.appendChild(resourceValue);
		return resourceElement;
	}
	static createChainElement(size = 2) {
		const sizeWord = numberToWord[size];
		if (!sizeWord) return;
		const chainElement = document.createElement('div');
		chainElement.classList = `production-chain ${sizeWord}`;

		for (let i = 0; i < size; i++) {
			const chain = document.createElement('div');
			chain.classList = 'chain';
			chain.textContent = '========';
			chainElement.appendChild(chain);
		}
		return chainElement;
	}
	static createFittingElement(inputsCount = 2, outputsCount = 1) { // always two inputs or outputs
		if (inputsCount === outputsCount) return;
		const fittingElement = document.createElement('div');
		fittingElement.classList = `production-chain-fitting ${numberToWord[inputsCount]}-inputs ${numberToWord[outputsCount]}-output`;
		
		for (let i = 0; i < Math.max(inputsCount, outputsCount); i++) {
			const fitting = document.createElement('div');
			fitting.classList = 'fitting';
			fitting.textContent = '==';
			fittingElement.appendChild(fitting);
		}
		return fittingElement;
	}
	static createInputVerticalRangeElement(steps = 5, min = 0, max = 1, step = 0.25, value = 1) {
		const inputVerticalRange = document.createElement('div');
		inputVerticalRange.classList = 'input-vertical-range';
		
		const stepWord = numberToWord[steps];
		if (stepWord) {
			const bars = document.createElement('div');
			bars.classList = `${stepWord}-steps-range-bars`;
			inputVerticalRange.appendChild(bars);
		}

		const input = document.createElement('input');
		input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value;
		inputVerticalRange.appendChild(input);
		return inputVerticalRange;
	}
}

export class ProductionLineComponent {
	/** @type {HTMLElement} */
	mainElement;
	/** @type {Record<string, HTMLElement[]>} */
	elements = {
		inputs : [],
		outputs : [],
		actions : [],
	}
	/** @type {Record<string, HTMLElement>} */
	inputsElementsByKey = {}; // for quick access
	/** @type {Record<string, HTMLElement>} */
	outputsElementsByKey = {}; // for quick access

	/** Creates a production line element
	 * @param {Array<ProductionLineIOParam>} inputs
	 * @param {Array<ProductionLineIOParam>} outputs
	 * @param {Array<ProductionLineVerticalRangeParam>} actions */
	constructor(inputs = [], outputs = [], actions = []) {
		const [inputsCount, outputsCount, actionsCount] = [inputs.length, outputs.length, actions.length];
		if (!inputsCount || !outputsCount) throw new Error('Production line must have at least one input and one output');
		if (inputsCount > 3 || outputsCount > 2) throw new Error('Production line supports up to 3 inputs and 2 outputs');
		if (actionsCount > 3) throw new Error('Production line supports only 3 actions max');
		
		// MAIN: PRODUCTION LINE
		const productionLineSize = Math.max(inputsCount, outputsCount);
		const mainElement = ElementsBuilder.createProductionLine(productionLineSize);
		this.mainElement = mainElement;
		if (!mainElement) throw new Error('Invalid size for production line');

		// INPUTS RESOURCES
		const inputsWrapper = document.createElement('div');
		inputsWrapper.classList = `resource-inputs`;
		for (const input of inputs) {
			const inputElement = ElementsBuilder.createResourceElement(input.resourceName, input.qty, 'input');
			inputsWrapper.appendChild(inputElement);
			this.elements.inputs.push(inputElement);
			this.inputsElementsByKey[input.resourceName] = inputElement;
		}
		mainElement.appendChild(inputsWrapper);

		// CHAIN - FITTING
		const chainElement = ElementsBuilder.createChainElement(productionLineSize);
		const fittingElement = ElementsBuilder.createFittingElement(inputsCount, outputsCount);
		if (fittingElement) // SET FITTING FIRST IF MORE OUTPUTS THAN INPUTS
			if (outputsCount > inputsCount) mainElement.appendChild(fittingElement);

		mainElement.appendChild(chainElement);
		if (fittingElement) // SET FITTING LAST IF MORE INPUTS THAN OUTPUTS
			if (inputsCount > outputsCount) mainElement.appendChild(fittingElement);

		// OUTPUTS RESOURCES
		const outputsWrapper = document.createElement('div');
		outputsWrapper.classList = `resource-outputs`;
		for (const output of outputs) {
			const outputElement = ElementsBuilder.createResourceElement(output.resourceName, output.qty, 'output');
			outputsWrapper.appendChild(outputElement);
			this.elements.outputs.push(outputElement);
			this.outputsElementsByKey[output.resourceName] = outputElement;
		}
		mainElement.appendChild(outputsWrapper);

		// ACTIONS
		for (const action of actions) {
			if (action.type === 'input-vertical-range') {
				const actionElement = ElementsBuilder.createInputVerticalRangeElement(action.steps, action.min, action.max, action.step, action.value);
				mainElement.appendChild(actionElement);
				this.elements.actions.push(actionElement);
			}
		}
	}

	/** @param {'input' | 'output'} type @param {string} resourceName @param {number} newQty */
	updateIOValue(type, resourceName, newQty = 0) {
		const element = type === 'input' ? this.inputsElementsByKey[resourceName] : this.outputsElementsByKey[resourceName];
		if (!element) return;

		const valueElement = element.querySelector('.resource-value');
		if (!valueElement) return;
		valueElement.textContent = formatCompact3Digits(newQty);
	}
}

/** @param {string} lineKey */
const newProductionRateAction = (lineKey, buildingName = 'reactor') => ({
	actionParam: new ProductionLineVerticalRangeParam(5, 0, 1, .25, 1),
	events: {
		/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
		oninput: (gameClient, value) => {
			if (!gameClient?.alive) return;
			const myAction = { type: 'set-param', param: 'buildingProductionRate', buildingName, lineName: lineKey, value };
			gameClient.digestMyAction(myAction);
			console.log('oninput', myAction);
		}
	}
});
export const getLineActions = (lineKey, buildingName = 'reactor') => {
	const a = [];
	a.push(newProductionRateAction(lineKey, buildingName));
	// HERE WE CAN ADD MORE ACTIONS SPECIFIC TO LINES IN THE FUTURE
	return a;
};