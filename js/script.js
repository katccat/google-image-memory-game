import { GridLayout } from '/js/gridlayout.js';

class Game {
	static config = {
		fadeDelay: 700,
		category: {
			all: '/words/images.json',
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
			intro: ["Don't be evil", "I'm feeling lucky"],
			victory: ["I'm not a robot", "reCAPTCHA'd", "200 OK", "Great!", "I'm feeling lucky", "Everything's Computer"],
			failure: ["Aw, snap!", "That's an error.", "Please try again", "404"],
		},
		glyphs: [
			"/images/download_arrow.png",
			"/images/mandarin.png",
			"/images/puzzle.png",
			"/images/share.png",
			"/images/office.png",
			"/images/cog.png",
			"/images/search.png",
			"/images/contact.png",
		],
		introImages: [
			'/images/im.png',
			'/images/not.png',
			'/images/a.png',
			'/images/robot.png',
		],
		faceImages: {
			sequence: [
				'/images/faces/1.png',
				'/images/faces/2.png',
				'/images/faces/3.png',
				'/images/faces/4b.png',
				'/images/faces/5b.png',
				'/images/faces/6.png',
			],
			special: '/images/faces/sophisticated.png',
		}
	};
	static elements = {
		grid: document.getElementById('grid'),
		gridContainer: document.getElementById('grid-container'),
		tooltip: document.getElementById('tooltip'),
		levelDisplay: document.getElementById('level-counter'),
		splashText: document.getElementById('splash-text'),
		faceDisplay: document.getElementById('face'),
	};

	constructor(boards) {
		this.state = {
			cells: [],
			revealedCells: [],
			unsolvedCells: 0,
			remainingMistakes: 0,
			coolDown: false,
			firstRun: true,
			level: 0,
			showLoading: false,
		};

		this.boards = boards;
	}

	static splashText(text) {
		const splashText = Game.elements.splashText;
		splashText.textContent = text;
		splashText.classList.add("expand");
		splashText.addEventListener('transitionend', () => {
			splashText.classList.remove("expand");
		});
	}

	async createCells(board) {
		const numCells = board.cellCount;
		this.state.cells = [];
		this.state.unsolvedCells = 0;
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

		const imageList = await fetch(board.images).then(res => res.json());
		await this.assignValuesToCells(imageList);
	}
	async assignValuesToCells(imageJSON) {
		this.state.coolDown = true;
		const cellsCopy = [...this.state.cells];
		const usedWords = [];
		const usedImages = [];
		let activeCellCount = 0;
		const wordList = Object.keys(imageJSON);
		for (let i = 0; i < this.state.cells.length / 2; i++) {
			let tries = 0;
			let imageValid = false;
			let word, imageURL;
			while (tries < 10) {
				tries++;
				word = randomItem(wordList);
				imageURL = imageJSON[word].url;
				if (usedWords.includes(word) || usedImages.includes(imageURL)) {
					continue;
				}
				imageValid = await validateImage(imageURL)
				if (imageValid) {
					usedWords.push(word);
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
			this.state.remainingMistakes = activeCellCount / 2 - 1;
			this.state.unsolvedCells = activeCellCount;
		}
		this.state.coolDown = false;
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
				faceChanger.changeFace(this.state.remainingMistakes);
				this.state.coolDown = true;

				await new Promise(resolve => setTimeout(resolve, Game.config.fadeDelay));

				this.state.coolDown = false;
				cell1.hide();
				cell2.hide();
				if (this.state.remainingMistakes < 0) {
					//Game.elements.tooltip.classList.toggle('fail', true);
					this.newGame(false);
				}
			}
		}
	}

	async deleteCells() {
		let delay = 100;
		const delayStep = 80 / this.state.cells.length;
		this.state.coolDown = true;
		for (const cell of this.state.cells) {
			cell.deactivate();
			await new Promise(resolve => setTimeout(resolve, delay));
			delay += delayStep;
		}
		for (const cell of this.state.cells) {
			cell.getElement().remove();
		}
		this.state.coolDown = false;
	}

