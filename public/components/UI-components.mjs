// IN THIS FILE WE GROUPED THE LIGHTS UI COMPONENTS USED IN THE GAME
// OTHER COMPLEX COMPONENTS ARE IN SEPARATE FILES, BUT IMPORTED > EXPORTED HERE

import { UpgradesTool } from '../game-logics/upgrades.mjs';
import { NodeInteractor } from '../game-logics/node-interactions.mjs';
import { ReactorComponent } from './reactor.mjs';
import { FabricatorComponent } from './fabricator.mjs';
import { TradeHubComponent } from './tradehub.mjs';
import { ResourcesBarComponent } from './resources-bar.mjs';
import { NodeCardComponent } from './node-card.mjs';
export { ResourcesBarComponent, NodeCardComponent };

export class PlayerStatsComponent {
	playerNameElem = document.getElementById('player-name');
	playerIdElem = document.getElementById('player-id');
	lifetimeElem = document.getElementById('lifetimeCount');
	connectionCountWrapper = document.getElementById('connectionCountWrapper');
	connectionElem = document.getElementById('connectionCount');
	connectionMaxElem = document.getElementById('connectionMax');
	connectionOfferNotification = document.getElementById('connection-offer-notification');

	setPlayerName(playerName) { this.playerNameElem.textContent = playerName; }
	setPlayerId(id) { this.playerIdElem.textContent = id; }
	/** @param {import('../game-logics/player.mjs').PlayerNode} player @param {number} connections */
	update(player, connections, lifetimeAsDate = true) {
		const l = lifetimeAsDate ? new Date(player.lifetime * 1000).toISOString().substr(11, 8) : player.lifetime;
		this.lifetimeElem.textContent = l;
		this.connectionElem.textContent = connections;
		this.connectionMaxElem.textContent = player.getMaxConnections;
	}
	showConnectionOfferNotification() {
		this.connectionOfferNotification.classList.add('visible');
	}
	hideConnectionOfferNotification() {
		this.connectionOfferNotification.classList.remove('visible');
	}
}

export class ConnectionsListComponent {
	connectionsListWrapper = document.getElementById('connections-list-wrapper');
	connectionsListCloseBtn = document.getElementById('connections-list-close-btn');
	connectionsList = document.getElementById('connections-list');
	connectionsItemTemplate = this.connectionsList.querySelector('.connection-item');

	/** @type {Record<string, HTMLElement>} */
	connections = {}; // { nodeId: element, ... }
	gameClient;

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
		this.connectionsListCloseBtn.onclick = () => this.hide();
	}

	update() {
		this.connectionsList.innerHTML = '';
		this.connections = {};
		const offers = this.gameClient.connectionOffers;
		for (const nodeId in offers) this.#createConnectionItem(nodeId, 'Pending');

		const neighbors = this.gameClient.node.peerStore.standardNeighborsList;
		for (const nodeId of neighbors) this.#createConnectionItem(nodeId, 'Connected');

		if (Object.keys(this.connections).length === 0) {
			const noConnectionsElem = document.createElement('div');
			noConnectionsElem.classList = 'connection-item';
			noConnectionsElem.textContent = 'No connections, no offers...';
			noConnectionsElem.style.opacity = '0.5';
			noConnectionsElem.style.fontSize = '0.9em';
			noConnectionsElem.style.padding = '8px';
			this.connectionsList.appendChild(noConnectionsElem);
		}
	}
	/** @param {string} nodeId @param {'Connected' | 'Pending'} connStatus */
	#createConnectionItem(nodeId, connStatus) {
		if (this.connections[nodeId]) return; // already exists
		const playerName = this.gameClient.players[nodeId]?.name || 'PlayerName';
		const item = this.connectionsItemTemplate.cloneNode(true);
		item.querySelector('.connection-item-name').textContent = playerName;
		item.querySelector('.connection-item-id').textContent = nodeId;
		item.querySelector('.connection-item-status').textContent = connStatus;
		item.querySelector('.connection-item-action').textContent = connStatus === 'Pending' ? 'Accept' : 'Kick';
		item.querySelector('.connection-item-action').classList = `connection-item-action ${connStatus === 'Pending' ? 'accept' : 'remove'}`;
		item.querySelector('.connection-item-action').onclick = () => {
			if (connStatus === 'Connected') this.gameClient.node.kickPeer(nodeId);
			else NodeInteractor.digestConnectionOffer(this.gameClient, nodeId);
		}
		item.querySelector('.connection-item-view-card').onclick = () => this.gameClient.showingCardOfId = nodeId;
		this.connections[nodeId] = item;
		this.connectionsList.appendChild(item);
	}
	show() {
		this.connectionsListWrapper.classList.add('visible');
	}
	hide() {
		this.connectionsListWrapper.classList.remove('visible');
	}
}

