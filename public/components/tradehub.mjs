import { formatCompact2Digits, formatCompact3Digits } from '../utils.mjs';
import { ModuleTreeComponent } from './modules-tree.mjs';
import { TRADE_HUB_MODULES } from '../game-logics/buildings-modules.mjs';
import { RESOURCES_NAMES, RAW_RESOURCES_PROD_BASIS } from '../game-logics/resources.mjs';

class ElementsBuilder {
	static createMyTradeOfferLine(offeredResourceName = 'energy') {
		const requestedResourceName = offeredResourceName !== 'chips' ? 'chips' : 'energy';
		const lineElem = document.createElement('div');
		lineElem.classList = 'my-trade-offer-line';

		const offeredResource = ElementsBuilder.createResourceElement('I', offeredResourceName, 1, true, false);
		offeredResource.resourceElem.classList.add('offered');
		lineElem.appendChild(offeredResource.resourceElem);

		lineElem.appendChild(ElementsBuilder.createArrowElement());

		const requestedResource = ElementsBuilder.createResourceElement('He', requestedResourceName, 0);
		requestedResource.resourceElem.classList.add('requested');
		lineElem.appendChild(requestedResource.resourceElem);

		const { minStockElem, minStockValueElem } = ElementsBuilder.createMinStockElement(0);
		lineElem.appendChild(minStockElem);

		const toggleBtnElem = document.createElement('div');
		toggleBtnElem.classList = 'toggle-btn hoverable-tooltip';
		lineElem.appendChild(toggleBtnElem);
		const toggleTooltipElem = document.createElement('div');
		toggleTooltipElem.classList = 'tooltip';
		toggleTooltipElem.textContent = 'Currently: Inactive';
		toggleBtnElem.appendChild(toggleTooltipElem);

		return { lineElem, offeredResource, requestedResource, toggleBtnElem, toggleTooltipElem, minStockValueElem };
	}
	/** @param {string} pronoun @param {string} resourceName @param {number} qty @param {boolean} editableResource @param {boolean} editableQty */
	static createResourceElement(pronoun, resourceName, qty, editableResource = true, editableQty = true) {
		const resourceElem = document.createElement('div');
		resourceElem.classList = 'resource';

		const tooltipElem = document.createElement('div');
		tooltipElem.classList = 'tooltip';
		tooltipElem.textContent = `${pronoun} send: ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}`;
		resourceElem.appendChild(tooltipElem);

		const resourceIconElem = document.createElement('div');
		resourceIconElem.classList = `resource-icon ${resourceName.toLowerCase()}`;
		if (!editableResource) resourceIconElem.style.cursor = 'default';

		const resourceValueElem = document.createElement('span');
		resourceValueElem.classList = 'resource-value';
		if (editableQty) resourceValueElem.setAttribute('contenteditable', 'true');
		resourceValueElem.style.cursor = editableQty ? 'pointer' : 'default';
		resourceValueElem.textContent = qty.toString();
		
		resourceElem.appendChild(resourceIconElem);
		resourceElem.appendChild(resourceValueElem);
		return { resourceElem, tooltipElem, resourceIconElem, resourceValueElem };
	}
	static createArrowElement() {
		const arrowElem = document.createElement('div');
		arrowElem.classList = 'arrow';
		arrowElem.textContent = '->';
		return arrowElem;
	}
	static createMinStockElement(minStock = 0) {
		const minStockElem = document.createElement('div');
		minStockElem.classList = 'min-stock hoverable-tooltip';

		const tooltipElem = document.createElement('div');
		tooltipElem.classList = 'tooltip';
		tooltipElem.textContent = 'Minimum stock to keep';
		const minStockValueElem = document.createElement('span');
		minStockValueElem.classList = 'min-stock-value';
		minStockValueElem.setAttribute('contenteditable', 'true');
		minStockValueElem.textContent = minStock.toString();

		minStockElem.appendChild(tooltipElem);
		minStockElem.appendChild(minStockValueElem);
		return { minStockElem, minStockValueElem };
	}
}

class MyTradeOfferLineComponent {
	/** @type {string | null} */
	offerId = null;
	offeredResourceName = 'energy';
	myResourcesBar;

