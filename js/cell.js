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

		this.elements = {
			parent: document.createElement('div'),
			contentContainer: document.createElement('div'),
			image: document.createElement('div'),
			text: document.createElement('div'),
			mask: document.createElement('div'),
		};
		this.elements.parent.className = 'cell-container';
		this.elements.parent.classList.toggle('show-loading', this.game.visualState.showLoading);

		this.elements.contentContainer.className = 'cell-content-container';
		this.elements.parent.appendChild(this.elements.contentContainer);

		this.elements.image.className = 'cell-image'
		this.elements.contentContainer.appendChild(this.elements.image);

		this.elements.text.className = 'cell-word-display';
		this.elements.contentContainer.appendChild(this.elements.text);

		this.elements.mask.className = 'cell-mask';
		this.elements.contentContainer.appendChild(this.elements.mask);

		this.elements.contentContainer.addEventListener('click', () => this.unhide());
	}
	getElement() {
		return this.elements.parent;
	}
	getName() {
		return this.id;
	}
	activate(word, src) {
		this.id = word;
		this.elements.text.textContent = word;
		this.elements.image.style.backgroundImage = `url(${src})`;
		if (this.img) {
			this.setOverlayImage(this.img);
		}
	}
	reveal() {
		this.state = Cell.State.DEFAULT;
		this.elements.contentContainer.classList.toggle('fade-in', true);
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.elements.parent.classList.toggle('show-loading', this.game.visualState.showLoading);
		this.elements.contentContainer.classList.toggle('fade-in', false);
	}
	hide() {
		this.state = Cell.State.DEFAULT;
		this.elements.mask.classList.toggle('fade-out', false);
	}
	unhide() {
		if (this.state !== Cell.State.DEFAULT || this.game.state.coolDown) return;
		this.state = Cell.State.REVEALED;
		this.elements.mask.classList.toggle('fade-out', true);
		if (this.game.visualState.splashNames && !this.game.state.viewedWords.includes(this.id)) {
			Graphics.splashTextInstant(this.id);
			this.game.state.viewedWords.push(this.id);
		}
		this.game.state.revealedCells.push(this);
	}
	solve() {
		this.state = Cell.State.SOLVED;
		this.elements.text.classList.toggle('fade-out', true);
		this.elements.image.classList.toggle('pause', true);
	}
	setOverlayImage(src) {
		this.elements.mask.style.backgroundImage = `url(${src})`;
	}
	setColor(color) {
		this.elements.mask.style.backgroundColor = color;
		if (!this.img && Math.random() < Config.funGlyphChance && this.game.state.usedGlyphs.length < Config.glyphs.length) {
			let glyph;
			do {
				glyph = randomItem(Config.glyphs);
			} while (this.game.state.usedGlyphs.includes(glyph));
			this.setOverlayImage(glyph);
			this.game.state.usedGlyphs.push(glyph);
		}
	}
}