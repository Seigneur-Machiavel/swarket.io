import { UpgradesTool } from '../game-logics/upgrades.mjs';
import { NodeInteractor } from '../game-logics/node-interactions.mjs';

export class PlayerStatsComponent {
	playerNameElem = document.getElementById('player-name');
	playerIdElem = document.getElementById('player-id');
	lifetimeElem = document.getElementById('lifetimeCount');
	connectionElem = document.getElementById('connectionCount');
	connectionMaxElem = document.getElementById('connectionMax');
	connectionOfferNotification = document.getElementById('connection-offer-notification');

	setPlayerName(name) { this.playerNameElem.textContent = name; }
	setPlayerId(id) { this.playerIdElem.textContent = id; }
	update(lifetime, connections, maxConnections) {
		this.lifetimeElem.textContent = lifetime;
		this.connectionElem.textContent = connections;
		this.connectionMaxElem.textContent = maxConnections;
	}
	showConnectionOfferNotification() {
		this.connectionOfferNotification.classList.add('visible');
	}
	hideConnectionOfferNotification() {
		this.connectionOfferNotification.classList.remove('visible');
	}
}

export class UpgradeOffersComponent {
	upgradeOffersWrapper = document.getElementById('upgrade-offers-wrapper');
	offer1 = document.getElementById('upgrade-offer-1');
	offer2 = document.getElementById('upgrade-offer-2');
	offer3 = document.getElementById('upgrade-offer-3');
	onOfferClick = (upgradeName) => { console.log(`Upgrade clicked: ${upgradeName}`); };

	displayOffers(offers = []) {
		for (let i = 1; i <= 3; i++) {
			const offerElem = this[`offer${i}`];
			offerElem.classList = `upgrade-offer ${offers[i - 1]}`;
			offerElem.onclick = () => this.onOfferClick(offers[i - 1]);
			const tooltipText = UpgradesTool.getUpgradeTooltipText(offers[i - 1]);
			offerElem.querySelector('.tooltip').textContent = tooltipText;
		}
		this.upgradeOffersWrapper.classList.add('visible');
	}
	hideOffers() { this.upgradeOffersWrapper.classList.remove('visible'); }
}

export class EnergyBarComponent {
	tooltip = document.getElementById('energy-tooltip');
	fill = document.getElementById('energy-fill');
	text = document.getElementById('energy-text');
	
	update(energy, maxEnergy) {
		const percentage = (energy / maxEnergy) * 100;
		this.fill.style.width = `${percentage}%`;
		this.fill.style.filter = `brightness(${30 + percentage * .8}%)`;
		this.text.textContent = `${percentage.toFixed(1)}%`;
		this.tooltip.textContent = `${energy.toFixed(1)}/${Math.round(maxEnergy)}`;
	}
}

export class ResourcesBarComponent {
	chipsCount = document.getElementById('chips-count');
	datasCount = document.getElementById('datas-count');
	modelsCount = document.getElementById('models-count');
	engineersCount = document.getElementById('engineers-count');

	update(resources) {
		this.chipsCount.textContent = Math.round(resources[1].chips);
		this.datasCount.textContent = Math.round(resources[1].datas);
		this.modelsCount.textContent = Math.round(resources[1].models);
		this.engineersCount.textContent = Math.round(resources[1].engineers);
	}
}

export class NodeCardComponent {
	nodeCardCloseBtn = document.getElementById('node-card-close-btn');
	nodeCardElem = document.getElementById('node-card');
	nodeNameElem = document.getElementById('node-card-name');
	nodeIdElem = document.getElementById('node-card-id');
	connectBtn = document.getElementById('node-card-connect-btn');
	chatBtn = document.getElementById('node-card-chat-btn');

	gameClient;
	visualizer;
	/** @type {string | null} */
	showingCardOfId = null;
	lastPosition = { x: 0, y: 0 };

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient @param {import('../visualizer.mjs').NetworkVisualizer} visualizer */
	constructor(gameClient, visualizer) {
		this.gameClient = gameClient;
		this.visualizer = visualizer;
		// use requestAnimationFrame for smoother position update
		const update = () => { this.#updateCard(); requestAnimationFrame(update); };
		requestAnimationFrame(update);
		this.nodeCardCloseBtn.onclick = () => this.hide();
	}
	show(playerId = 'toto') {
		if (!this.gameClient.players[playerId]) return;
		this.showingCardOfId = playerId;
		this.nodeCardElem.classList.add('visible');
		this.nodeNameElem.textContent = this.gameClient.players[playerId].name || 'PlayerName';
		this.nodeIdElem.textContent = playerId;
		this.nodeCardElem.style.display = 'flex';
	}
	hide() {
		this.showingCardOfId = null;
		this.nodeCardElem.classList.remove('visible');
	}

	#updateCard(positionTolerance = 2) {
		if (!this.showingCardOfId) return;
		const position = this.visualizer.networkRenderer.getNodePositionRelativeToCanvas(this.showingCardOfId);
		if (!position) return this.hide();

		const canConnect = NodeInteractor.canTryToConnect(this.gameClient, this.showingCardOfId);
		this.connectBtn.disabled = !canConnect;
		this.connectBtn.textContent = this.gameClient.connectionOffers[this.showingCardOfId] ? 'Confirm link' : 'Link offer';
		if (this.connectBtn.textContent === 'Link offer') this.connectBtn.onclick = () => NodeInteractor.tryToConnect(this.gameClient, this.showingCardOfId);
		else this.connectBtn.onclick = () => NodeInteractor.digestConnectionOffer(this.gameClient, this.showingCardOfId);

		const rightMouseButtonIsDown = this.visualizer.networkRenderer.rightMouseButtonIsDown;
		this.nodeCardElem.style.pointerEvents = rightMouseButtonIsDown ? 'none' : 'auto';
		if (!positionTolerance >= 0 && Math.abs(position.x - this.lastPosition.x) < positionTolerance && Math.abs(position.y - this.lastPosition.y) < positionTolerance) return;
		this.lastPosition = position;
		this.nodeCardElem.style.transform = `translate(${position.x + 4}px, ${position.y + 4}px)`;
	}
}