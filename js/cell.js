import { Config } from './config.js';
import { Graphics } from './graphics.js';
import { randomItem } from './utils.js';
import { getLines } from './utils.js';

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
		this.labelLines;

		this.elements = {
			parent: document.createElement('div'),
			card: document.createElement('div'),
			image: document.createElement('div'),
			label: document.createElement('div'),
			labelBuffer: document.createElement('div'),
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

		this.elements.labelBuffer.className = 'cell-label-buffer';
		this.elements.image.appendChild(this.elements.labelBuffer);

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
		this.elements.labelBuffer.innerText = word.toLowerCase();
		this.elements.image.style.backgroundImage = `url(${src})`;
		if (this.img) {
			this.setFrontGlyph(this.img);
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
		this.elements.card.classList.add('solved');
		this.startSolvedLoop();
	}
	setFrontGlyph(src) {
		this.elements.front.style.backgroundImage = `url(${src})`;
	}
	setFrontColor(color) {
		this.elements.front.style.backgroundColor = color;
	}
	setBackColor(color) {
		this.elements.label.style.backgroundColor = color;
	}
	async startSolvedLoop() {
		const run = async () => {

			// type text while sliding in
			await typeText(this.elements.label, this.labelLines);

			// hold
			await new Promise(r => setTimeout(r, 3000));
			await deleteText(this.elements.label);
			await new Promise(r => setTimeout(r, 1000));
			if (this.state !== Cell.State.INACTIVE) run(); // loop
		};
		this.labelLines = getLines(this.elements.labelBuffer, this.id.toLowerCase());
		console.log(this.labelLines);
		this.elements.label.classList.toggle('fade-in', true);
		const animation = Config.animation.slide.right;
		await this.elements.label.animate(animation.keyframes, animation.options).finished;
		run();
	}
}


async function typeText(element, text, delayMs = 150) {
	element.innerHTML = '';
	for (let i = 0; i < text.length; i++) {
		for (const char of text[i]) {
			element.innerHTML += char;
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
		if (i < text.length - 1) element.innerHTML += ' <br>';
	}
}
async function deleteText(element, delayMs = 30) {
	while (element.innerHTML.length > 0) {
		const html = element.innerHTML;
		// if the last characters are a tag e.g. <br>, strip the whole tag
		if (html.endsWith('>')) {
			element.innerHTML = html.replace(/<[^>]+>$/, '');
		} else {
			element.innerHTML = html.slice(0, -1);
		}
		await new Promise(resolve => setTimeout(resolve, delayMs));
	}
}