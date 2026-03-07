import { Config } from './config.js';
import { Graphics } from './graphics.js';
import { randomItem } from './utils.js';

export class Cell {
	static State = {
		DEFAULT: 'default',
		REVEALED: 'revealed',
		SOLVED: 'solved',
		INACTIVE: 'inactive',
	};

	constructor(game) {
		this.game = game;
		this.state = Cell.State.INACTIVE;
		this.id;
		this.img;
		this.sibling;

		this.elements = {
			parent: document.createElement('div'),
			card: document.createElement('div'),
			image: document.createElement('div'),
			label: document.createElement('div'),
			front: document.createElement('div'),
		};
		this.elements.parent.className = 'cell-wrapper';
		this.elements.parent.classList.toggle('show-loading', this.game.visualState.showLoading);

		this.elements.card.className = 'cell-card';
		this.elements.parent.appendChild(this.elements.card);

		this.elements.image.className = 'cell-back';
		this.elements.card.appendChild(this.elements.image);

		this.elements.label.className = 'cell-label';
		this.elements.image.appendChild(this.elements.label);

		this.elements.front.className = 'cell-front';
		this.elements.card.appendChild(this.elements.front);

		this.elements.parent.addEventListener('click', () => this.unhide());
	}
	getElement() {
		return this.elements.parent;
	}
	getName() {
		return this.id;
	}
	activate(word, src) {
		this.id = word;
		//this.elements.label.textContent = word.toLowerCase();
		this.elements.image.style.backgroundImage = `url(${src})`;
		if (this.img) {
			this.setOverlayImage(this.img);
		}
	}
	reveal() {
		this.state = Cell.State.DEFAULT;
		this.elements.parent.classList.toggle('fade-in', true);
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.elements.parent.classList.toggle('show-loading', this.game.visualState.showLoading);
		this.elements.parent.classList.toggle('fade-in', false);
	}
	hide() {
		this.state = Cell.State.DEFAULT;
		this.elements.card.classList.toggle('unhide', false);
	}
	shake() {
		this.elements.parent.animate(Config.animation.shake.keyframes, Config.animation.shake.options);
	}
	unhide() {
		if (this.state !== Cell.State.DEFAULT || this.game.state.coolDown) return;
		//this.game.state.cellsFading = false;
		this.state = Cell.State.REVEALED;
		this.elements.card.classList.toggle('unhide', true);
		if (!this.game.state.viewedWords.includes(this.id)) this.game.state.viewedWords.push(this.id);
		this.game.state.revealedCells.push(this);
	}
	solve() {
		this.state = Cell.State.SOLVED;
		//typeText(this.elements.label, this.id.toLowerCase());
		this.startSolvedLoop();
	}
	setOverlayImage(src) {
		this.elements.front.style.backgroundImage = `url(${src})`;
	}
	setColor(color) {
		this.elements.front.style.backgroundColor = color;
		if (!this.img && Math.random() < Config.funGlyphChance && this.game.state.usedGlyphs.length < Config.glyphs.length) {
			let glyph;
			do {
				glyph = randomItem(Config.glyphs);
			} while (this.game.state.usedGlyphs.includes(glyph));
			this.setOverlayImage(glyph);
			this.game.state.usedGlyphs.push(glyph);
		}
	}
	setOverlayColor(color) {
		this.elements.label.style.backgroundColor = color;
	}
	async startSolvedLoop() {

		const run = async () => {

			// type text while sliding in
			await typeText(this.elements.label, this.id.toLowerCase());

			// hold
			await new Promise(r => setTimeout(r, 3000));
			await deleteText(this.elements.label);
			await new Promise(r => setTimeout(r, 1000));
			run(); // loop
		};
		this.elements.label.classList.toggle('fade-in', true);
		const animation = Config.animation.slide.right;
		await this.elements.label.animate(animation.keyframes, animation.options).finished;
		run();
	}
}


async function typeText(element, text, delayMs = 150) {
	element.textContent = '';
	for (const char of text) {
		element.textContent += char;
		await new Promise(resolve => setTimeout(resolve, delayMs));
	}
}
async function deleteText(element, delayMs = 30) {
	const text = element.textContent;
	for (const char of text) {
		element.textContent = element.textContent.slice(0, -1);
		await new Promise(resolve => setTimeout(resolve, delayMs));
	}
}