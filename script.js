const cells = [];
const revealedCells = [];
let unsolvedCells = 0;
let remainingMistakes;
let coolDown = false;
let level = 0;

const FADE_DELAY = 1000;
const squares = [4, 16, 20, 24, 24, 36];
const FUN_COLOR_CHANCE_CHANCE = 0.2;
const colors = {
	red: '#f07f75',
	blue: '#86b2f9',
	yellow: '#fdd868',
	green: '#76d590',
}

const gridLayout = new function() {
	let grid, cellCount, suitableFactors;

	this.initialize = function(gridElement, numCells) {
		grid = gridElement;
		cellCount = numCells;
		suitableFactors = [];
		for (let i = 2; i < cellCount; i++) {
			if (cellCount % i == 0) suitableFactors.push(i);
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
	if (Math.random() < FUN_COLOR_CHANCE_CHANCE) {
		const colorKeys = Object.keys(colors);
		const randomColor = colors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
		mask.style.backgroundColor = randomColor;
	}

	container.appendChild(mask);

	this.getElement = function() {
		return container;
	}
	this.getName = function () {
		return id;
	}
	this.activate = function(word, src) {
		id = word;
		text.textContent = word;
		container.style.backgroundImage = `url(${src})`;
		container.classList.add("active");
		state = cellState.DEFAULT;
		unsolvedCells += 1;
	}
	this.deactivate = function () {
		state = cellState.INACTIVE;
		container.classList.remove("active");
	}
	this.hide = function() {
		state = cellState.DEFAULT;
		mask.classList.remove('fade-out');
	}
	this.unhide = () => {
		if (state != cellState.DEFAULT || coolDown == true) return;
		state = cellState.REVEALED;
		mask.classList.add('fade-out');
		revealedCells.push(this);
	};
	this.solve = function() {
		state = cellState.SOLVED;
		text.classList.add('fade-out');
	}
	this.setMaskImage = function(src) {
		mask.style.backgroundImage = `url(${src})`;
	}
}

function createCells(gridElement, numCells) {
	cells.length = 0;
	unsolvedCells = 0;
	remainingMistakes = numCells / 2 - 1;
	const titleText = ['images/im.png', 'images/not.png', 'images/a.png', 'images/robot.png'];
	for (let i = 0; i < numCells; i++) {
		const cell = new Cell();
		if (numCells == titleText.length) {
			cell.setMaskImage(titleText[i]);
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
				word = wordList[Math.floor(Math.random() * wordList.length)];
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
				level = Math.min(level + 1, squares.length - 1);
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
			if (remainingMistakes <= 0) endGame(this);
		}
	}
}

async function endGame(grid) {
	grid.removeEventListener('click', handleClick);
	for (const cell of cells) {
		cell.getElement().removeEventListener('click', cell.unhide);
	}
	let delay = 100;
	for (const cell of cells) {
		cell.deactivate();
		await new Promise(resolve => setTimeout(resolve, delay));
		delay += 20;
	}
	for (const cell of cells) {
		cell.getElement().remove();
	}
	newGame(squares[level]);
}

async function newGame(numCells) {
	const grid = document.getElementById('grid');
	createCells(grid, numCells);
	gridLayout.initialize(grid, numCells);
	window.addEventListener('resize', gridLayout.resizeGrid);
	grid.addEventListener('click', handleClick);
}
newGame(squares[level]);