export class UpgradeOffersComponent {
	offerSelectedOnLastTurn = false;
	upgradeOffersWrapper = document.getElementById('upgrade-offers-wrapper');
	offer1 = document.getElementById('upgrade-offer-1');
	offer2 = document.getElementById('upgrade-offer-2');
	offer3 = document.getElementById('upgrade-offer-3');

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	displayOffers(gameClient) {
		const offers = gameClient.alive ? gameClient.myPlayer.upgradeOffers[0] : [];
		const offerSelectedOnLastTurn = this.offerSelectedOnLastTurn ? true : false;
		this.offerSelectedOnLastTurn = false;
		if (!offers || offers.length === 0) return this.hideOffers();
		if (offerSelectedOnLastTurn) return; // prevent re-showing if already selected

		for (let i = 1; i <= 3; i++) {
			const offerName = offers[i - 1];
			const offerElem = this[`offer${i}`];
			const { tooltip, subClass } = UpgradesTool.getUpgradeTooltipText(offerName);
			offerElem.classList = `upgrade-offer ${offers[i - 1]}`;
			if (subClass) offerElem.classList.add(subClass);
			offerElem.onclick = () => {
				this.#setSelectedOffer(i);
				gameClient.digestMyAction({ type: 'upgrade', upgradeName: offerName });
				this.offerSelectedOnLastTurn = true;
			}
			offerElem.querySelector('.tooltip').textContent = tooltip;
		}
		this.upgradeOffersWrapper.classList.add('visible');
		// console.log(`%cUpgrade offers displayed: ${offers.join(', ')}`, 'color: green; font-weight: bold;');
	}
	hideOffers() { this.upgradeOffersWrapper.classList.remove('visible'); }
	#setSelectedOffer(index = 1) {
		for (let i = 1; i <= 3; i++) {
			const offerElem = this[`offer${i}`];
			if (i === index) offerElem.classList.add('selected');
			else offerElem.classList.remove('selected');
		}
	}
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

export class BuildingsComponent {
	gameClient;
	myResourcesBar;
	icons = {
		reactor: document.getElementById('reactor-icon'),
		fabricator: document.getElementById('fabricator-icon'),
		tradeHub: document.getElementById('trade-hub-icon'),
	}
	upgradePointsElements = {
		reactor: document.getElementById('reactor-upgrade-points'),
		fabricator: document.getElementById('fabricator-upgrade-points'),
		tradeHub: document.getElementById('trade-hub-upgrade-points'),
	}

	reactor;		// COMPONENT
	fabricator;		// COMPONENT
	tradeHub;		// COMPONENT

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient @param {ResourcesBarComponent} myResourcesBar */
	constructor(gameClient, myResourcesBar) {
		this.gameClient = gameClient;
		this.myResourcesBar = myResourcesBar;

		this.reactor = new ReactorComponent(gameClient);
		this.fabricator = new FabricatorComponent(gameClient);
		this.tradeHub = new TradeHubComponent(gameClient, myResourcesBar);

		this.icons.reactor.onclick = () => this.#handleIconClick('reactor');
		this.icons.fabricator.onclick = () => this.#handleIconClick('fabricator');
		this.icons.tradeHub.onclick = () => this.#handleIconClick('tradeHub');
	}