	mainElement;
	offeredResourceTooltip;
	offeredResourceIconElem;
	offeredResourceValueElem;
	requestedResourceTooltip;
	requestedResourceIconElem;
	requestedResourceValueElem;
	minStockValueElem;
	toggleBtnElem;
	toggleTooltipElem;

	/** @param {import('./resources-bar.mjs').ResourcesBarComponent} myResourcesBar @param {string} [resourceOffered] */
	constructor(myResourcesBar, resourceOffered = 'energy') {
		this.myResourcesBar = myResourcesBar;
		this.offeredResourceName = resourceOffered;
		const { lineElem, offeredResource, requestedResource, toggleBtnElem, toggleTooltipElem, minStockValueElem } = ElementsBuilder.createMyTradeOfferLine(resourceOffered);
		this.mainElement = lineElem;
		this.offeredResourceTooltip = offeredResource.tooltipElem;
		this.offeredResourceIconElem = offeredResource.resourceIconElem;
		this.offeredResourceValueElem = offeredResource.resourceValueElem;
		this.requestedResourceTooltip = requestedResource.tooltipElem;
		this.requestedResourceIconElem = requestedResource.resourceIconElem;
		this.requestedResourceValueElem = requestedResource.resourceValueElem;
		this.minStockValueElem = minStockValueElem;
		this.toggleBtnElem = toggleBtnElem;
		this.toggleTooltipElem = toggleTooltipElem;
		this.#setupHandlers();
	}

	#setupHandlers() {
		const handleResourceNameAndValue = (elementIcon, elementValue, elementTooltip, resName, value, pronoun = 'I') => {
			elementIcon.classList = `resource-icon ${resName}`;
			const isValueEditable = elementValue.isContentEditable;
			if (isValueEditable) elementValue.textContent = formatCompact3Digits(value / 10);
			elementTooltip.textContent = `${pronoun} send: ${resName.charAt(0).toUpperCase() + resName.slice(1)}`;
		}
		this.offeredResourceIconElem.onclick = () => this.myResourcesBar.handleNextResourceClick((resName, value) => {
			handleResourceNameAndValue(this.offeredResourceIconElem, this.offeredResourceValueElem, this.offeredResourceTooltip, resName, value, 'I');
			// reset requested value to avoid mistake
			this.requestedResourceValueElem.textContent = '0';
			// change requested resource to something different than offered
			if (this.requestedResourceIconElem.classList.item(1) !== resName) return;
			this.requestedResourceIconElem.classList = `resource-icon ${resName === 'chips' ? 'energy' : 'chips'}`;
			this.requestedResourceTooltip.textContent = `He send: ${this.requestedResourceIconElem.classList.item(1).charAt(0).toUpperCase() + this.requestedResourceIconElem.classList.item(1).slice(1)}`;
		});
		this.requestedResourceIconElem.onclick = () => this.myResourcesBar.handleNextResourceClick((resName, value) => {
			handleResourceNameAndValue(this.requestedResourceIconElem, this.requestedResourceValueElem, this.requestedResourceTooltip, resName, 0, 'He');
		
			// change offered resource to something different than requested
			if (this.offeredResourceIconElem.classList.item(1) !== resName) return;
			this.offeredResourceIconElem.classList = `resource-icon ${resName === 'chips' ? 'energy' : 'chips'}`;
			this.offeredResourceTooltip.textContent = `I send: ${this.offeredResourceIconElem.classList.item(1).charAt(0).toUpperCase() + this.offeredResourceIconElem.classList.item(1).slice(1)}`;
		});
		this.toggleBtnElem.onclick = () => {
			this.toggleBtnElem.classList.toggle('active');
			const isActive = this.toggleBtnElem.classList.contains('active');
			this.toggleTooltipElem.textContent = `Currently: ${isActive ? 'Active' : 'Inactive'}`;
		};
	}
	getResourcesAndValues() {
		try {
			const offeredResourceName = this.offeredResourceIconElem.classList.item(1) || 'energy';
			const offeredQty = parseInt(this.offeredResourceValueElem.textContent || '0', 10);
			const requestedResourceName = this.requestedResourceIconElem.classList.item(1) || 'chips';
			const requestedQty = parseInt(this.requestedResourceValueElem.textContent || '0', 10);
			const minStock = parseInt(this.minStockValueElem.textContent || '0', 10);
			const isActive = this.toggleBtnElem.classList.contains('active');
			return { offeredResourceName, offeredQty, requestedResourceName, requestedQty, minStock, isActive };
		} catch (error) {
			console.error('MyTradeOfferLineComponent.getResourcesAndValues: invalid number format');
		}
		return {};
	}
	setResourcesAndValues(offeredResourceName, offeredQty, requestedResourceName, requestedQty, minStock, isActive) {
		this.offeredResourceIconElem.classList = `resource-icon ${offeredResourceName.toLowerCase()}`;
		this.offeredResourceValueElem.textContent = offeredQty.toString();
		this.requestedResourceTooltip.textContent = `He send: ${requestedResourceName.charAt(0).toUpperCase() + requestedResourceName.slice(1)}`;
		this.requestedResourceIconElem.classList = `resource-icon ${requestedResourceName.toLowerCase()}`;
		this.requestedResourceValueElem.textContent = requestedQty.toString();
		this.requestedResourceTooltip.textContent = `He send: ${requestedResourceName.charAt(0).toUpperCase() + requestedResourceName.slice(1)}`;
		this.minStockValueElem.textContent = minStock.toString();
		this.toggleBtnElem.classList.toggle('active', isActive);
	}
}

