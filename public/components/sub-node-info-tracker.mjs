import { formatCompact3Digits } from '../utils.mjs';

export class SubNodeInfoTrackerComponent {
	mainElement = document.getElementById('sub-node-info');
	playerNameElement = this.mainElement.querySelector('.player-name');
	productionsWrapper = this.mainElement.querySelector('.productions-wrapper');

	gameClient;
	visualizer;
	lastPosition = { x: 0, y: 0 };
	productions = {};
	updateEveryNFrames = 6;
	frameCounter = 0;

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient @param {import('../visualizer.mjs').NetworkVisualizer} visualizer */
	constructor(gameClient, visualizer) {
		this.gameClient = gameClient;
		this.visualizer = visualizer;
	}

	update() { // called each frame
		if (this.frameCounter++ < this.updateEveryNFrames) return;
		this.frameCounter = 0;

		const hoveredNode = this.visualizer.networkRenderer.hoveredNodeId;
		if (!hoveredNode) return this.hide();

		const p = this.gameClient.players[hoveredNode];
		if (!p) return this.hide();

		this.show();
		let playerName = p.name || `Player ${p.id}`;
		if (hoveredNode === this.gameClient.node.id) playerName += ' (Me)';
		this.playerNameElement.textContent = playerName;
		const productions = p?.rawProductions || {};
		this.#updateProductions(productions);
		this.#updatePosition(hoveredNode);
	}
	#updatePosition(playerId = 'toto', positionTolerance = 6) {
		const position = this.visualizer.networkRenderer.getNodePositionRelativeToCanvas(playerId);
		if (!position) return this.hide();

		if (positionTolerance >= 0 && Math.abs((position.x) - this.lastPosition.x) < positionTolerance && Math.abs(position.y - this.lastPosition.y) + 12 < positionTolerance) return;
		this.lastPosition = position;

		const cardWidth = this.mainElement.offsetWidth;
		position.x -= cardWidth / 2;

		const { x, y } = { x: Math.round(position.x), y: Math.round(position.y) };
		this.mainElement.style.transform = `translate(${x}px, ${y + 12}px)`;
	}
	#updateProductions(productions = {}) {
		// check if productions have changed
		let hasChanged = false;
		for (const r in productions) {
			if (productions[r] === this.productions[r]) continue;
			hasChanged = true;
			break;
		}

		if (!hasChanged) return;

		this.productionsWrapper.innerHTML = '';
		for (const r in productions) {
			this.productions[r] = productions[r];
			if (!productions[r]) continue; // don't show 0 productions
			const pElem = document.createElement('div');
			pElem.classList = `resource-icon ${r.toLowerCase()}`;
			this.productionsWrapper.appendChild(pElem);
		}
	}
	show() {
		this.mainElement.classList.add('visible');
	}
	hide() {
		this.mainElement.classList.remove('visible');
	}
}