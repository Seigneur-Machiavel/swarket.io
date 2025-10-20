import { newResourcesSet } from '../game-logics/resources.mjs';

export class ResourcesBarComponent {
	selectionEnabled = false; // flag to enable/disable resource click selection
	resourceBar;
	expandBtn;
	/** @type {Record<string, HTMLElement>} */
	resourceTierWrappers = {};
	/** @type {HTMLElement[]} */
	resourceValueElements = [];
	onResourceClickOneShot = null; // callbacks that will be removed after one call

	constructor(spectator = false) {
		const selector = spectator ? '.resources-bar.spectator' : '.resources-bar';
		this.resourceBar = document.querySelector(selector);
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
		if (!player) return this.#hide();
		this.#show();
		for (let i = 0; i < this.resourceValueElements.length; i++) {
			const value = player.inventory.resources[i];
			this.resourceValueElements[i].textContent = value.toFixed(1);
		}
	}
	handleNextResourceClick(callback) {
		this.#setSelectionEnabled(true);
		this.onResourceClickOneShot = callback;
	}
	resetHandleNextResourceClick() {
		this.#setSelectionEnabled(false);
		this.onResourceClickOneShot = null;
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
		icon.classList = `resource-icon ${resourceName}`;
		resourceElement.appendChild(icon);

		const value = document.createElement('span');
		value.classList = 'resource-value';
		value.id = `${resourceName}-count`;
		value.textContent = '0';
		resourceElement.appendChild(value);
		this.resourceValueElements.push(value);

		return resourceElement;
	}
	#setSelectionEnabled(enabled = false) {
		this.selectionEnabled = enabled;
		if (enabled) this.resourceBar.classList.add('selection-enabled');
		else this.resourceBar.classList.remove('selection-enabled');
	}
	#hide() { this.resourceBar.classList.add('hidden'); }
	#show() { this.resourceBar.classList.remove('hidden'); }
}