import { RAW_RESOURCES_PROD_BASIS } from './game-logics/resources.mjs';

export class AutoPlayer {
	logPrefix = '[AutoPlayer]';
	cssStyle = 'color: cyan';

	gameClient;
	NodeInteractor;
	deadNodesComponent;
	upgradeOffersComponent;
	readyToRecycleDelay = 10;

	/** Instance of AutoPlayer - can work with or without frontend.
	 * @param {import('./game-logics/game.mjs').GameClient} gameClient
	 * @param {import('./game-logics/node-interactions.mjs').NodeInteractor} NodeInteractor
	 * @param {import('./components/UI-components.mjs').DeadNodesComponent} deadNodesComponent
	 * @param {import('./components/UI-components.mjs').UpgradeOffersComponent} upgradeOffersComponent */
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
		const firstDeadNodeId = Array.from(this.gameClient.deadPlayers)[0];
		const upgradeName = this.gameClient.myPlayer.upgradeOffers[0]?.[0];
		const { node, turnSystem, myPlayer, alive, selectedDeadNodeId } = this.gameClient;
		if (!alive) { node.destroy(); location.reload(); } // auto-reload page if dead

		// ATTEMPT TO RECYCLE THE SELECTED DEAD NODE
		if (!selectedDeadNodeId && firstDeadNodeId && this.deadNodesComponent.deadNodes[firstDeadNodeId]) {
			if (this.readyToRecycleDelay-- <= 0) {
				this.readyToRecycleDelay = 5;
				this.deadNodesComponent.setSelectedDeadNode(firstDeadNodeId);
				console.log(`%c${this.logPrefix} Selected dead node: ${firstDeadNodeId}`, this.cssStyle);
			}
		}
	
		// ATTEMPT TO UPGRADE IF POSSIBLE
		if (upgradeName && height % 2 === 1) { // limit upgrade speed to 1 every 2 turns
			this.upgradeOffersComponent.onOfferClick(0 + 1, upgradeName);
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
		if (!selectedDeadNodeId && firstDeadNodeId) {
			if (this.readyToRecycleDelay-- <= 0) {
				this.readyToRecycleDelay = 10;
				this.gameClient.selectedDeadNodeId = firstDeadNodeId;
				console.log(`%c${this.logPrefix} Selected dead node: ${firstDeadNodeId}`, this.cssStyle);
			}
		} else this.readyToRecycleDelay = 10;
		
		// ATTEMPT TO UPGRADE IF POSSIBLE
		if (upgradeName && height % 2 === 0) { // limit upgrade speed to 1 every 2 turns
			this.gameClient.digestMyAction({ type: 'upgrade', upgradeName });
			console.log(`%c${this.logPrefix} Upgraded: ${upgradeName}`, this.cssStyle);
		}

		// ACCEPT CONNECTION OFFERS
		this.#acceptPendingConnectionOffer();

		// SET PUBLIC TRADE OFFERS (RANDOM PRICES)
		const tradeHub = myPlayer.tradeHub;
		if (Math.random() < .04) tradeHub?.cancelAllPublicTradeOffers(); // random cancel all offers
		if (tradeHub && Object.keys(tradeHub.publicOffers).length === 0)
			this.#setRandomOfferRelatedToProductions();
	}
	#setRandomOfferRelatedToProductions() {
		const RRPB = RAW_RESOURCES_PROD_BASIS;
		RRPB.energy = .5; // add energy basis for calculations
		for (const offeredResource in this.gameClient.myPlayer.rawProductions) {
			const offeredBasis = RRPB[offeredResource];
			const prod = this.gameClient.myPlayer.rawProductions[offeredResource];
			if (!prod || prod <= 0) continue;

			for (const requestedResource in RRPB) {
				if (requestedResource === offeredResource) continue;
				
				const rnd = Math.random() * .95 + 1.05; // random from 1.05 to 2.0
				const requestedBasis = RRPB[requestedResource];
				const price = parseFloat((requestedBasis / offeredBasis * rnd).toFixed(2));
				if (price <= 0) continue;
				this.gameClient.myPlayer.tradeHub?.setMyPublicTradeOffer(offeredResource, requestedResource, price, 50, true);
			}
		}
	}
}