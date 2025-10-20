export class AutoPlayer {
	logPrefix = '[AutoPlayer]';
	cssStyle = 'color: cyan';

	gameClient;
	NodeInteractor;
	deadNodesComponent;
	upgradeOffersComponent;

	/** Instance of AutoPlayer - can work with or without frontend.
	 * @param {import('../public/game-logics/game.mjs').GameClient} gameClient
	 * @param {import('../public/game-logics/node-interactions.mjs').NodeInteractor} NodeInteractor
	 * @param {import('../public/components/UI-components.mjs').DeadNodesComponent} deadNodesComponent
	 * @param {import('../public/components/UI-components.mjs').UpgradeOffersComponent} upgradeOffersComponent */
	constructor(gameClient, NodeInteractor, deadNodesComponent, upgradeOffersComponent) {
		this.gameClient = gameClient;
		this.NodeInteractor = NodeInteractor;
		this.deadNodesComponent = deadNodesComponent;
		this.upgradeOffersComponent = upgradeOffersComponent;
		
		const isFrontEndReady = deadNodesComponent && upgradeOffersComponent;
		console.log(`%c${this.logPrefix} initialized ${isFrontEndReady ? 'with' : 'without'} frontend`, this.cssStyle);
		if (isFrontEndReady) gameClient.onExecutedTurn.push(async (height = 0) => this.#onExecAutoPlay(height));
		else gameClient.onExecutedTurn.push(async (height = 0) => this.#onExecAutoPlayNoFront(height));
	}

	// SHARED METHODS
	#acceptPendingConnectionOffer() {
		const { connectionOffers, node } = this.gameClient;
		for (const fromId in connectionOffers) {
			this.NodeInteractor.digestConnectionOffer(this.gameClient, fromId);
			break; // accept only one per turn
		}
	}

	// AUTO PLAY WITH FRONTEND
	#onExecAutoPlay(height) {
		return; // disable auto-play for now DEBUG
		const firstDeadNodeId = Array.from(this.gameClient.deadPlayers)[0];
		const upgradeName = this.gameClient.myPlayer.upgradeOffers[0]?.[0];
		const { node, turnSystem, myPlayer, alive, selectedDeadNodeId } = this.gameClient;
		if (!alive) { node.destroy(); location.reload(); } // auto-reload page if dead

		// ATTEMPT TO RECYCLE THE SELECTED DEAD NODE
		if (!selectedDeadNodeId && firstDeadNodeId && this.deadNodesComponent.deadNodes[firstDeadNodeId]) {
			this.deadNodesComponent.setSelectedDeadNode(firstDeadNodeId);
			console.log(`%c${this.logPrefix} Selected dead node: ${firstDeadNodeId}`, this.cssStyle);
		}
	
		// ATTEMPT TO UPGRADE IF POSSIBLE
		if (upgradeName && height % 2 === 1) { // limit upgrade speed to 1 every 2 turns
			this.upgradeOffersComponent.onOfferClick(upgradeName);
			console.log(`%c${this.logPrefix} Upgraded: ${upgradeName}`, this.cssStyle);
		}

		this.#acceptPendingConnectionOffer();
	}

	// AUTO PLAY WITHOUT FRONTEND
	#onExecAutoPlayNoFront(height) {
		const firstDeadNodeId = Array.from(this.gameClient.deadPlayers)[0];
		const upgradeName = this.gameClient.myPlayer.upgradeOffers[0]?.[0];
		const { node, turnSystem, myPlayer, alive, selectedDeadNodeId } = this.gameClient;

		// ATTEMPT TO RECYCLE THE SELECTED DEAD NODE
		if (!selectedDeadNodeId && firstDeadNodeId && height % 3 === 0) {
			this.gameClient.selectedDeadNodeId = firstDeadNodeId;
			console.log(`%c${this.logPrefix} Selected dead node: ${firstDeadNodeId}`, this.cssStyle);
		}
		
		// ATTEMPT TO UPGRADE IF POSSIBLE
		if (upgradeName && height % 2 === 0) { // limit upgrade speed to 1 every 2 turns
			this.gameClient.digestMyAction({ type: 'upgrade', upgradeName });
			console.log(`%c${this.logPrefix} Upgraded: ${upgradeName}`, this.cssStyle);
		}

		this.#acceptPendingConnectionOffer();
	}
}