const cells = [];
const revealedCells = [];
let unsolvedCells = 0;
let remainingMistakes;
let coolDown = false;
let level = 0;

const FADE_DELAY = 1000;
const boards = [
	new Board(4),
	new Board(16),
	new Board(20),
	new Board(24),
	new Board(24),
	new Board(36),
];
const FUN_COLOR_CHANCE_CHANCE = 0.2;
const FUN_GLYPH_CHANCE = 0.6;
const colors = {
	red: '#ed6a5e',
	blue: '#86b2f9',
	yellow: '#fdd868',
	green: '#76d590',
};
const messages = {
	intro: [
		"Don't be evil",
		"I'm feeling lucky",
	],
	victory: [
		"I'm not a robot",
		"reCAPTCHA'd",
		"200 OK",
		"Solved",
		"I'm feeling lucky",
	],
	failure: [
		"Aw, snap!",
		"404",
		"That's an error.",
		"Please try again",
	]
};
const glyphs = [
	"images/download_arrow.png",
	"images/mandarin.png",
	"images/puzzle.png",
	"images/share.png",
	"images/office.png",
	"images/cog.png",
	"images/search.png",
];
const introImages = [
	'images/im.png', 
	'images/not.png', 
	'images/a.png', 
	'images/robot.png'
];

const gridLayout = new function() {
	let grid, cellCount, suitableFactors;

	this.initialize = function(gridElement, board) {
		grid = gridElement;
		cellCount = board.cellCount;
		suitableFactors = [];

		if (cellCount == 4) suitableFactors = [2];
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
		const aspectRatio = window.innerWidth / window.innerHeight;
		const [columns, rows] = this.findBestDimensions(aspectRatio);

		grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
		grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
		grid.style.aspectRatio = `${columns} / ${rows}`;
	}
};

function Board(cellCount) {
	this.cellCount = cellCount;
}

function Cell() {
	const cellState = {
		DEFAULT: 'default',
		REVEALED: 'revealed',
		SOLVED: 'solved',
		INACTIVE: 'inactive',
	}
	let state = cellState.INACTIVE;
	let id;

	const container = document.createElement('div');
	container.className = 'cell';

	const text = document.createElement('div');
	text.className = 'overlay-text';
	container.appendChild(text);

	const mask = document.createElement('div');
	mask.className = 'mask';

	container.appendChild(mask);

	this.getElement = () => {
		return container;
	}
	this.getName = () => {
		return id;
	}
	this.activate = (word, src) => {
		id = word;
		text.textContent = word;
		container.style.backgroundImage = `url(${src})`;
		container.classList.add("active");
		state = cellState.DEFAULT;
		unsolvedCells += 1;
	}
	this.deactivate = () => {
		state = cellState.INACTIVE;
		container.classList.remove("active");
	}
	this.hide = () => {
		state = cellState.DEFAULT;
		mask.classList.remove('fade-out');
	}
	this.unhide = () => {
		if (state != cellState.DEFAULT || coolDown == true) return;
		state = cellState.REVEALED;
		mask.classList.add('fade-out');
		revealedCells.push(this);
	};
	this.solve = () => {
		state = cellState.SOLVED;
		text.classList.add('fade-out');
	}
	this.setMaskImage = (src) => {
		mask.style.backgroundImage = `url(${src})`;
	}
	this.setColor = (color) => {
		mask.style.backgroundColor = color;
	}
}

function splashText(text) {
	const target = document.getElementById("splash-text");
	//const target2 = document.getElementById("splash-image");
	target.textContent = text;
	target.classList.add("expand");
	//target2.classList.add("expand");
	target.addEventListener('transitionend', () => {
		target.classList.remove("expand");
	});
	/*target2.addEventListener('transitionend', () => {
		target2.classList.remove("expand");
	});*/
}

function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function createCells(gridElement, numCells) {
	cells.length = 0;
	unsolvedCells = 0;
	remainingMistakes = Math.max(numCells / 2 - 1, 2);
	
	for (let i = 0; i < numCells; i++) {
		const cell = new Cell();
		const fun_color = Math.random() < FUN_COLOR_CHANCE_CHANCE;
		if (fun_color) {
			const colorKeys = Object.keys(colors);
			const randomColor = colors[randomItem(colorKeys)];
			cell.setColor(randomColor);
		}
		if (numCells == introImages.length) {
			cell.setMaskImage(introImages[i]);
		}
		else if (fun_color && Math.random() < FUN_GLYPH_CHANCE) {
			cell.setMaskImage(randomItem(glyphs));
		}
		const cellElement = cell.getElement();
		cellElement.addEventListener('click', cell.unhide);
		gridElement.appendChild(cellElement);
		cells[i] = cell;
	}
	fetch("words/dictionary.txt")
	.then(data => data.text())
	.then(text => text.split(/\r?\n/))
	.then(wordList => {
		assignValuesToCells(cells, wordList);
	});
}

async function assignValuesToCells(cells, wordList) {
	const cellsCopy = [...cells];
	const usedWords = [];
	for (let i = 0; i < cells.length / 2; i++) {
		let word, imageURL;
		let max_tries = 5;
		while (!imageURL && max_tries > 0) {
			do {
				word = randomItem(wordList);
			} while (usedWords.includes(word));

			usedWords.push(word);
			imageURL = await getImage(word);
			max_tries--;
		}
		for (let j = 0; j < 2; j++) {
			const index = Math.floor(Math.random() * cellsCopy.length);
			const cell = cellsCopy[index];
			if (imageURL) {
				cell.activate(word, imageURL);
			}
			else {
				console.log("No word with picture found.");
			}
			cellsCopy.splice(index, 1);
		}
	}
}
async function getImage(word) {
	return await getWikipediaImage(word);
}

async function handleClick() {
	if (revealedCells.length > 1) {
		const [cell1, cell2] = revealedCells;
		revealedCells.length = 0;

		if (cell1.getName() === cell2.getName()) {
			cell1.solve();
			cell2.solve();
			unsolvedCells -= 2;
			if (unsolvedCells <= 0) {
				level = Math.min(level + 1, boards.length - 1);
				splashText(randomItem(level <= 1 ? messages.intro : messages.victory));
				endGame(this);
			}
		}
		else {
			remainingMistakes--;
			coolDown = true;

			await new Promise(resolve => setTimeout(resolve, FADE_DELAY));

			coolDown = false;
			cell1.hide();
			cell2.hide();
			if (remainingMistakes <= 0) {
				splashText(randomItem(messages.failure));
				endGame(this);
			}
		}
	}
}

async function endGame(grid) {
	grid.removeEventListener('click', handleClick);
	for (const cell of cells) {
		cell.getElement().removeEventListener('click', cell.unhide);
	}
	let delay = 100;
	const delayStep = 80 / cells.length;
	for (const cell of cells) {
		cell.deactivate();
		await new Promise(resolve => setTimeout(resolve, delay));
		delay += delayStep;
	}
	for (const cell of cells) {
		cell.getElement().remove();
	}
	newGame(boards[level]);
}

async function newGame(board) {
	if (board.cellCount < 4 || board.cellCount % 2 != 0) {
		console.error("Please provide an even cell count greater than or equal to 4.");
		return;
	}
	const grid = document.getElementById('grid');
	createCells(grid, board.cellCount);
	gridLayout.initialize(grid, board);
	window.addEventListener('resize', gridLayout.resizeGrid);
	grid.addEventListener('click', handleClick);
}
newGame(boards[level]);