import { formatCompact2Digits, formatCompact3Digits } from '../utils.mjs';
import { newResourcesSet } from '../game-logics/resources.mjs';

export class ResourcesBarComponent {
	isSpectator = false; 			// flag to indicate if this is for spectator mode
	selectionEnabled = false; 		// flag to enable/disable resource click selection
	inventoriesWrapper;
	resourceBar;
	expandBtn;
	/** @type {Record<string, HTMLElement>} */
	resourceTierWrappers = {};
	/** @type {HTMLElement[]} */
	resourceValueElements = [];
	/** @type {HTMLElement[]} */
	resourceValueChangeElements = [];
	onResourceClickOneShot = null; 	// callbacks that will be removed after one call
	selectionTimeout = null; 		// timeout to reset selection mode

	constructor(spectator = false) {
		this.isSpectator = spectator;
		const selector = spectator ? '.resources-bar.spectator' : '.resources-bar';
		this.inventoriesWrapper = document.querySelector('.inventories-wrapper');
		this.resourceBar = this.inventoriesWrapper.querySelector(selector);
		this.resourceBarTitle = this.resourceBar.querySelector('.resource-bar-title');
		this.resourceBar.onclick = (e) => this.#handleResourceBarClick(e);
		this.expandBtn = this.#setupExpandButton();
		const resourcesSet = newResourcesSet();
		for (const tier in resourcesSet) {
			const tierWrapper = document.createElement('div');
			tierWrapper.classList = `resource-tier-wrapper`;
			this.resourceTierWrappers[tier] = tierWrapper;
			this.resourceBar.appendChild(tierWrapper);

			for (const res in resourcesSet[tier])
				tierWrapper.appendChild(this.#createResourceElement(res));
		}
	}

	/** @param {import('../game-logics/player.mjs').PlayerNode} player */
	update(player) {
		if (!player) return this.hide();
		this.show();
		
		for (let i = 0; i < this.resourceValueElements.length; i++) {
			const value = player.inventory.resources[i];
			this.resourceValueElements[i].textContent = formatCompact2Digits(value);

			if (this.isSpectator) this.resourceBarTitle.textContent = `${player.name}`;
			const change = player.inventory.turnChanges[i];
			if (change === 0) this.resourceValueChangeElements[i].textContent = '-';
			else this.resourceValueChangeElements[i].textContent = `${change > 0 ? '+' : ''}${formatCompact2Digits(change)} ${change > 0 ? '▲' : '▼'}`;
		
			if (change > 0) this.resourceValueChangeElements[i].classList.add('up');
			else this.resourceValueChangeElements[i].classList.remove('up');
			if (change < 0) this.resourceValueChangeElements[i].classList.add('down');
			else this.resourceValueChangeElements[i].classList.remove('down');
		}
	}
	handleNextResourceClick(callback, timeout = 5000) {
		this.#setSelectionEnabled(true);
		this.onResourceClickOneShot = callback;
		this.selectionTimeout = setTimeout(() => this.resetHandleNextResourceClick(), timeout);
	}
	resetHandleNextResourceClick() {
		this.#setSelectionEnabled(false);
		this.onResourceClickOneShot = null;
		if (this.selectionTimeout) clearTimeout(this.selectionTimeout);
		this.selectionTimeout = null;
	}
	#handleResourceBarClick(e) {
		const resourceElem = e.target.closest('.resource');
		const resourceName = resourceElem?.dataset?.resourceName;
		if (!resourceName) return;

		const resourceValue = resourceElem.querySelector('.resource-value')?.textContent;
		const asNumber = parseFloat(resourceValue);
		if (isNaN(asNumber)) return;
		if (this.onResourceClickOneShot) this.onResourceClickOneShot(resourceName, asNumber);
		this.resetHandleNextResourceClick();
	}
	#setupExpandButton() {
		const expandBtn = document.createElement('div');
		expandBtn.classList = 'expand-btn';
		expandBtn.onclick = () => this.resourceBar.classList.toggle('expanded');
		this.resourceBar.appendChild(expandBtn);
		return expandBtn;
	}
	#createResourceElement(resourceName) {
		/*
		<div class="resource"> // TEMPLATE
			<div class="tooltip">Energy</div>
			<div class="resource-icon energy"></div>
			<span class="resource-value" id="energy-count">0</span>
		</div>*/
		const resourceElement = document.createElement('div');
		resourceElement.classList = `resource`;
		resourceElement.dataset.resourceName = resourceName;

		const tooltip = document.createElement('div');
		tooltip.classList = 'tooltip';
		tooltip.textContent = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
		resourceElement.appendChild(tooltip);

		const icon = document.createElement('div');
		icon.classList = `resource-icon ${resourceName.toLowerCase()}`;
		resourceElement.appendChild(icon);

		const value = document.createElement('span');
		value.classList = 'resource-value';
		value.textContent = '0';
		resourceElement.appendChild(value);
		this.resourceValueElements.push(value);
		
		if (!this.isSpectator) {
			const valueChange = document.createElement('span');
			valueChange.classList = 'resource-value-change';
			resourceElement.appendChild(valueChange);
			this.resourceValueChangeElements.push(valueChange);
		}

		return resourceElement;
	}
	#setSelectionEnabled(enabled = false) {
		this.selectionEnabled = enabled;
		if (enabled) this.resourceBar.classList.add('selection-enabled');
		else this.resourceBar.classList.remove('selection-enabled');
	}
	hide() {
		this.resourceBar.classList.add('hidden');
		if (!this.isSpectator) return;
		this.inventoriesWrapper.classList.remove('spectating');
	}
	show() {
		this.resourceBar.classList.remove('hidden');
		if (!this.isSpectator) return;
		this.inventoriesWrapper.classList.add('spectating');
	}
}