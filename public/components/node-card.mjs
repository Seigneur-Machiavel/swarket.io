import { NodeInteractor } from '../game-logics/node-interactions.mjs';

export class NodeCardComponent {
	nodeCardCloseBtn = document.getElementById('node-card-close-btn');
	nodeCardElem = document.getElementById('node-card');
	nodeNameElem = document.getElementById('node-card-name');
	nodeIdElem = document.getElementById('node-card-id');
	chatBtn = document.getElementById('node-card-chat-btn');
	connectBtn = document.getElementById('node-card-connect-btn');
	tradeOfferBtn = document.getElementById('node-card-trade-offer-btn');
	nodeCardRemoteOfferBtn = document.getElementById('node-card-remote-offer-btn');

	nodeCardOfferViewer = document.getElementById('node-card-offer-viewer');
	nodeCardOfferViewerCloseBtn = document.getElementById('node-card-offer-viewer-close-btn');
	resourceA = this.nodeCardOfferViewer.getElementsByClassName('resource')[0];
	resourceAIcon = this.resourceA.querySelector('.resource-icon');
	resourceAValue = this.resourceA.querySelector('.resource-value');
	resourceATooltip = this.resourceA.querySelector('.tooltip');
	resourceB = this.nodeCardOfferViewer.getElementsByClassName('resource')[1];
	resourceBIcon = this.resourceB.querySelector('.resource-icon');
	resourceBValue = this.resourceB.querySelector('.resource-value');
	resourceBTooltip = this.resourceB.querySelector('.tooltip');
	nodeCardCancelOfferBtn = document.getElementById('node-card-cancel-offer-btn');
	nodeCardConfirmOfferBtn = document.getElementById('node-card-confirm-offer-btn');
	myOfferChanged = false; // flag to indicate if we confirmed an offer change
	showingMyOffer = false;
	showingRemoteOffer = false;

	gameClient;
	visualizer;
	myResourcesBar;
	spectatorResourcesBar;
	lastPosition = { x: 0, y: 0 };