	update() {
		this.#updateUpgradePoints();
		this.#updateSubComponents();
	}
	#updateUpgradePoints() {
		const player = this.gameClient.myPlayer;
		const points = {
			reactor: player.reactor?.upgradePoints || 0,
			fabricator: player.fabricator?.upgradePoints || 0,
			tradeHub: player.tradeHub?.upgradePoints || 0,
		}

		for (const b in this.upgradePointsElements) {
			this.upgradePointsElements[b].textContent = points[b];
			if (points[b] > 0) this.upgradePointsElements[b].classList.add('visible');
			else this.upgradePointsElements[b].classList.remove('visible');
		}
	}
	#updateSubComponents() {
		const player = this.gameClient.myPlayer;
		for (const b in this.icons) {
			if (!player[b]) { this.icons[b].classList.remove('visible'); continue; }
			this.icons[b].classList.add('visible');
			this[b].update();
		}
	}

	/** @param {'reactor' | 'fabricator' | 'tradeHub'} buildingName */
	#handleIconClick(buildingName) {
		if (!this[buildingName]) return;

		for (const b in this.icons)
			if (b === buildingName) this[b].toggle();
			else this[b].hide();
	}
}

export class DeadNodesComponent {
	deadNodesWrapper = document.getElementById('dead-nodes-wrapper');
	deadNodeTemplate = this.deadNodesWrapper.querySelector('.dead-node-notification');

	/** @type {Record<string, HTMLElement>} */
	deadNodes = {};
	gameClient;
	selectedDeadNodeId = null;

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.deadNodesWrapper.innerHTML = '';
		this.gameClient = gameClient;
	}

	showDeadNodes() {
		const nodeIds = this.gameClient.deadPlayers;
		for (const nodeId of nodeIds)
			if (this.gameClient.myPlayer.id === nodeId) continue; // don't show self
			else if (this.deadNodes[nodeId]) continue; // already shown
			else this.#pushDeadNodeNotification(nodeId);

		for (const nodeId in this.deadNodes)
			if (!nodeIds.has(nodeId)) this.#removeDeadNodeNotification(nodeId);

		if (this.gameClient.selectedDeadNodeId === this.selectedDeadNodeId) return;
		if (this.selectedDeadNodeId) this.deadNodes[this.selectedDeadNodeId]?.classList.remove('selected');
		this.selectedDeadNodeId = null;
		this.gameClient.selectedDeadNodeId = null;
	}
	#pushDeadNodeNotification(nodeId = '') {
		//console.log('Adding dead node notification for', nodeId);
		const deadNodeElem = this.deadNodeTemplate.cloneNode(true);
		const tooltip = deadNodeElem.querySelector('.dead-node-tooltip-id');
		tooltip.textContent = nodeId;
		const resources = deadNodeElem.querySelectorAll('.resource-value');
		for (const r of resources) {
			const resourceName = r.getAttribute('data-resource-name');
			r.textContent = this.gameClient.players[nodeId]?.inventory.getAmount(resourceName).toFixed(1);
		}

		this.deadNodes[nodeId] = deadNodeElem;
		this.deadNodesWrapper.appendChild(deadNodeElem);
		deadNodeElem.onclick = () => this.setSelectedDeadNode(nodeId);
		console.log(`Dead node notification added: ${nodeId}`);
	}
	setSelectedDeadNode(nodeId = '') {
		const deadNodeElem = this.deadNodes[nodeId];
		if (this.selectedDeadNodeId === nodeId) return; // already selected
		if (this.selectedDeadNodeId) this.deadNodes[this.selectedDeadNodeId].classList.remove('selected');
		deadNodeElem.classList.add('selected');
		this.gameClient.selectedDeadNodeId = nodeId;
		this.selectedDeadNodeId = nodeId;
	}
	#removeDeadNodeNotification(nodeId = '') {
		if (!this.deadNodes[nodeId]) return;
		this.deadNodes[nodeId].remove();
		delete this.deadNodes[nodeId];
		console.log(`Dead node notification removed: ${nodeId}`);
	}
}