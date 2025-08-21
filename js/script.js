import { GridLayout } from './gridlayout.js';

class Game {
	static config = {
		fadeDelay: 700,
		category: {
			all: './words/images.json',
			dogs: './words/dogs.json',
			apple: './words/apple.json',
		},
		funColorChance: 0.2,
		funGlyphChance: 0.6,
		colors: [
			'#ed6a5e', // red
			'#86b2f9', // blue
			'#fdd868', // yellow
			'#76d590', // green
		],
		messages: {
			intro: ["I'm feeling lucky"],
			victory: ["I'm not a robot", "reCAPTCHA'd", "Great!"],
			perfect: ['Perfect!', "I'm feeling lucky"],
			failure: ["Aw, snap!", "That's an error.", "Please try again", "Only human!"],
		},
		glyphs: [
			"images/download_arrow.png",
			"images/mandarin.png",
			"images/puzzle.png",
			"images/share.png",
			"images/office.png",
			"images/cog.png",
			"images/search.png",
			"images/contact.png",
		],
		introImages: [
			'images/im.png',
			'images/not.png',
			'images/a.png',
			'images/robot.png',
		],
	};
	static elements = {
		grid: document.getElementById('grid'),
		gridContainer: document.getElementById('grid-container'),
		tooltip: document.getElementById('tooltip'),
		levelDisplay: document.getElementById('level-counter'),
		splashText: document.getElementById('splash-text'),
		splashContainer: document.getElementById('splash-container'),
		faceDisplay: document.getElementById('face'),
	};

	constructor(boards) {
		this.state = {
			cells: [],
			revealedCells: [],
			viewedCells: [],
			usedGlyphs: [],
			unsolvedCells: 0,
			remainingMistakes: 0,
			coolDown: false,
			firstRun: true,
			avoidableMistakesMade : 0,
			level: 0,
		};
		this.memory = {
			validImages: [],
		};
		this.visual = {
			showLoading: false,
		};

		this.boards = boards;
		this.faceChanger = new faceChanger(this);
	}

	async deleteCells() {
		let delay = 100;
		const delayStep = 80 / this.state.cells.length;
		for (const cell of this.state.cells) {
			cell.deactivate();
			await new Promise(resolve => setTimeout(resolve, delay));
			delay += delayStep;
		}
		for (const cell of this.state.cells) {
			cell.getElement().remove();
		}
		this.state.cells.length = 0;
	}

