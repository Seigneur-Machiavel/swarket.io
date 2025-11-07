/**
 * @type {import('./game.mjs').GameClient}
 */

export class NodeInteractor {
	/** @param {import('./game.mjs').GameClient} gameClient */
	static canTryToConnect(gameClient, nodeId = 'toto') {
		const { node, players } = gameClient;
		const player = players[nodeId];
		//if (player.isBot) return; // do not connect to bots
		if (player?.name?.includes('(Bot)')) return; // do not connect to bots
		if (nodeId === node.id || !node.peerStore.known[nodeId] || !player) return;
		if (node.peerStore.standardNeighborsList.includes(nodeId)) return; // already connected
		const selfCanConnect = node.peerStore.standardNeighborsList.length < players[node.id].getMaxConnections;
		const peerNeighbors = Object.keys(node.peerStore.known[nodeId].neighbors);
		const peerNeighborsCount = peerNeighbors.filter(id => !node.cryptoCodex.isPublicNode(id)).length;
		const targetCanConnect = peerNeighborsCount < player.getMaxConnections;
		if (selfCanConnect && targetCanConnect) return true;
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} nodeId */
	static tryToConnect(gameClient, nodeId = 'toto') {
		if (!nodeId || !gameClient.players[nodeId]) return;
		const canConnect = NodeInteractor.canTryToConnect(gameClient, nodeId);
		if (!canConnect) return console.log(`Cannot connect to ${nodeId}, connection conditions not met.`);
		gameClient.node.tryConnectToPeer(nodeId, 3);
		if (gameClient.verb > 1) console.log(`%cConnection offer sent to ${nodeId}`, 'color: orange');
	}
	/** @param {import('./game.mjs').GameClient} gameClient @param {string} nodeId */
	static digestConnectionOffer(gameClient, nodeId = 'toto') {
		const { offer } = gameClient.connectionOffers[nodeId] || {};
		if (!offer) return console.warn(`No connection offer from ${nodeId}`);
		const peerStore = gameClient.node.peerStore;
		if (peerStore.addConnectingPeer(nodeId, offer.signal, offer.offerHash) !== true) return;
		peerStore.assignSignal(nodeId, offer.signal, offer.offerHash, gameClient.node.time);
	}
	/** @param {import('./game.mjs').GameClient} gameClient */
	static dispatchPublicTradeOffers(gameClient) {
		const player = gameClient.myPlayer;
		if (!player.tradeHub) return;

		const expiry = gameClient.height + player.tradeHub.offersExpiryDefault;
		const publicOffers = player.tradeHub.publicOffers;
		const data = { topic: 'pto', data: [publicOffers, expiry] };
		gameClient.node.broadcast(data, undefined, player.tradeHub.getSignalRange);
		player.tradeHub.publicOffersDispatchRequested = false;
		player.tradeHub.offersExpiryCounter = player.tradeHub.offersExpiryDefault;
		if (gameClient.verb > 2) console.log(`%cDispatched ${Object.keys(publicOffers).length} public trade offers`, 'color: orange', publicOffers);
	}
}