class SwapComponent {
	cssStyle = 'color: lightgreen; font-weight: bold;';
	gameClient;
	myResourcesBar;
	mainElement = document.querySelector('.swap-wrapper');
	
	resourceA = this.mainElement.querySelector('.resource.sold');
	resourceA_tooltip = this.resourceA.querySelector('.tooltip');
	resourceA_Value = this.resourceA.querySelector('.resource-value');
	resourceA_Icon = this.resourceA.querySelector('.resource-icon');
	
	resourceB = this.mainElement.querySelector('.resource.bought');
	resourceB_tooltip = this.resourceB.querySelector('.tooltip');
	resourceB_Value = this.resourceB.querySelector('.resource-value');
	resourceB_Icon = this.resourceB.querySelector('.resource-icon');
	
	reverseResourcesBtn = document.getElementById('reverse-resources-btn');
	swapTaxRateValue = this.mainElement.querySelector('#swap-tax-rate-value');
	swapBtn = this.mainElement.querySelector('.swap-confirm-btn');
	swapBtnText = this.swapBtn.querySelector('span');
	swapBtnLoader = this.swapBtn.querySelector('.loader');
	swapBtnClicked = false; // flag
	/** @type {'BUY' | 'SELL'} which input was last filled by user */
	inputFilledByUser = 'BUY';
	/** @type {'A' | 'B'} which input is the bought resource */
	buyInput = 'B'; // DEPRECATED, IT'S ALWAYS B !!
	playersToInform = [];

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient @param {import('./resources-bar.mjs').ResourcesBarComponent} myResourcesBar */
	constructor(gameClient, myResourcesBar) {
		this.gameClient = gameClient;
		this.myResourcesBar = myResourcesBar;
		this.#setupHandlers();
	}

	update() { // OppositeValue & button enable/disable
		const taxRate = this.gameClient.myPlayer.tradeHub.getTaxRate;
		this.swapTaxRateValue.textContent = `${formatCompact2Digits(taxRate * 100)}%`;

		const { offeredResource, offeredQty, requestedResource, requestedQty } = this.#getCurrentValues();
		const bought = this.inputFilledByUser === 'BUY' ? requestedQty : 0;
		const sold = this.inputFilledByUser === 'SELL' ? offeredQty : 0;

		// CALCULATE EXPECTED OPPOSITE VALUE
		const { totalOppositeAmount, playersToInform } = this.gameClient.swapModule.getSwapExpectedResult(offeredResource, requestedResource, { bought, sold });
		const fixedStr = formatCompact3Digits(totalOppositeAmount);
		if (bought) this.resourceA_Value.textContent = fixedStr;
		else this.resourceB_Value.textContent = fixedStr;
		this.playersToInform = playersToInform;

		// ENABLE/DISABLE SWAP BUTTON
		this.#updateConfirmButtonDependingOnValues();
	}

