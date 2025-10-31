class ProdParticle {
	lowCompute;
	tickBeforeSizeMod = 20;
	tickBeforeSlowDown = 120;
	rndRange = [-.3, .3];
	size;
	opacity = Math.random() + 1;

	xRndDecay = Math.random() * (this.rndRange[1] - this.rndRange[0]) + this.rndRange[0];
	yRndDecay = Math.random() * (this.rndRange[1] - this.rndRange[0]) + this.rndRange[0];
	x; y; text; textLen;

	constructor(size = 12, x = 0, y = 0, text = '', lowCompute = false) {
		this.lowCompute = lowCompute;
		this.size = size;
		this.x = x;
		this.y = y;
		this.text = text;
		this.textLen = text.length;
		this.size += 1;
		this.opacity += 1;
	}

	update() {
		// Accelerate according to the opacity
		const xMovBasis = this.tickBeforeSlowDown > 0 ? 1 + (Math.round(4 - this.opacity)) : 1;
		const yMovBasis = this.tickBeforeSlowDown > 0 ? 1 + (Math.round(2.5 - this.opacity)) : 1;
		this.tickBeforeSlowDown--;

		this.x += yMovBasis * .1;
		this.y += xMovBasis * -.001;

		// rdn the x, y position to make the particle more organic
		if (Math.random() < .05) this.xRndDecay = Math.random() * (this.rndRange[1] - this.rndRange[0]) + this.rndRange[0];
		if (Math.random() < .05) this.yRndDecay = Math.random() * (this.rndRange[1] - this.rndRange[0]) + this.rndRange[0];
		
		// APPLY THE RND DECAY
		this.x += this.xRndDecay;
		this.y += this.yRndDecay;
		
		this.tickBeforeSizeMod--;
		if (this.tickBeforeSizeMod <= 0) this.size *= .995;
		this.opacity *= .98;
	}
	/** @param {CanvasRenderingContext2D} ctx */
	drawTextInBubble(ctx) {
		ctx.globalAlpha = this.opacity > 1 ? 1 : this.opacity;

		const roundedX = this.lowCompute ? Math.round(this.x) : this.x;
		const roundedY = this.lowCompute ? Math.round(this.y) : this.y;

		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = `bolder ${Math.round(this.size)}px Consolas, monospace`;
		ctx.fillText(this.text, roundedX, roundedY); // Fill the text
		ctx.globalAlpha = 1.0;
	}
	isAlive() {
		return this.opacity > .02;
	}
}

export class ParticlesDisplayer {
	lowCompute = true;
	canvas = document.getElementById('particles-canvas');
	canvasDimensions = { width: 0, height: 0 };
	ctx = this.canvas.getContext('2d');
	/** @type {ProdParticle[]} */
	particles = [];
	testPosition = { x: 200, y: 200 };

	/** @param {number} size @param {number} [x] @param {number} [y] @param {string} [text] */
	addParticle(size = 12, x, y, text = 'toto') {
		const startX = x !== undefined ? x : this.testPosition.x;
		const startY = y !== undefined ? y : this.testPosition.y;
		this.particles.push(new ProdParticle(size, startX, startY, text, this.lowCompute));

	}
	render() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.particles = this.particles.filter(p => p.isAlive());

		// UPDATE EXISTING PARTICLES (ALIVE)
		for (const particle of this.particles) {
			particle.update();
			particle.drawTextInBubble(this.ctx);
			console.log('particle', particle);
		}
	}
	updateCanvasSizeAccordingToScreen() {
		const rect = document.body.getBoundingClientRect();
		const [width, height] = [Math.round(rect.width), Math.round(rect.height)];
		if (this.canvasDimensions.width === width && this.canvasDimensions.height === height) return;
		
		this.canvas.width = width;
		this.canvas.height = height;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.canvasDimensions = { width, height };
	}
	reset() {
		this.particles = [];
	}
}