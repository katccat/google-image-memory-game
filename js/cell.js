import { Config } from './config.js';
import { Graphics } from './graphics.js';
import { getLines } from './utils.js';
import { truncate } from './utils.js';
import { awaitTransition } from './utils.js';
import { waitForFlag } from './utils.js';

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
		this.recycled;
		this.rank;
		this.solvedLoop;

		this.elements = {
			parent: document.createElement('div'),
			card: document.createElement('div'),
			image: document.createElement('div'),
			labelBg: document.createElement('div'),
			label: document.createElement('div'),
			labelBuffer: document.createElement('div'),
			number: document.createElement('div'),
			front: document.createElement('div'),
		};
		this.elements.parent.className = 'cell-wrapper';

		this.elements.card.className = 'cell-card';
		this.elements.parent.appendChild(this.elements.card);

		this.elements.image.className = 'cell-back';
		this.elements.card.appendChild(this.elements.image);

		this.elements.labelBg.className = 'cell-label-bg';
		this.elements.image.appendChild(this.elements.labelBg);

		this.elements.label.className = 'cell-label';
		this.elements.labelBg.appendChild(this.elements.label);

		this.elements.labelBuffer.className = 'cell-label-buffer';
		this.elements.image.appendChild(this.elements.labelBuffer);

		this.elements.number.className = 'cell-number';
		this.elements.labelBg.appendChild(this.elements.number);

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
	setRank(rank) {
		this.rank = rank;
		this.elements.number.textContent = rank;
	}
	reveal() {
		this.state = Cell.State.DEFAULT;
		this.elements.parent.classList.toggle('fade-in', true);
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
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
		this.elements.labelBg.style.backgroundColor = color;
	}
}
export class CellSolvedLoop {
	constructor(game, ...cells) {
		let typingResolver, endResolver;
		const typingDone = new Promise(r => typingResolver = r);
		const endPromise = new Promise(r => endResolver = r);
		let ended = false;
		
		this.end = async function () {
			if (ended) return;
			ended = true;
			rankElements.forEach(e => e.classList.add('fade-in'));
			labelElements.forEach(e => e.classList.add('fade-out'));
			await new Promise(r => setTimeout(r, 1000));
			endResolver();
		};

		const labelElements = [];
		const rankElements = [];
		const bgElements = [];
		
		cells.forEach(cell => {
			cell.typingDone = typingDone;
			cell.endPromise = endPromise;
			labelElements.push(cell.elements.label);
			rankElements.push(cell.elements.number);
			bgElements.push(cell.elements.labelBg);
		});

		const text = cells[0].getDisplayName();
		const testElement = cells[0].elements.labelBuffer;
		const lines = getLines(testElement, text);

		bgElements.forEach(e => e.classList.add('fade-in'));
		const animation = Config.animation.slide.right;
		
		this.start = async () => {
			await Promise.all(bgElements.map(el => el.animate(animation.keyframes, animation.options).finished));

			while (true) {
				if (game.state.lost) {
					typingResolver()
					endResolver();
					return;
				}

				await Graphics.typeText(lines, ...labelElements);
				typingResolver()

				if (game.state.won) return;

				await new Promise(r => setTimeout(r, 2000));
				await Graphics.deleteText(...labelElements);
				await new Promise(r => setTimeout(r, 500));

				for (let i = cells.length - 1; i >= 0; i--) {
					if (cells[i].state === Cell.State.INACTIVE) cells.splice(i, 1);
				}
				if (cells.length === 0) return;
				console.log('running');
			}
		};
	}
}