	createCells(numCells) {		
		const fragment = document.createDocumentFragment();
		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			if (numCells === Game.config.introImages.length) {
				cell.img = Game.config.introImages[i];
			}
			fragment.appendChild(cell.getElement());
			this.state.cells.push(cell);
		}
		Game.elements.grid.appendChild(fragment);
	}
	async activateCells(imageJSON, additionalMistakes) {
		const cellsCopy = [...this.state.cells];
		const usedImages = [];
		let activeCellCount = 0;
		const wordList = Object.keys(imageJSON);
		for (let i = 0; i < this.state.cells.length / 2; i++) {
			let tries = 0;
			let imageValid = false;
			let word, imageURL, wordIndex;
			while (tries < 10) {
				tries++;
				wordIndex = Math.floor(Math.random() * wordList.length);
				word = wordList[wordIndex];
				imageURL = imageJSON[word].url;
				if (usedImages.includes(imageURL) || !imageJSON[word].whitelisted) {
					continue;
				}
				imageValid = await validateImage(imageURL, this)
				if (imageValid) {
					wordList.splice(wordIndex, 1);
					usedImages.push(imageURL);
					break;
				}
			}
			if (!imageValid) {
				console.log("No word with picture found.");
				continue;
			}
			for (let j = 0; j < 2; j++) {
				const index = Math.floor(Math.random() * cellsCopy.length);
				const cell = cellsCopy[index];
				cell.activate(word, imageURL);
				activeCellCount++;
				cellsCopy.splice(index, 1);
			}
		}
		this.state.unsolvedCells = activeCellCount;
		this.state.remainingMistakes = activeCellCount / 2 - 1 + additionalMistakes;
	}

	async handleClick() {
		if (this.state.revealedCells.length > 1) {
			const [cell1, cell2] = this.state.revealedCells;
			this.state.revealedCells.length = 0;

			if (cell1.getName() === cell2.getName()) {
				cell1.solve();
				cell2.solve();
				this.state.unsolvedCells -= 2;
				if (this.state.unsolvedCells <= 0) {
					this.newGame(true);
				}
			}
			else {
				this.state.remainingMistakes--;
				// if either of these cells have already been viewed, this could have been avoided
				if (this.state.viewedCells.includes(cell1) || this.state.viewedCells.includes(cell2)) {
					this.state.avoidableMistakesMade++;
				}
				else {
					// if the player turned over the first cell which they have previously seen a match to but didn't make the match
					const word1 = cell1.getName();
					for (const cell of this.state.viewedCells) {
						if (cell.getName() == word1) this.state.avoidableMistakesMade++;
					}
				}
				if (this.state.avoidableMistakesMade > 0) this.faceChanger.changeFace(this.state.remainingMistakes);
				if (this.state.remainingMistakes < 0) {
					//Game.elements.tooltip.classList.toggle('fail', true);
					this.newGame(false);
				}

				this.state.coolDown = true;

				await new Promise(resolve => setTimeout(resolve, Game.config.fadeDelay));

				this.state.coolDown = false;
				cell1.hide();
				cell2.hide();
				
			}
			for (const cell of [cell1, cell2]) {
				if (!this.state.viewedCells.includes(cell)) {
					this.state.viewedCells.push(cell);
				}
			}
			
		}
	}

	async newGame(advanceStage) {
		if (advanceStage) this.state.level++;
		const board = this.boards[Math.min(this.state.level, this.boards.length - 1)];
		if (board.cellCount < 4 || board.cellCount % 2 !== 0) {
			console.error("Please provide an even cell count greater than or equal to 4.");
			return;
		}
		this.visual.showLoading = !advanceStage;
		let messageList;
		if (!this.state.firstRun) {
			if (advanceStage) {
				if (this.state.level <= 1) messageList = Game.config.messages.intro;
				else if (this.state.avoidableMistakesMade == 0) messageList = Game.config.messages.perfect;
				else messageList = Game.config.messages.victory;
			}
			else messageList = Game.config.messages.failure;
		}
		

		this.state.coolDown = true;
		this.state.revealedCells.length = 0;
		this.state.viewedCells.length = 0;
		this.state.avoidableMistakesMade = 0;
		this.state.usedGlyphs.length = 0;
		if (advanceStage) {
			Game.elements.tooltip.classList.toggle('fade-out', true);
			Game.elements.grid.classList.toggle('active', false);
			Game.elements.tooltip.addEventListener('transitionend', () => {
				Game.elements.levelDisplay.innerText = `Level ${this.state.level}`;
				this.faceChanger.resetFace(this.state.level > 4);
			}, { once: true });

		}
		await this.deleteCells();
		gridLayout.update(board.cellCount);
		this.createCells(board.cellCount);
		if (messageList) await Game.splashText(randomItem(messageList));
		Game.elements.tooltip.classList.toggle('fade-out', false);
		Game.elements.grid.classList.toggle('active', true);
		if (!advanceStage) this.faceChanger.resetFace();
		await this.activateCells(board.images, board.additionalMistakes);
		this.faceChanger.setMaxMistakes(this.state.remainingMistakes);
		this.state.coolDown = false;
		this.state.firstRun = false;
	}
}

Game.splashText = async function(text) {
	const splashText = Game.elements.splashText;
	const splashContainer = Game.elements.splashContainer;
	splashText.textContent = text;
	splashContainer.classList.add("expand");
	return new Promise(resolve => {
		const handler = () => {
			splashContainer.classList.remove("expand");
			resolve(); // <-- now awaited properly
		};
		splashContainer.addEventListener('transitionend', handler, {once: true});
	});
};

function faceChanger(game) {
	this.game = game;
	const faceImages = {
		mistake1: [
			'images/faces/2.png',
			'images/faces/3a.png',
			'images/faces/4a.png',
			'images/faces/5a.png',
		],
		mistake2: [
			'images/faces/2.png',
			'images/faces/3b.png',
			'images/faces/4b.png',
			'images/faces/5b.png',
		],
		length: 4,
		default: 'images/faces/1.png',
		diedImmediately: 'images/faces/6c.png',
		died1: 'images/faces/6a.png',
		died2: 'images/faces/6b.png',
		special: 'images/faces/sophisticated.png',
		special2: 'images/faces/sophisticated2.png',
	};

	let maxMistakes;
	let doSequence2 = false;
	let dead = false;
	const faceDisplay = Game.elements.faceDisplay;

	this.setMaxMistakes = function(mistakes) {
		maxMistakes = mistakes;
	}
	this.changeFace = function() {
		if (dead) return;
		if (this.game.state.remainingMistakes <= 0) {
			if (this.game.state.avoidableMistakesMade == 1) {
				faceDisplay.src = faceImages.diedImmediately;
			}
			else if (!doSequence2) {
				faceDisplay.src = faceImages.died1;
			}
			else {
				faceDisplay.src = faceImages.died2;
			}
			dead = true;
			return;
		}

		let progress = maxMistakes - Math.max(this.game.state.remainingMistakes, 0);
		let index = Math.min(Math.ceil(
			(progress / maxMistakes) * (faceImages.length - 1)
		), faceImages.length - 1);

		if (this.game.state.avoidableMistakesMade > 1 && !(faceDisplay.src == faceImages.default || faceDisplay.src == faceImages.special || faceDisplay.src == faceImages.special2)) {
			doSequence2 = true;
		}
		if (doSequence2) faceDisplay.src = faceImages.mistake2[index];
		else faceDisplay.src = faceImages.mistake1[index];
	}
	this.resetFace = function(special = false) {
		if (special) faceDisplay.src = faceImages.special2;
		else faceDisplay.src = faceImages.default;
		doSequence2 = false;
		dead = false;
	}
}

