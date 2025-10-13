import { UpgradesTool } from '../game-logics/upgrades.mjs';
import { NodeInteractor } from '../game-logics/node-interactions.mjs';
import { ReactorComponent } from './reactor-component.mjs';
import { FabricatorComponent } from './fabricator-component.mjs';
import { LinkerComponent } from './linker-component.mjs';

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
	update(player, connections) {
		this.lifetimeElem.textContent = player.lifetime;
		this.connectionElem.textContent = connections;
		this.connectionMaxElem.textContent = player.maxConnections;
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
		item.querySelector('.connection-item-action').textContent = connStatus === 'Pending' ? 'Accept' : 'Remove';
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
	onOfferClick = (upgradeName) => { console.log(`Upgrade clicked: ${upgradeName}`); };

	displayOffers(offers = []) {
		if (this.offerSelectedOnLastTurn) return this.offerSelectedOnLastTurn = false; // prevent re-showing if already selected

		for (let i = 1; i <= 3; i++) {
			const offerElem = this[`offer${i}`];
			offerElem.classList = `upgrade-offer ${offers[i - 1]}`;
			offerElem.onclick = () => {
				this.onOfferClick(offers[i - 1]);
				this.offerSelectedOnLastTurn = true;
			}
			const tooltipText = UpgradesTool.getUpgradeTooltipText(offers[i - 1]);
			offerElem.querySelector('.tooltip').textContent = tooltipText;
		}
		this.upgradeOffersWrapper.classList.add('visible');
		// console.log(`%cUpgrade offers displayed: ${offers.join(', ')}`, 'color: green; font-weight: bold;');
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

export class BuildingsComponent {
	gameClient;
	icons = {
		reactor: document.getElementById('reactor-icon'),
		fabricator: document.getElementById('fabricator-icon'),
		linker: document.getElementById('linker-icon')
	}

	reactor;		// COMPONENT
	fabricator;		// COMPONENT
	linker;			// COMPONENT

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;

		this.reactor = new ReactorComponent(gameClient);
		this.fabricator = new FabricatorComponent(gameClient);
		this.linker = new LinkerComponent(gameClient);

		this.icons.reactor.onclick = () => this.#handleIconClick('reactor');
		this.icons.fabricator.onclick = () => this.#handleIconClick('fabricator');
		this.icons.linker.onclick = () => this.#handleIconClick('linker');
	}

	updateSubComponents() {
		const player = this.gameClient.myPlayer;
		for (const b in this.icons) {
			if (!player[b]) { this.icons[b].classList.remove('visible'); continue; }
			this.icons[b].classList.add('visible');
			this[b].update();
		}
	}

	/** @param {'reactor' | 'fabricator' | 'linker'} buildingName */
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
			r.textContent = Math.round(this.gameClient.players[nodeId]?.resourcesByTier[1][resourceName] || 0);
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

export class NodeCardComponent {
	nodeCardCloseBtn = document.getElementById('node-card-close-btn');
	nodeCardElem = document.getElementById('node-card');
	nodeNameElem = document.getElementById('node-card-name');
	nodeIdElem = document.getElementById('node-card-id');
	connectBtn = document.getElementById('node-card-connect-btn');
	chatBtn = document.getElementById('node-card-chat-btn');

	gameClient;
	visualizer;
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
		this.gameClient.showingCardOfId = playerId;
		this.nodeCardElem.classList.add('visible');
		this.nodeNameElem.textContent = this.gameClient.players[playerId].name || 'PlayerName';
		this.nodeIdElem.textContent = playerId;
	}
	hide() {
		this.gameClient.showingCardOfId = null;
		this.nodeCardElem.classList.remove('visible');
	}
	#updateCard(positionTolerance = 2) {
		const playerId = this.gameClient.showingCardOfId;
		if (!playerId) return this.nodeCardElem.classList.remove('visible');

		this.nodeCardElem.classList.add('visible');
		this.nodeNameElem.textContent = this.gameClient.players[playerId].name || 'PlayerName';
		this.nodeIdElem.textContent = playerId;

		const position = this.visualizer.networkRenderer.getNodePositionRelativeToCanvas(playerId);
		if (!position) return this.hide();

		const canConnect = NodeInteractor.canTryToConnect(this.gameClient, playerId);
		const gotConnectionOffer = this.gameClient.connectionOffers[playerId];
		this.connectBtn.disabled = !canConnect;
		this.connectBtn.textContent = gotConnectionOffer ? 'Confirm link' : 'Link offer';
		if (!gotConnectionOffer) this.connectBtn.onclick = () => NodeInteractor.tryToConnect(this.gameClient, playerId);
		else this.connectBtn.onclick = () => NodeInteractor.digestConnectionOffer(this.gameClient, playerId);

		const rightMouseButtonIsDown = this.visualizer.networkRenderer.rightMouseButtonIsDown;
		if (rightMouseButtonIsDown) this.nodeCardElem.classList.add('noPointerEvents');
		else this.nodeCardElem.classList.remove('noPointerEvents');
		if (!positionTolerance >= 0 && Math.abs(position.x - this.lastPosition.x) < positionTolerance && Math.abs(position.y - this.lastPosition.y) < positionTolerance) return;
		this.lastPosition = position;
		this.nodeCardElem.style.transform = `translate(${position.x + 4}px, ${position.y + 4}px)`;
	}
}