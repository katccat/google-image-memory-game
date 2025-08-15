class Game {
	static config = {
		fadeDelay: 700,
		category: {
			all: 'words/images.json',
			dogs: 'words/dogs.json',
			foods: 'words/foods.json',
		},
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
			victory: ["I'm not a robot", "reCAPTCHA'd", "200 OK", "Great!", "I'm feeling lucky", "Everything's Computer"],
			failure: ["Aw, snap!", "That's an error.", "Please try again", "404"],
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
		faceImages: {
			sequence: [
				'images/faces/1.png',
				'images/faces/2.png',
				'images/faces/3.png',
				'images/faces/4b.png',
				'images/faces/5b.png',
				'images/faces/6.png',
			],
			special: 'images/faces/sophisticated.png',
		}
	};
	static element = {
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
		const splashText = Game.element.splashText;
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

		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			const funColor = Math.random() < Game.config.funColorChance;

			if (funColor) {
				const randomColor = Game.config.colors[randomItem(Object.keys(Game.config.colors))];
				cell.setColor(randomColor);
			}
			if (numCells === Game.config.introImages.length) {
				cell.setOverlayImage(Game.config.introImages[i]);
			}
			else if (funColor && Math.random() < Game.config.funGlyphChance) {
				cell.setOverlayImage(randomItem(Game.config.glyphs));
			}
			Game.element.grid.appendChild(cell.getElement());
			this.state.cells.push(cell);
		}

		const imageList = await fetch(board.images).then(res => res.json());
		await this.assignValuesToCells(imageList);
	}
	async assignValuesToCells(image_json) {
		const cellsCopy = [...this.state.cells];
		const usedWords = [];
		const usedImages = [];
		let activeCellCount = 0;
		let wordList = Object.keys(image_json);
		for (let i = 0; i < this.state.cells.length / 2; i++) {
			let word, imageURL, imageLoaded, tries = 0, maxTries = 10;
			do {
				word = randomItem(wordList);
				imageURL = image_json[word];
				tries++;
				// Try to load the image to check if it exists
				if (imageURL) {
					const img = document.createElement('img');
					img.src = imageURL;
					imageLoaded = await new Promise(resolve => {
						img.onload = () => resolve(true);
						img.onerror = () => resolve(false);
					});
				}
			} while ((usedWords.includes(word) || usedImages.includes(imageURL) || !imageLoaded) && tries < maxTries);
			usedWords.push(word);
			usedImages.push(imageURL);

			for (let j = 0; j < 2; j++) {
				const index = Math.floor(Math.random() * cellsCopy.length);
				const cell = cellsCopy[index];
				if (imageURL) {
					cell.activate(word, imageURL);
					activeCellCount++;
				}
				else {
					console.log("No word with picture found.");
				}
				cellsCopy.splice(index, 1);
			}
			this.state.remainingMistakes = activeCellCount / 2 - 1;
			this.state.unsolvedCells = activeCellCount;
		}
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
					//Game.element.tooltip.classList.toggle('fail', true);
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
		if (advanceStage) {
			Game.element.tooltip.classList.toggle('fade-out', true);
			Game.element.tooltip.addEventListener('transitionend', () => {
				Game.element.levelDisplay.innerText = `Dataset ${this.state.level.toString().padStart(2, '0')}`;
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
		Game.element.tooltip.classList.toggle('fade-out', false);
		await this.createCells(board);
		if (!advanceStage) faceChanger.resetFace();
		faceChanger.setMaxMistakes(this.state.remainingMistakes);
		
		window.addEventListener('resize', () => gridLayout.resizeGrid());
		Game.element.grid.addEventListener('click', () => this.handleClick());
		this.state.firstRun = false;
	}
}

const faceChanger = new function() {
	let maxMistakes;
	const faceSequence = Game.config.faceImages.sequence;
	const faceDisplay = Game.element.faceDisplay;
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

const gridLayout = new function() {
	let cellCount, suitableFactors;
	const grid = Game.element.grid;

	this.update = function(numCells) {
		cellCount = numCells;
		suitableFactors = [];

		if (cellCount == 4) suitableFactors = [2];
		else if (cellCount == 8) suitableFactors = [2, 4];
		else {
			for (let i = 3; i < cellCount; i++) {
				if (cellCount % i == 0 && cellCount / i != 2) suitableFactors.push(i);
			}
		}
		this.resizeGrid();
	}
	this.findBestDimensions = function(viewportAspectRatio) {
		const columnCountEstimate =  Math.sqrt(cellCount * viewportAspectRatio);
		let smallestDiffToFactor = Infinity;
		let bestColumnCount = suitableFactors[0];
		for (const factor of suitableFactors) {
			let diff = Math.abs(factor - columnCountEstimate);
			if (diff < smallestDiffToFactor) {
				smallestDiffToFactor = diff;
				bestColumnCount = factor;
			}
		}
		let bestRowCount = cellCount / bestColumnCount;
		return [bestColumnCount, bestRowCount];
	}
	this.resizeGrid = () => {
		const tooltip = Game.element.tooltip;
		const gridContainer = Game.element.gridContainer;
		const viewportWidth = gridContainer.getBoundingClientRect().width;
		const viewportHeight = window.innerHeight - tooltip.getBoundingClientRect().height;
		const viewportAspectRatio = viewportWidth / viewportHeight;
		const [columns, rows] = this.findBestDimensions(viewportWidth / viewportHeight);
		const gridAspectRatio = columns / rows;
		grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
		grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
		grid.style.aspectRatio = `${columns} / ${rows}`;
		
		if (viewportAspectRatio > gridAspectRatio) {
			// Viewport is wider than grid: set height to 100%, width auto
			grid.style.height = "100%";
			grid.style.width = "auto";
		}
		else {
			// Viewport is taller than grid: set width to 100%, height auto
			grid.style.width = "100%";
			grid.style.height = "auto";
		}
		tooltip.style.width = grid.getBoundingClientRect().width + 'px';
	}
};

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
		this.container.className = 'cell-container';
		this.container.classList.toggle('show-loading', game.state.showLoading);

		this.image = document.createElement('div');
		this.image.className = 'cell';
		this.container.appendChild(this.image);

		this.textDisplay = document.createElement('div');
		this.textDisplay.className = 'overlay-text';
		this.image.appendChild(this.textDisplay);

		this.overlay = document.createElement('div');
		this.overlay.className = 'mask';
		this.image.appendChild(this.overlay);

		this.image.addEventListener('click', () => this.unhide());
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
		this.image.style.backgroundImage = `url(${src})`;
		this.container.classList.toggle('show-loading', game.state.showLoading);
		this.image.classList.add("active");
		this.state = Cell.State.DEFAULT;
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.container.classList.toggle('show-loading', game.state.showLoading);
		this.image.classList.remove("active");
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
	new Board(20, Game.config.category.foods),
	new Board(20, Game.config.category.dogs),
	new Board(24),
	new Board(24),
	new Board(36),
];
const game = new Game(boards);
game.newGame(false);