class Cell {
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
			container: document.createElement('div'),
			image: document.createElement('div'),
			text: document.createElement('div'),
			mask: document.createElement('div'),
		};
		this.elements.container.className = 'cell-container';
		this.elements.container.classList.toggle('show-loading', this.game.visual.showLoading);

		this.elements.image.className = 'cell'
		this.elements.container.appendChild(this.elements.image);

		this.elements.text.className = 'overlay-text';
		this.elements.image.appendChild(this.elements.text);

		this.elements.mask.className = 'mask';
		this.elements.image.appendChild(this.elements.mask);

		this.elements.container.addEventListener('click', () => this.unhide());
	}
	getElement() {
		return this.elements.container;
	}
	getName() {
		return this.id;
	}
	activate(word, src) {
		this.id = word;
		this.elements.text.textContent = word;
		this.elements.image.style.backgroundImage = `url(${src})`;
		if (Math.random() < Game.config.funColorChance) {
			const randomColor = Game.config.colors[randomItem(Object.keys(Game.config.colors))];
			this.setColor(randomColor);
			if (!this.img && Math.random() < Game.config.funGlyphChance && this.game.state.usedGlyphs.length < Game.config.glyphs.length) {
				let glyph;
				do {
					glyph = randomItem(Game.config.glyphs);
				} while (this.game.state.usedGlyphs.includes(glyph));
				this.setOverlayImage(glyph);
				this.game.state.usedGlyphs.push(glyph);
			}
		}
		if (this.img) {
			this.setOverlayImage(this.img);
		}
		this.elements.image.classList.add("active");
		this.state = Cell.State.DEFAULT;
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.elements.container.classList.toggle('show-loading', this.game.visual.showLoading);
		this.elements.image.classList.remove("active");
	}
	hide() {
		this.state = Cell.State.DEFAULT;
		this.elements.mask.classList.remove('fade-out');
	}
	unhide() {
		if (this.state !== Cell.State.DEFAULT || this.game.state.coolDown) return;
		this.state = Cell.State.REVEALED;
		this.elements.mask.classList.add('fade-out');
		this.game.state.revealedCells.push(this);
	}
	solve() {
		this.state = Cell.State.SOLVED;
		this.elements.text.classList.add('fade-out');
	}
	setOverlayImage(src) {
		this.elements.mask.style.backgroundImage = `url(${src})`;
	}
	setColor(color) {
		this.elements.mask.style.backgroundColor = color;
	}
}

function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

async function validateImage(url, game) {
	return new Promise((resolve) => {
		if (game.memory.validImages[url]) {
			resolve(true);
			return;
		}
		const img = new Image();
		img.src = url;
		img.onload = () => { 
			game.memory.validImages[url] = true;
			resolve(true); 
			cleanup(); 
		};
		img.onerror = () => { resolve(false); cleanup(); };
		function cleanup() {
			img.onload = null;
			img.onerror = null;
		}
	});
}

class Board {
	constructor(cellCount, additionalMistakes = 0, images) {
		this.cellCount = cellCount;
		this.additionalMistakes = additionalMistakes;
		this.images = images;
	}
}
const boards = [];
{
	const allCategory = await fetch(Game.config.category.all).then(res => res.json());
	const appleCategory = await fetch(Game.config.category.apple).then(res => res.json());
	const dogs = await fetch(Game.config.category.dogs).then(res => res.json());
	boards.push(new Board(4, 0, allCategory));
	boards.push(new Board(8, 1, allCategory));
	boards.push(new Board(16, 2, allCategory));
	boards.push(new Board(16, 0, appleCategory));
	boards.push(new Board(20, 1, allCategory));
	boards.push(new Board(16, 0, dogs));
	boards.push(new Board(20, 0, allCategory));
	boards.push(new Board(24, 0, allCategory));
	boards.push(new Board(24, 0, appleCategory));
	boards.push(new Board(16, 0, allCategory));
	boards.push(new Board(16, 0, allCategory));
	boards.push(new Board(20, 0, allCategory));
	boards.push(new Board(20, 0, allCategory));
}
const gridLayout = new GridLayout(Game.elements);
const game = new Game(boards);
globalThis.game = game;
game.newGame(false);
window.addEventListener('resize', () => gridLayout.resizeGrid());
Game.elements.grid.addEventListener('click', () => game.handleClick());
Game.elements.faceDisplay.addEventListener('click', () => game.newGame(false));