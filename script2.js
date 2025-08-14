class Board {
	constructor(cellCount, words = Game.config.category.all) {
		this.cellCount = cellCount;
		this.words = words;
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
		this.id = null;

		this.container = document.createElement('div');
		this.container.className = 'cell';

		this.text = document.createElement('div');
		this.text.className = 'overlay-text';
		this.container.appendChild(this.text);

		this.mask = document.createElement('div');
		this.mask.className = 'mask';
		this.container.appendChild(this.mask);

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
		this.text.textContent = word;
		this.container.style.backgroundImage = `url(${src})`;
		this.container.classList.add("active");
		this.state = Cell.State.DEFAULT;
		this.game.state.unsolvedCells++;
	}

	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.container.classList.remove("active");
	}

	hide() {
		this.state = Cell.State.DEFAULT;
		this.mask.classList.remove('fade-out');
	}

	unhide() {
		if (this.state !== Cell.State.DEFAULT || this.game.state.coolDown) return;
		this.state = Cell.State.REVEALED;
		this.mask.classList.add('fade-out');
		this.game.state.revealedCells.push(this);
	}

	solve() {
		this.state = Cell.State.SOLVED;
		this.text.classList.add('fade-out');
	}

	setMaskImage(src) {
		this.mask.style.backgroundImage = `url(${src})`;
	}

	setColor(color) {
		this.mask.style.backgroundColor = color;
	}
}

class GridLayout {
	constructor(gridElement, numCells) {
		this.grid = gridElement;
		this.cellCount = numCells;
		this.suitableFactors = [];

		if (numCells === 4) {
			this.suitableFactors = [2];
		} else {
			for (let i = 3; i < numCells; i++) {
				if (numCells % i === 0 && numCells / i !== 2) {
					this.suitableFactors.push(i);
				}
			}
		}
		this.resizeGrid();
	}

	findBestDimensions(viewportAspectRatio) {
		const columnCountEstimate = Math.sqrt(this.cellCount * viewportAspectRatio);
		let smallestDiff = Infinity;
		let bestColumnCount = this.suitableFactors[0];

		for (const factor of this.suitableFactors) {
			let diff = Math.abs(factor - columnCountEstimate);
			if (diff < smallestDiff) {
				smallestDiff = diff;
				bestColumnCount = factor;
			}
		}
		return [bestColumnCount, this.cellCount / bestColumnCount];
	}

	resizeGrid = () => {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const [columns, rows] = this.findBestDimensions(viewportWidth / viewportHeight);

		this.grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
		this.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
		this.grid.style.aspectRatio = `${columns} / ${rows}`;

		if (viewportWidth <= viewportHeight) {
			this.grid.style.width = '100%';
			this.grid.style.height = 'auto';
		} 
		else {
			this.grid.style.width = 'auto';
			this.grid.style.height = '100%';
		}
	}
}

class Game {
	static config = {
		fadeDelay: 1000,
		category: {
			all: 'words/dictionary.txt',
			dogs: 'words/dog-breeds.txt',
		},
		boards: [
			new Board(4),
			new Board(16),
			new Board(20),
			new Board(24),
			new Board(24),
			new Board(36),
		],
		funColorChance: 0.2,
		funGlyphChance: 0.6,
		colors: {
			red: '#ed6a5e',
			blue: '#86b2f9',
			yellow: '#fdd868',
			green: '#76d590',
		},
		messages: {
			intro: ["Don't be evil", "I'm feeling lucky"],
			victory: ["I'm not a robot", "reCAPTCHA'd", "200 OK", "Great!", "I'm feeling lucky"],
			failure: ["Aw, snap!", "404", "That's an error.", "Please try again"]
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
			'images/robot.png'
		]
	};

	constructor() {
		this.state = {
			cells: [],
			revealedCells: [],
			unsolvedCells: 0,
			remainingMistakes: 0,
			coolDown: false,
			level: 0
		};

		this.gridLayout = new GridLayout();
		this.gridElement = document.getElementById('grid');
	}

	static randomItem(list) {
		return list[Math.floor(Math.random() * list.length)];
	}

	static splashText(text) {
		const target = document.getElementById("splash-text");
		target.textContent = text;
		target.classList.add("expand");
		target.addEventListener('transitionend', () => {
			target.classList.remove("expand");
		});
	}

	async createCells(board) {
		const numCells = board.cellCount;
		this.state.cells = [];
		this.state.unsolvedCells = 0;
		this.state.remainingMistakes = Math.max(numCells / 2 - 1, 2);

		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			const funColor = Math.random() < Game.config.funColorChance;

			if (funColor) {
				const randomColor = Game.config.colors[Game.randomItem(Object.keys(Game.config.colors))];
				cell.setColor(randomColor);
			}
			if (numCells === Game.config.introImages.length) {
				cell.setMaskImage(Game.config.introImages[i]);
			} 
			else if (funColor && Math.random() < Game.config.funGlyphChance) {
				cell.setMaskImage(Game.randomItem(Game.config.glyphs));
			}
			this.gridElement.appendChild(cell.getElement());
			this.state.cells.push(cell);
		}

		const wordList = await fetch(board.words)
			.then(data => data.text())
			.then(text => text.split(/\r?\n/));

		await this.assignValuesToCells(this.state.cells, wordList);
	}

	async assignValuesToCells(cells, wordList) {
		const cellsCopy = [...cells];
		const usedWords = [];

		for (let i = 0; i < cells.length / 2; i++) {
			let word, imageURL;
			let maxTries = 5;

			while (!imageURL && maxTries > 0) {
				do {
					word = Game.randomItem(wordList);
				} while (usedWords.includes(word));

				usedWords.push(word);
				imageURL = await this.getImage(word);
				maxTries--;
			}

			for (let j = 0; j < 2; j++) {
				const index = Math.floor(Math.random() * cellsCopy.length);
				const cell = cellsCopy[index];
				if (imageURL) {
					cell.activate(word, imageURL);
				} else {
					console.log("No word with picture found.");
				}
				cellsCopy.splice(index, 1);
			}
		}
	}

	async getImage(word) {
		return await getWikipediaImage(word); // external function assumed
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
					this.state.level = Math.min(this.state.level + 1, Game.config.boards.length - 1);
					Game.splashText(Game.randomItem(this.state.level <= 1 ? Game.config.messages.intro : Game.config.messages.victory));
				} 
				else return;
			} 
			else {
				this.state.remainingMistakes--;
				this.state.coolDown = true;

				await new Promise(resolve => setTimeout(resolve, Game.config.fadeDelay));

				this.state.coolDown = false;
				cell1.hide();
				cell2.hide();
				if (this.state.remainingMistakes <= 0) {
					Game.splashText(Game.randomItem(Game.config.messages.failure));
				} 
				else return;
			}
			this.newGame(Game.config.boards[this.state.level]);
		}
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
	}

	async newGame(board) {
		if (board.cellCount < 4 || board.cellCount % 2 !== 0) {
			console.error("Please provide an even cell count greater than or equal to 4.");
			return;
		}
		await this.deleteCells();
		await this.createCells(board);
		this.gridLayout.initialize(this.gridElement, board.cellCount);
		window.addEventListener('resize', () => this.gridLayout.resizeGrid());
		this.gridElement.addEventListener('click', () => this.handleClick());
	}
}

// Start the game
const game = new Game();
game.newGame(Game.config.boards[game.state.level]);
