export class LinkerComponent {
	gameClient;
	modal = document.getElementById('linker-modal');
	closeBtn = this.modal.querySelector('.close-btn');

	/** @param {import('../game-logics/game.mjs').GameClient} gameClient */
	constructor(gameClient) {
		this.gameClient = gameClient;
		this.closeBtn.onclick = () => this.hide();


	}

	update() { // call only if linker is present
		
		
	}

	show() { this.modal.classList.add('visible'); }
	hide() { this.modal.classList.remove('visible'); }
	toggle() { this.modal.classList.toggle('visible'); }
}