	async newGame(advanceStage) {
		if (advanceStage) {
			this.state.level++;
			this.state.showLoading = false;
		}
		else if (!this.state.firstRun) {
			this.state.showLoading = true;
		}
		const board = this.boards[Math.min(this.state.level, this.boards.length - 1)];
		if (board.cellCount < 4 || board.cellCount % 2 !== 0) {
			console.error("Please provide an even cell count greater than or equal to 4.");
			return;
		}
		this.state.revealedCells.length = 0;
		if (advanceStage) {
			Game.elements.tooltip.classList.toggle('fade-out', true);
			Game.elements.tooltip.addEventListener('transitionend', () => {
				Game.elements.levelDisplay.innerText = `Level ${this.state.level}`;
				faceChanger.resetFace(
					this.state.level > 4 ? Game.config.faceImages.special : undefined
				);
			});
		}
		await this.deleteCells();
		if (!this.state.firstRun) {
			let messageList;
			if (advanceStage) {
				if (this.state.level <= 1) messageList = Game.config.messages.intro;
				else messageList = Game.config.messages.victory;
			}
			else {
				messageList = Game.config.messages.failure;
			}
			Game.splashText(randomItem(messageList));
		}
		gridLayout.update(board.cellCount);
		Game.elements.tooltip.classList.toggle('fade-out', false);
		await this.createCells(board);
		if (!advanceStage) faceChanger.resetFace();
		faceChanger.setMaxMistakes(this.state.remainingMistakes);
		
		this.state.firstRun = false;
	}
}

const faceChanger = new function() {
	let maxMistakes;
	const faceSequence = Game.config.faceImages.sequence;
	const faceDisplay = Game.elements.faceDisplay;
	const defaultFace = faceSequence[0];

	this.setMaxMistakes = function(mistakes) {
		maxMistakes = mistakes;
	}
	this.changeFace = function(remainingMistakes) {
		let progress = maxMistakes - Math.max(remainingMistakes, 0);

		let index = Math.floor(
			(progress / maxMistakes) * (faceSequence.length - 1)
		);

		// clamp to valid range
		index = Math.min(index, faceSequence.length - 1);

		faceDisplay.src = faceSequence[index];
	}
	this.resetFace = function(face = defaultFace) {
		faceDisplay.src = face;
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

		this.container = document.createElement('div');
		this.container.className = 'cell';

		this.textDisplay = document.createElement('div');
		this.textDisplay.className = 'overlay-text';
		this.container.appendChild(this.textDisplay);

		this.overlay = document.createElement('div');
		this.overlay.className = 'mask';
		this.container.appendChild(this.overlay);

		this.container.addEventListener('click', () => this.unhide());
	}
	getElement() {
		return this.container;
	}
	getName() {
		return this.id;
	}
	activate(word, src) {
		this.id = word;
		this.textDisplay.textContent = word;
		this.container.style.backgroundImage = `url(${src})`;
		if (Math.random() < Game.config.funColorChance) {
			const randomColor = Game.config.colors[randomItem(Object.keys(Game.config.colors))];
			this.setColor(randomColor);
			if (!this.img && Math.random() < Game.config.funGlyphChance) {
				this.setOverlayImage(randomItem(Game.config.glyphs));
			}
		}
		if (this.img) {
			this.setOverlayImage(this.img);
		}
		this.container.classList.add("active");
		this.state = Cell.State.DEFAULT;
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.container.classList.remove("active");
	}
	hide() {
		this.state = Cell.State.DEFAULT;
		this.overlay.classList.remove('fade-out');
	}
	unhide() {
		if (this.state !== Cell.State.DEFAULT || this.game.state.coolDown) return;
		this.state = Cell.State.REVEALED;
		this.overlay.classList.add('fade-out');
		this.game.state.revealedCells.push(this);
	}
	solve() {
		this.state = Cell.State.SOLVED;
		this.textDisplay.classList.add('fade-out');
	}
	setOverlayImage(src) {
		this.overlay.style.backgroundImage = `url(${src})`;
	}
	setColor(color) {
		this.overlay.style.backgroundColor = color;
	}
}

function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

async function validateImage(url) {
	return new Promise((resolve) => {
		const img = new Image();
		img.src = url;
		img.onload = () => resolve(true);   // valid image
		img.onerror = () => resolve(false); // broken image
	});

}

class Board {
	constructor(cellCount, images = Game.config.category.all) {
		this.cellCount = cellCount;
		this.images = images;
	}
}
const boards = [
	new Board(4),
	new Board(8),
	new Board(16),
	new Board(20),
	new Board(20), // foods
	new Board(24),
	new Board(16),
	new Board(16),
	new Board(20), // foods
	new Board(20),
];
const gridLayout = new GridLayout(Game.elements);
const game = new Game(boards);
game.newGame(false);
window.addEventListener('resize', () => gridLayout.resizeGrid());
Game.elements.grid.addEventListener('click', () => game.handleClick());
Game.elements.faceDisplay.addEventListener('click', () => game.newGame(false));