	#setupHandlers() {
		// ICONS
		this.resourceA_Icon.onclick = () => this.myResourcesBar.handleNextResourceClick((resName, value) => {
			this.swapBtn.disabled = true;
			this.inputFilledByUser = 'SELL';
			this.resourceA_Icon.classList = `resource-icon ${resName}`;
			this.resourceA_tooltip.textContent = resName.charAt(0).toUpperCase() + resName.slice(1);
			// change requested resource to something different than offered
			if (this.resourceB_Icon.classList.item(1) === resName) {
				this.resourceB_Icon.classList = `resource-icon ${resName === 'chips' ? 'energy' : 'chips'}`;
				this.resourceB_tooltip.textContent = resName.charAt(0).toUpperCase() + resName.slice(1);
			}

			const defaultVal = resName === 'energy' ? value / 2 : value;
			this.resourceA_Value.textContent = formatCompact3Digits(defaultVal);
			this.resourceB_Value.textContent = "0";
		});
		this.resourceB_Icon.onclick = () => this.myResourcesBar.handleNextResourceClick((resName, value) => {
			this.swapBtn.disabled = true;
			this.inputFilledByUser = 'BUY';
			this.resourceB_Icon.classList = `resource-icon ${resName}`;
			this.resourceB_tooltip.textContent = resName.charAt(0).toUpperCase() + resName.slice(1);
			// change offered resource to something different than requested
			if (this.resourceA_Icon.classList.item(1) === resName) {
				this.resourceA_Icon.classList = `resource-icon ${resName === 'chips' ? 'energy' : 'chips'}`;
				this.resourceA_tooltip.textContent = resName.charAt(0).toUpperCase() + resName.slice(1);
			}
			
			this.resourceB_Value.textContent = "0";
		});
		// VALUES
		/** @param {'BUY' | 'SELL'} input */
		const handleValueInteraction = (input = 'BUY', andUpdate = false) => {
			const valueElement = input === 'BUY' ? this.resourceB_Value : this.resourceA_Value;
			this.inputFilledByUser = input;
			this.swapBtn.disabled = true;
			if (valueElement.textContent.trim() === '') valueElement.textContent = '0';
			if (andUpdate) this.update();
		}
		this.resourceA_Value.onclick = () => handleValueInteraction('SELL');
		this.resourceA_Value.oninput = () => handleValueInteraction('SELL', true);
		this.resourceB_Value.onclick = () => handleValueInteraction('BUY');
		this.resourceB_Value.oninput = () => handleValueInteraction('BUY', true);

