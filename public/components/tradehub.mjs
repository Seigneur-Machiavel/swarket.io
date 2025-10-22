import { ModuleTreeComponent } from './modules-tree.mjs';
import { TRADE_HUB_MODULES } from '../game-logics/buildings-modules.mjs';
import { RESOURCES_NAMES } from '../game-logics/resources.mjs';

class ElementsBuilder {
	static createMyTradeOfferLine(offeredResourceName = 'energy') {
		const requestedResourceName = offeredResourceName !== 'chips' ? 'chips' : 'energy';
		const lineElem = document.createElement('div');
		lineElem.classList = 'my-trade-offer-line';

		const offeredResource = ElementsBuilder.createResourceElement('I', offeredResourceName, 0, true);
		offeredResource.resourceElem.classList.add('offered');
		lineElem.appendChild(offeredResource.resourceElem);
		
		lineElem.appendChild(ElementsBuilder.createArrowElement());

		const requestedResource = ElementsBuilder.createResourceElement('He', requestedResourceName, 0, true);
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
	/** @param {string} pronoun @param {string} resourceName @param {number} qty @param {boolean} editable */
	static createResourceElement(pronoun, resourceName, qty, editable) {
		const resourceElem = document.createElement('div');
		resourceElem.classList = 'resource';

		const tooltipElem = document.createElement('div');
		tooltipElem.classList = 'tooltip';
		tooltipElem.textContent = `${pronoun} send: ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}`;
		resourceElem.appendChild(tooltipElem);

		const resourceIconElem = document.createElement('div');
		resourceIconElem.classList = `resource-icon ${resourceName}`;
		if (!editable) resourceIconElem.style.cursor = 'default';

		const resourceValueElem = document.createElement('span');
		resourceValueElem.classList = 'resource-value';
		if (editable) resourceValueElem.setAttribute('contenteditable', 'true');
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
			elementValue.textContent = (value / 10).toFixed(1);
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
}

export class TradeHubComponent {
	gameClient;
	myResourcesBar;
	modal = document.getElementById('trade-hub-modal');
	closeBtn = this.modal.querySelector('.close-btn');
	myTradeOfferLinesWrapper = this.modal.querySelector('.my-trade-offer-lines-wrapper');

	/** @type {MyTradeOfferLineComponent[]} */
	myTradesOfferLines = [];
	moduleTree = new ModuleTreeComponent(this.modal.querySelector('.modules-wrapper'));

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient @param {import('./resources-bar.mjs').ResourcesBarComponent} myResourcesBar */
	constructor(gameClient, myResourcesBar) {
		this.gameClient = gameClient;
		this.myResourcesBar = myResourcesBar;
		this.closeBtn.onclick = () => this.hide();
		this.#initModulesTree();
		this.myTradeOfferLinesWrapper.innerHTML = '';

		this.myTradeOfferLinesWrapper.onkeydown = (e) => {
			const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
			if ((e.key >= '0' && e.key <= '9') || allowedKeys.includes(e.key)) return;
			e.preventDefault();
		};
	}

	update() { // call only if tradeHub is present
		const tradeHub = this.gameClient?.myPlayer.tradeHub;
		if (!this.gameClient?.alive || !tradeHub) return this.hide();

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
				if (this.myTradesOfferLines.some(l => l.offeredResourceName === r)) continue;
				else { this.#initMyTradeOfferLine(r); break;}

		// UPDATE MY TRADE OFFERS FROM MY LINES
		this.#updateTradeHubOffersFromMyLines();
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }

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

	/** MY TRADE OFFERS */
	#initMyTradeOfferLine(r = 'energy') {
		const lineComponent = new MyTradeOfferLineComponent(this.myResourcesBar, r);
		this.myTradesOfferLines.push(lineComponent);
		this.myTradeOfferLinesWrapper.appendChild(lineComponent.mainElement);
	}
	#updateTradeHubOffersFromMyLines() {
		const tradeHub = this.gameClient.myPlayer.tradeHub;
		for (const lineComponent of this.myTradesOfferLines) {
			const { offeredResourceName, offeredQty, requestedResourceName, requestedQty, minStock, isActive } = lineComponent.getResourcesAndValues();
			if (typeof offeredQty !== 'number' || typeof requestedQty !== 'number' || typeof minStock !== 'number') continue;
			if (offeredQty <= 0 || requestedQty <= 0) continue;

			const existingId = lineComponent.offerId;
			if (existingId) tradeHub.cancelPublicTradeOffer(existingId);
			
			const newId = tradeHub.setPublicTradeOffer(offeredResourceName, offeredQty, requestedResourceName, requestedQty, minStock, isActive);
			lineComponent.offerId = newId;
		}
	}

	/** WORLD TRADE OFFERS */
}