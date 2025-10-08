import { NetworkRenderer } from './rendering/NetworkRenderer.mjs';

export class NetworkVisualizer {
	node;
	CryptoCodex;
	lastPeerInfo;
	networkRenderer = new NetworkRenderer();
	peersList = {};

	/** @param {import('hive-p2p').Node} node @param {import('hive-p2p').CryptoCodex} CryptoCodex @param {boolean} isSimulation */
	constructor(node, CryptoCodex, updateInfoInterval = 400) {
		this.#resetNetwork(node.id);
		this.node = node;
		this.CryptoCodex = CryptoCodex;

		setInterval(() => {
			const info = this.#getPeerInfo();
			this.#updateNetworkFromPeerInfo(info);
			this.networkRenderer.updateStats(this.node.topologist.NEIGHBORS_TARGET);
		}, updateInfoInterval);

		window.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowUp') console.log('ArrowUp');
			if (e.key === 'ArrowDown') console.log('ArrowDown');
		});
		if (false) {
			this.simulationInterface.onPeerMessage = (remoteId, data) => {
				if (data.route) this.networkRenderer.displayDirectMessageRoute(remoteId, data.route);
				else if (data.topic) this.networkRenderer.displayGossipMessageRoute(remoteId, data.senderId, data.topic, data.data);
			};
		}
	}
	/** Param: nodeId:string */
	onNodeLeftClick(callback) { this.networkRenderer.onNodeLeftClick = callback; }
	/** Param: nodeId:string */
	onNodeRightClick(callback) { this.networkRenderer.onNodeRightClick = callback; }
	displayDirectMessageRoute(fromId, route) { this.networkRenderer.displayDirectMessageRoute(fromId, route); }
	displayGossipMessageRoute(fromId, data) { this.networkRenderer.displayGossipMessageRoute(fromId, data.senderId, data.topic, data.data); }

	#resetNetwork(nodeId) {
		this.networkRenderer.maxDistance = 0; // reset maxDistance to show all nodes
		this.networkRenderer.avoidAutoZoomUntil = Date.now() + 2000; // avoid auto-zoom for 2 seconds
		this.networkRenderer.lastAutoZoomDistance = 0;
		this.networkRenderer.clearNetwork();
		this.networkRenderer.setCurrentPeer(nodeId);
	}	
	#getPeerInfo() {
		return {
			id: this.node.id,
			store: {
				connected: this.node.peerStore.neighborsList, // ids only
				connecting: Object.keys(this.node.peerStore.connecting), // ids only
				known: this.node.peerStore.known
			}
		}
	}
	#updateNetworkFromPeerInfo(peerInfo) {
		if (!peerInfo) return;
		this.lastPeerInfo = peerInfo;

		const newlyUpdated = {};
		const digestPeerUpdate = (id = 'toto', status = 'unknown', neighbors = []) => {
			const isPublic = this.CryptoCodex.isPublicNode(id);
			this.networkRenderer.addOrUpdateNode(id, status, isPublic, neighbors);
			newlyUpdated[id] = true;
		}

		const getNeighbors = (peerId) => {
			const knownPeer = peerInfo.store.known[peerId];
			return knownPeer ? Object.keys(knownPeer.neighbors || {}) : [];
		}
		
		const knownToIgnore = {};
		knownToIgnore[this.node.id] = true;
		for (const id of peerInfo.store.connecting) knownToIgnore[id] = true;
		for (const id of peerInfo.store.connected) knownToIgnore[id] = true;
		for (const id in peerInfo.store.known)
			if (!knownToIgnore[id]) digestPeerUpdate(id, 'known', getNeighbors(id));
		
		for (const id of peerInfo.store.connecting) digestPeerUpdate(id, 'connecting', getNeighbors(id));
		for (const id of peerInfo.store.connected) digestPeerUpdate(id, 'connected', getNeighbors(id));

		const nodes = this.networkRenderer.nodesStore.store;
		const nodeIds = this.networkRenderer.nodesStore.getNodesIds();
		for (const id of nodeIds) // filter absent nodes
			if (!newlyUpdated[id] && id !== this.node.id) this.networkRenderer.removeNode(id);

		// ensure current peer is updated
		if (peerInfo.id === this.node.id) digestPeerUpdate(peerInfo.id, 'current', getNeighbors(peerInfo.id));

		// Create connections
		const connections = [];
		for (const id in nodes)
			for (const neighborId of nodes[id].neighbors) connections.push([id, neighborId]);

		//console.log(`Updated network map: ${Object.keys(nodes).length} nodes | ${Object.keys(connections).length} connections`);
		this.networkRenderer.digestConnectionsArray(connections);
	}
}