		this.reverseResourcesBtn.onclick = () => this.#reverse();
		this.swapBtn.onclick = () => this.#handleConfirmSwap();
	}
	#reverse() {
		const tempIconClass = this.resourceA_Icon.classList.item(1);
		const tempTooltip = this.resourceA_tooltip.textContent;
		const tempValue = this.resourceA_Value.textContent;
		this.resourceA_Icon.classList = `resource-icon ${this.resourceB_Icon.classList.item(1)}`;
		this.resourceB_Icon.classList = `resource-icon ${tempIconClass}`;
		this.resourceA_tooltip.textContent = this.resourceB_tooltip.textContent;
		this.resourceB_tooltip.textContent = tempTooltip;
		this.resourceA_Value.textContent = this.resourceB_Value.textContent;
		this.resourceB_Value.textContent = tempValue;

		this.inputFilledByUser = this.inputFilledByUser === 'BUY' ? 'SELL' : 'BUY';
	}
	#getCurrentValues() {
		const rA_Name = this.resourceA_Icon.classList.item(1) || 'energy';
		const rA_Qty = parseInt(this.resourceA_Value.textContent || '0', 10);
		const rB_Name = this.resourceB_Icon.classList.item(1) || 'chips';
		const rB_Qty = parseInt(this.resourceB_Value.textContent || '0', 10);
		return { offeredResource: rA_Name, offeredQty: rA_Qty, requestedResource: rB_Name, requestedQty: rB_Qty };
	}
	#updateConfirmButtonDependingOnValues() {
		const takerOrder = this.gameClient.myPlayer.tradeHub.getTakerOrder;
		const { offeredQty, requestedQty } = this.#getCurrentValues();
		if (!this.swapBtnClicked && !takerOrder && offeredQty > 0 && requestedQty > 0) this.swapBtn.disabled = false;
		else this.swapBtn.disabled = true;

		const lastTakerOrderFullyFilled = this.gameClient.myPlayer.tradeHub.lastTakerOrderFullyFilled ? true : false;
		if (lastTakerOrderFullyFilled) this.gameClient.myPlayer.tradeHub.lastTakerOrderFullyFilled = false; // reset flag
		
		const hasFillingClass = this.swapBtn.classList.contains('filling');
		if (lastTakerOrderFullyFilled && hasFillingClass) {
			this.swapBtnText.textContent = 'Filled! 100%';
			this.swapBtnLoader.style.transform = `translateX(100%)`;
			return this.swapBtnClicked = false; // skip the rest of the update this turn
		}

		if (takerOrder || this.swapBtnClicked) {
			const [filled, sold] = [takerOrder?.filledAmount || 0, takerOrder?.soldAmount || 1];
			const fillingPerc = filled / sold * 100;
			this.swapBtnText.textContent = fillingPerc === 100 ? 'Filled! 100%' : `Filling... ${formatCompact2Digits(fillingPerc)}%`;
			this.swapBtn.classList.add('filling');
			this.swapBtnLoader.style.transform = `translateX(${fillingPerc}%)`;
		} else {
			this.swapBtnText.textContent = 'Confirm Swap';
			this.swapBtn.classList.remove('filling');
			this.swapBtnLoader.style.transform = `translateX(0%)`;
		}

		this.swapBtnClicked = false;
	}
	#handleConfirmSwap(expiry = 5) {
		const { offeredResource, offeredQty, requestedResource, requestedQty } = this.#getCurrentValues();
		if (offeredQty <= 0 || requestedQty <= 0) return;
		console.log(`%c Confirming swap:`, this.cssStyle);
		console.log(offeredResource, offeredQty, requestedResource, requestedQty);

		const action = {
			type: 'set-taker-order',
			soldResource: offeredResource,
			soldAmount: offeredQty,
			boughtResource: requestedResource,
			maxPricePerUnit: offeredQty / requestedQty,
			expiry: this.gameClient.height + 1 + expiry
		};
		this.gameClient.digestMyAction(action);
		this.swapBtnText.textContent = 'Broadcasting...';
		this.swapBtn.disabled = true; // feedback & prevent multiple clicks
		this.swapBtnClicked = true;

		// Inform players involved in the swap who can quickly intent 'fill-taker-order'
		for (const pid of this.playersToInform) this.gameClient.node.sendMessage(pid, action);
	}
}
export class TradeHubComponent {
	cssStyle = 'color: lightgreen; font-weight: bold;';
	gameClient;
	myResourcesBar;
	modal = document.getElementById('trade-hub-modal');
	closeBtn = this.modal.querySelector('.close-btn');
	myTradeOfferLinesWrapper = this.modal.querySelector('.my-trade-offer-lines-wrapper');

	/** @type {MyTradeOfferLineComponent[]} */
	myTradesOfferLines = [];
	moduleTree = new ModuleTreeComponent(this.modal.querySelector('.modules-wrapper'));
	swapComponent;

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient @param {import('./resources-bar.mjs').ResourcesBarComponent} myResourcesBar */
	constructor(gameClient, myResourcesBar) {
		this.gameClient = gameClient;
		this.myResourcesBar = myResourcesBar;
		this.swapComponent = new SwapComponent(gameClient, myResourcesBar);
		this.closeBtn.onclick = () => this.hide();
		this.#initModulesTree();
		this.myTradeOfferLinesWrapper.innerHTML = '';

		this.modal.onkeydown = (e) => {
			const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
			if ((e.key >= '0' && e.key <= '9') || allowedKeys.includes(e.key)) return;
			e.preventDefault();
		};
	}

