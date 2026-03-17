import { Config } from './config.js';
import { Graphics } from './graphics.js';
import { getLines } from './utils.js';
import { truncate } from './utils.js';

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
		this.displayName;
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
	getDisplayName() {
		return this.displayName;
	}
	activate(word, src, src2) {
		this.id = word;
		this.displayName = truncate(word.toLowerCase(), 42);
		this.elements.labelBuffer.innerText = this.displayName;
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
	}
	setFrontGlyph(src) {
		this.elements.front.style.backgroundImage = `url(${src})`;
	}
	writeOnFront(text) {
		this.elements.front.textContent = text;
	}
	setFontColor(color) {
		this.elements.front.style.color = color;
	}
	setFrontColor(color) {
		this.elements.front.style.backgroundColor = color;
	}
	setBackColor(color) {
		this.elements.label.style.backgroundColor = color;
	}
}
export async function CellSolvedLoop(game, ...cells) {
	const run = async () => {
		await Graphics.typeText(lines, ...elements);
		resolvers.forEach(r => r());
		if (game.state.coolDown) return;

		await new Promise(r => setTimeout(r, 3000));
		await Graphics.deleteText(...elements);
		await new Promise(r => setTimeout(r, 1000));

		for (let i = cells.length - 1; i >= 0; i--) {
			if (cells[i].state === Cell.State.INACTIVE) {
				cells.splice(i, 1);
			}
		}
		if (cells.length > 0) run();
	};

	const elements = [];
	const resolvers = [];
	cells.forEach(cell => {
		cell.typingDone = new Promise(r => resolvers.push(r));
		elements.push(cell.elements.label);
	});
	const text = cells[0].getDisplayName();
	const testElement = cells[0].elements.labelBuffer;
	const lines = getLines(testElement, text);
	elements.forEach(element => element.classList.add('fade-in'));
	const animation = Config.animation.slide.right;
	await Promise.all(elements.map(el => el.animate(animation.keyframes, animation.options).finished));
	run();
}