	/**
	 * @param {import('../game-logics/game.mjs').GameClient} gameClient
	 * @param {import('../visualizer.mjs').NetworkVisualizer} visualizer
	 * @param {import('./resources-bar.mjs').ResourcesBarComponent} myResourcesBar
	 * @param {import('./resources-bar.mjs').ResourcesBarComponent} spectatorResourcesBar */
	constructor(gameClient, visualizer, myResourcesBar, spectatorResourcesBar) {
		this.gameClient = gameClient;
		this.visualizer = visualizer;
		this.myResourcesBar = myResourcesBar;
		this.spectatorResourcesBar = spectatorResourcesBar;
		// use requestAnimationFrame for smoother position update
		const update = () => { this.#updateCard(); requestAnimationFrame(update); };
		requestAnimationFrame(update);
		this.nodeCardCloseBtn.onclick = () => this.hide();
		this.tradeOfferBtn.onclick = () => this.showMyOffer(true); // true = toggle
		this.nodeCardRemoteOfferBtn.onclick = () => this.showRemoteOffer(true); // true = toggle
		this.nodeCardOfferViewerCloseBtn.onclick = () => this.hideOfferViewer();

		this.#setupResourceHandlers();
		this.nodeCardCancelOfferBtn.onclick = () => this.#handleOfferCancellation();
		this.nodeCardConfirmOfferBtn.onclick = () => this.#handleOfferConfirmation();
	}

	show(playerId = 'toto') {
		if (!this.gameClient.players[playerId]) return;
		this.hideOfferViewer();

		this.gameClient.showingCardOfId = playerId;
		this.nodeCardElem.classList.add('visible');
		this.nodeNameElem.textContent = this.gameClient.players[playerId].name || 'PlayerName';
		this.nodeIdElem.textContent = playerId;
		this.nodeCardElem.classList.add('clicked');
		setTimeout(() => this.nodeCardElem.classList.remove('clicked'), 300);
	}
	hide() {
		this.gameClient.showingCardOfId = null;
		this.nodeCardElem.classList.remove('visible');
		this.spectatorResourcesBar.hide();
	}
	showMyOffer(closeIfOpen = false) {
		if (closeIfOpen && this.showingMyOffer) return this.hideOfferViewer();

		this.nodeCardCancelOfferBtn.disabled = true;
		this.resourceAIcon.classList = 'resource-icon energy';
		this.resourceAValue.textContent = "0";
		this.resourceBIcon.classList = 'resource-icon chips';
		this.resourceBValue.textContent = "0";

		const { resourceName, requestedResourceName } = this.#updateMyOfferAttributes() || {};
		this.#showOfferViewer('outgoing', resourceName, requestedResourceName);
	}
	showRemoteOffer(closeIfOpen = false) {
		if (closeIfOpen && this.showingRemoteOffer) return this.hideOfferViewer();
		const { resourceName, requestedResourceName } = this.#updateRemoteOfferAttributes() || {};
		if (!resourceName || !requestedResourceName) return; // no offer to show
		this.#showOfferViewer('incoming', resourceName, requestedResourceName);
	}
	hideOfferViewer() {
		this.nodeCardElem.classList.remove('offer-viewer-display');
		this.showingMyOffer = false;
		this.showingRemoteOffer = false;
	}
	update() { // CALLED AT THE END OF EACH TURN
		if (this.myOfferChanged) { this.myOfferChanged = false; return; } // skip one update after change
		if (this.showingRemoteOffer) this.#updateRemoteOfferAttributes();
		this.#setOfferViewerConfirmButtonAttributes();
	}

	/** OFFER VIEWER PRIVATE METHODS */
	#setupResourceHandlers() {
		const toogleButtonsState = () => {
			const { resourceAValue, resourceBValue } = this.#getOfferViewerOfferedResources();
			this.nodeCardConfirmOfferBtn.disabled = !(resourceAValue > 0 && resourceBValue > 0);
			const existingOffer = this.gameClient.myPlayer.tradeHub?.getPrivateTradeOffer(this.gameClient.showingCardOfId) || null;
			this.nodeCardCancelOfferBtn.disabled = existingOffer ? false : true;
		};
		/** @param {HTMLElement} elementIcon @param {HTMLElement} elementValue @param {HTMLElement} elementTooltip @param {string} resName @param {number} value @param {string} pronoun */
		const handleResourceNameAndValue = (elementIcon, elementValue, elementTooltip, resName, value, pronoun = 'I') => {
			elementIcon.classList = `resource-icon ${resName}`;
			const defaultVal = resName === 'energy' ? value / 2 : value;
			elementValue.textContent = defaultVal.toFixed(3).replace(/\.?0+$/, '');
			elementTooltip.textContent = `${pronoun} send: ${resName.charAt(0).toUpperCase() + resName.slice(1)}`;
			toogleButtonsState();
		};
		this.resourceAIcon.onclick = () => this.myResourcesBar.handleNextResourceClick((resName, value) => {
			handleResourceNameAndValue(this.resourceAIcon, this.resourceAValue, this.resourceATooltip, resName, value, 'I');
			console.log('Offered resource A changed to', resName, value);
		});
		this.resourceBIcon.onclick = () => this.spectatorResourcesBar.handleNextResourceClick((resName, value) => {
			handleResourceNameAndValue(this.resourceBIcon, this.resourceBValue, this.resourceBTooltip, resName, value, 'He');
			console.log('Offered resource B changed to', resName, value);
		});
		this.resourceAValue.oninput = () => toogleButtonsState();
		this.resourceBValue.oninput = () => toogleButtonsState();
		this.nodeCardOfferViewer.onkeydown = (e) => {
			const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'];
			if ((e.key >= '0' && e.key <= '9') || allowedKeys.includes(e.key)) return;
			e.preventDefault();
		};
	}
	#getRemoteOffer() {
		const playerId = this.gameClient.showingCardOfId;
		if (!playerId) return null;
		return playerId ? this.gameClient.players[playerId].tradeHub?.getPrivateTradeOffer(this.gameClient.myPlayer.id) : null;
	}
	#updateMyOfferAttributes() {
		const playerId = this.gameClient.showingCardOfId;
		const myExistingOffer = playerId ? this.gameClient.myPlayer.tradeHub?.getPrivateTradeOffer(playerId) : null;
		const { resourceName, amount, requestedResourceName, requestedAmount } = myExistingOffer || {};
		if (!resourceName || !requestedResourceName) return;

		this.nodeCardCancelOfferBtn.disabled = false;
		this.#setOfferViewerIconsAndValues(myExistingOffer);
		return { resourceName, requestedResourceName };
	}
	#updateRemoteOfferAttributes(closeIfNoneOffer = true) {
		const remoteOffer = this.#getRemoteOffer();
		if (!remoteOffer) return closeIfNoneOffer ? this.hideOfferViewer() : null;
		return this.#setOfferViewerIconsAndValues(remoteOffer);
	}
	#setOfferViewerIconsAndValues(offer) {
		const { resourceName, amount, requestedResourceName, requestedAmount } = offer;
		this.resourceAIcon.classList = `resource-icon ${resourceName}`;
		this.resourceAValue.textContent = (amount).toFixed(3).replace(/\.?0+$/, '');
		this.resourceBIcon.classList = `resource-icon ${requestedResourceName}`;
		this.resourceBValue.textContent = (requestedAmount).toFixed(3).replace(/\.?0+$/, '');
		return { resourceName, amount, requestedResourceName, requestedAmount };
	}
	#setOfferViewerConfirmButtonAttributes() {
		const myExistingOffer = this.gameClient.myPlayer.tradeHub?.getPrivateTradeOffer(this.gameClient.showingCardOfId) || null;
		const aValue = parseFloat(this.resourceAValue.textContent) || 0;
		const bValue = parseFloat(this.resourceBValue.textContent) || 0;
		const bothValueFilled = (aValue > 0 && bValue > 0) ? true : false;
		const oneValueChanged = aValue !== myExistingOffer?.amount || bValue !== myExistingOffer?.requestedAmount;
		this.nodeCardCancelOfferBtn.disabled = myExistingOffer ? false : true;
		this.nodeCardConfirmOfferBtn.textContent = myExistingOffer ? 'Modify Offer' : 'Send Offer';
		this.nodeCardConfirmOfferBtn.disabled = bothValueFilled && oneValueChanged ? false : true; // prepared for outgoing
		if (this.showingMyOffer || !this.showingRemoteOffer) return;
		
		// OVERRIDE WITH REMOTE OFFER IF NEEDED
		this.nodeCardConfirmOfferBtn.textContent = 'Accept Offer';
		this.nodeCardConfirmOfferBtn.disabled = true;
		
		const offerer = this.gameClient.players[this.gameClient.showingCardOfId];
		const offer = this.#getRemoteOffer();
		if (!offer || !offerer) return;

		const { resourceName, amount, requestedResourceName, requestedAmount } = offer;
		const offererStock = offerer.inventory.getAmount(resourceName);
		const selfStock = this.gameClient.myPlayer.inventory.getAmount(requestedResourceName);
		if (offererStock < amount || selfStock < requestedAmount) return;
		this.nodeCardConfirmOfferBtn.disabled = false;
	}
	#getOfferViewerOfferedResources() {
		const resourceAName = this.resourceAIcon.classList[1];
		const resourceAValue = parseFloat(this.resourceAValue.textContent) || 0;
		const resourceBName = this.resourceBIcon.classList[1];
		const resourceBValue = parseFloat(this.resourceBValue.textContent) || 0;
		return { resourceAName, resourceAValue, resourceBName, resourceBValue };
	}
	#showOfferViewer(type = 'outgoing', resourceNameA = 'energy', resourceNameB = 'chips') {
		this.nodeCardElem.classList.add('offer-viewer-display');
		this.resourceAIcon.style.pointerEvents = type === 'outgoing' ? 'auto' : 'none';
		this.resourceBIcon.style.pointerEvents = type === 'outgoing' ? 'auto' : 'none';
		this.resourceA.classList.remove('requested', 'offered');
		this.resourceB.classList.remove('offered', 'requested');
		this.resourceA.classList.add(type === 'outgoing' ? 'offered' : 'requested');
		this.resourceB.classList.add(type === 'outgoing' ? 'requested' : 'offered');
		this.resourceATooltip.textContent = `${type === 'outgoing' ? 'I' : 'He'} send: ${resourceNameA.charAt(0).toUpperCase() + resourceNameA.slice(1)}`;
		this.resourceBTooltip.textContent = `${type === 'outgoing' ? 'He' : 'I'} send: ${resourceNameB.charAt(0).toUpperCase() + resourceNameB.slice(1)}`;
		
		this.showingMyOffer = type === 'outgoing' ? true : false;
		this.showingRemoteOffer = type === 'incoming' ? true : false;
	}
	#handleOfferCancellation() {
		if (!this.showingMyOffer && !this.showingRemoteOffer) return;
		const playerId = this.gameClient.showingCardOfId;
		if (!playerId) return;

		const action = { type: 'cancel-private-trade-offer', targetPlayerId: playerId };
		this.gameClient.digestMyAction(action);
		this.#lockCancelConfirmButtonsForFeedback();
	}
	#handleOfferConfirmation() {
		if (!this.showingMyOffer && !this.showingRemoteOffer) return;
		const playerId = this.gameClient.showingCardOfId;
		if (!playerId) return;

		const { resourceAName, resourceAValue, resourceBName, resourceBValue } = this.#getOfferViewerOfferedResources();
		if (this.showingMyOffer) { // SEND OR MODIFY OFFER
			console.log(`Sending/modifying trade offer to ${playerId}: Send ${resourceAValue} ${resourceAName}, Request ${resourceBValue} ${resourceBName}`);
			const action = {
				type: 'set-private-trade-offer',
				resourceName: resourceAName,
				amount: resourceAValue,
				requestedResourceName: resourceBName,
				requestedAmount: resourceBValue,
				targetPlayerId: playerId,
			};
			this.gameClient.digestMyAction(action);
			this.#lockCancelConfirmButtonsForFeedback();
		} else if (this.showingRemoteOffer) { // ACCEPT OFFER
			console.log(`Accepting trade offer from ${playerId}`);
			const action = { type: 'take-private-trade-offer', offererId: playerId };
			this.gameClient.digestMyAction(action);
		}
	}
	#lockCancelConfirmButtonsForFeedback() {
		this.myOfferChanged = true;
		this.nodeCardCancelOfferBtn.disabled = true;
		this.nodeCardConfirmOfferBtn.disabled = true;
	}

	/** PLAYER CARD PRIVATE METHODS */
	#updateCardPositionCounter = 0;
	#updateCard(connectedOnly = false) { // CALLED EACH FRAME
		const playerId = this.gameClient.showingCardOfId;
		const remotePlayer = playerId ? this.gameClient.players[playerId] : null;
		if (!playerId || !remotePlayer) return this.nodeCardElem.classList.remove('visible');

		this.nodeCardElem.classList.add('visible');
		this.nodeNameElem.textContent = remotePlayer.name || 'PlayerName';
		this.nodeIdElem.textContent = playerId;

		const isConnected = this.gameClient.node.peerStore.neighborsList.includes(playerId);
		const rightMouseButtonIsDown = this.visualizer.networkRenderer.rightMouseButtonIsDown;
		if (rightMouseButtonIsDown) this.nodeCardElem.classList.add('noPointerEvents');
		else this.nodeCardElem.classList.remove('noPointerEvents');

		this.#updateCardPosition(playerId);
		this.#updateCardConnectionButton(isConnected);
		this.#updateCardTradeOfferButton(connectedOnly ? isConnected : true);
		this.#updateCardRemoteOfferButton(connectedOnly ? isConnected : true);
	}
	#updateCardPosition(playerId = 'toto', positionTolerance = 12) {
		const position = this.visualizer.networkRenderer.getNodePositionRelativeToCanvas(playerId);
		if (!position) return this.hide();

		this.#updateCardPositionCounter--;
		if (positionTolerance >= 0 && Math.abs((position.x + 4) - this.lastPosition.x) < positionTolerance && Math.abs(position.y - this.lastPosition.y) < positionTolerance) return;
		if (this.#updateCardPositionCounter <= 0) return this.#updateCardPositionCounter = 60;
		this.lastPosition = position;
		const { x, y } = { x: Math.round(position.x), y: Math.round(position.y) };
		this.nodeCardElem.style.transform = `translate(${x + 12 + 4}px, ${y + 12}px)`;
	}
	#updateCardConnectionButton(isConnected) {
		const playerId = this.gameClient.showingCardOfId;
		const canConnect = NodeInteractor.canTryToConnect(this.gameClient, playerId);
		const hasOffer = this.gameClient.connectionOffers[playerId];
		this.connectBtn.disabled = !canConnect && !isConnected;
		if (canConnect) this.connectBtn.textContent = hasOffer ? 'Accept connection' : 'Offer connection';
		else if (isConnected) this.connectBtn.textContent = 'Disconnect';
		
		if (isConnected) this.connectBtn.onclick = () => this.gameClient.node.kickPeer(playerId);
		else if (!hasOffer) this.connectBtn.onclick = () => NodeInteractor.tryToConnect(this.gameClient, playerId);
		else this.connectBtn.onclick = () => NodeInteractor.digestConnectionOffer(this.gameClient, playerId);
	}
	#updateCardTradeOfferButton(isConnected) {
		const hasTradeHub = this.gameClient.myPlayer.tradeHub;
		this.tradeOfferBtn.disabled = !hasTradeHub || !isConnected;
		if (this.showingMyOffer && (!hasTradeHub || !isConnected)) this.hideOfferViewer();
	}
	#updateCardRemoteOfferButton(isConnected) {
		const hasTradeHub = this.gameClient.myPlayer.tradeHub ? true : false;
		const playerId = this.gameClient.showingCardOfId;
		const remoteOffer = playerId ? this.gameClient.players[playerId].tradeHub?.getPrivateTradeOffer(this.gameClient.myPlayer.id) : null;
		const hasRemoteOffer = remoteOffer ? true : false;
		const offerAvailable = hasTradeHub && isConnected && hasRemoteOffer;
		this.nodeCardRemoteOfferBtn.disabled = !hasTradeHub || !isConnected || !hasRemoteOffer;
		if (this.showingRemoteOffer && !offerAvailable) this.hideOfferViewer();
	}
}