	update() { // call only if tradeHub is present
		if (!this.#isVisible()) return;
		const tradeHub = this.gameClient?.myPlayer.tradeHub;
		if (!this.gameClient?.alive || !tradeHub) return this.hide();

		// UPDATE MODULES TREE
		const tradeHubLevel = tradeHub.level();
		this.moduleTree.updateLevel(tradeHubLevel);
		for (let i = 0; i < TRADE_HUB_MODULES.allModulesKeys.length; i++) {
			const m = TRADE_HUB_MODULES.allModulesKeys[i];
			const moduleLevel = tradeHub.modulesLevel[i] || 0;
			const description = TRADE_HUB_MODULES.getModuleDescription(m, moduleLevel);
			const { maxLevel, minBuildingLevel } = TRADE_HUB_MODULES.getModuleRequiredLevelAndMaxLevel(m) || {};
			const isClickable = tradeHubLevel >= minBuildingLevel && moduleLevel < maxLevel;
			this.moduleTree.updateModule(m, moduleLevel, description, isClickable);
		}
		
		// MAKE SURE ALL OFFER LINES ARE PRESENT
		const missingOfferLines = tradeHub.getMaxPublicOffers - this.myTradesOfferLines.length;
		for (let i = 0; i < missingOfferLines; i++)
			for (const r of RESOURCES_NAMES) // Create a line on a unused resource
				if (r === 'energy') continue;
				else if (this.myTradesOfferLines.some(l => l.offeredResourceName === r)) continue;
				else { this.#initMyTradeOfferLine(r, true); break;}

		// UPDATE MY TRADE OFFERS FROM MY LINES
		this.#updateTradeHubOffersFromMyLines();

		this.swapComponent.update(this.gameClient);
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
	#isVisible() { return this.modal.classList.contains('visible'); }

	#initModulesTree() {
		for (let i = 0; i < TRADE_HUB_MODULES.allModulesKeys.length; i++) {
			const moduleKey = TRADE_HUB_MODULES.allModulesKeys[i];
			const { minBuildingLevel, maxLevel } = TRADE_HUB_MODULES.getModuleRequiredLevelAndMaxLevel(moduleKey) || {};
			if (minBuildingLevel === undefined || maxLevel === undefined) return;
			const moduleElement = this.moduleTree.addModule(moduleKey, minBuildingLevel, maxLevel);
			moduleElement.mainElement.onclick = () => {
				const tradeHub = this.gameClient?.myPlayer.tradeHub;
				if (!this.gameClient?.alive || !tradeHub) return;
				if (!tradeHub.upgradePoints) return;

				const tradeHubLevel = tradeHub.level();
				const moduleLevel = tradeHub.modulesLevel[i] || 0;
				if (tradeHubLevel < minBuildingLevel || moduleLevel >= maxLevel) return;

				const myAction = { type: 'upgrade-module', buildingName: 'tradeHub', value: moduleKey };
				this.gameClient.digestMyAction(myAction);
				console.log('onclick module', myAction);
				this.moduleTree.updateModule(moduleKey, moduleLevel + 1); // feedback instantly
			};
		}
	}
	#initMyTradeOfferLine(r = 'energy', usePreset = false) {
		const lineComponent = new MyTradeOfferLineComponent(this.myResourcesBar, r);
		this.myTradesOfferLines.push(lineComponent);
		this.myTradeOfferLinesWrapper.appendChild(lineComponent.mainElement);
		if (!usePreset) return;

		// USE NEXT RESOURCE AS REQUESTED AND DOUBLE PRICE, ONLY WORKS WITH RAW RESOURCES
		const resourceIndex = RESOURCES_NAMES.indexOf(r);
		const rProdBasis = RAW_RESOURCES_PROD_BASIS[r] || 0;
		const nextResource = RESOURCES_NAMES[(resourceIndex + 1) % RESOURCES_NAMES.length] || 'chips';
		const nextRProdBasis = RAW_RESOURCES_PROD_BASIS[nextResource] || 0;
		if (rProdBasis === 0 || nextRProdBasis === 0) return;
		
		const requestedQty = Math.max(1, Math.ceil((nextRProdBasis / rProdBasis) * 2));
		lineComponent.setResourcesAndValues(r, 1, nextResource, requestedQty, 0, true);
	}
	#updateTradeHubOffersFromMyLines() {
		const tradeHub = this.gameClient.myPlayer.tradeHub;
		for (const lineComponent of this.myTradesOfferLines) {
			const { offeredResourceName, offeredQty, requestedResourceName, requestedQty, minStock, isActive } = lineComponent.getResourcesAndValues();
			if (typeof offeredQty !== 'number' || typeof requestedQty !== 'number' || typeof minStock !== 'number') continue;
			if (offeredQty <= 0 || requestedQty <= 0) continue;
			// offeredQty is useless, we always set 1

			const newId = tradeHub.setMyPublicTradeOffer(offeredResourceName, requestedResourceName, requestedQty, minStock, isActive);
			if (!newId) continue; // unchanged offer or invalid

			if (lineComponent.offerId) tradeHub.cancelPublicTradeOffer(lineComponent.offerId);
			lineComponent.offerId = newId;
		}
	}
}