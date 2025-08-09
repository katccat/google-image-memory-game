const gridLayout = new function() {
	let grid, cellCount, suitableFactors;
	let maintainSquare = false;
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
		let smallestDiffWithFactor = Infinity;
		let bestColumnCount = suitableFactors[0];
		for (const factor of suitableFactors) {
			let diff = Math.abs(factor - columnCountEstimate);
			if (diff < smallestDiffWithFactor) {
				smallestDiffWithFactor = diff;
				bestColumnCount = factor;
			}
		}
		let bestRowCount = cellCount / bestColumnCount;
		return [bestColumnCount, bestRowCount];
	}
	this.resizeGrid = () => {
		let aspectRatio = window.innerWidth / window.innerHeight;
		let dimensions = this.findBestDimensions(aspectRatio);
		let columns = dimensions[0];
		let rows = dimensions[1];
		grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
		grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
		grid.style.aspectRatio = `${columns} / ${rows}`;
	}
};

const grid = document.getElementById('grid');
const numCells = 16;
const cells = [];
const revealedCells = [];
let unsolvedCells = 0; 

function Cell() {
	const cellState = {
		DEFAULT: 'default',
		REVEALED: 'revealed',
		SOLVED: 'solved',
		INACTIVE: 'inactive',
	}
	let state = cellState.INACTIVE;

	const container = document.createElement('div');
	container.className = 'cell';

	const text = document.createElement('div');
	text.className = 'overlay-text';
	container.appendChild(text);

	const mask = document.createElement('div');
	mask.className = 'mask';
	container.appendChild(mask);

	let id;
	this.getElement = function() {
		return container;
	}
	this.activate = function(word, src) {
		id = word;
		text.textContent = word;
		container.style.backgroundImage = `url(${src})`;
		container.classList.add("active");
		state = cellState.DEFAULT;
		unsolvedCells += 1;
	}
	this.getName = function() {
		return id;
	}
	this.hide = function() {
		state = cellState.DEFAULT;
		mask.classList.remove('fade-out');
	}
	this.unhide = () => {
		if (state != cellState.DEFAULT) return;
		state = cellState.REVEALED;
		mask.classList.add('fade-out');
		revealedCells.push(this);
	};
	this.solve = function() {
		state = cellState.SOLVED;
	}
}

function createCells(gridElement, numCells) {
	cells.length = 0;
	unsolvedCells = 0;
	for (let i = 0; i < numCells; i++) {
		const cell = new Cell();
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
	const cellsCopy = cells.slice();
	const usedWords = [];
	for (let i = 0; i < cells.length / 2; i++) {
		let word;
		let imageURL;
		let max_tries = 3;
		while (!imageURL && max_tries > 0) {
			do {
				word = wordList[Math.floor(Math.random() * wordList.length)];
			} while (usedWords.includes(word));
			usedWords.push(word);
			imageURL = await getImage(word);
			max_tries--;
		}
		for (let i = 0; i < 2; i++) {
			let index = Math.floor(Math.random() * cellsCopy.length);
			let cell = cellsCopy[index];
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
async function getWikipediaImage(title) {
	const params = {
		action: 'query',
		prop: 'pageimages',
		piprop: 'thumbnail',
		pithumbsize: 800,
		pilicense: 'any',
		titles: title,
		format: 'json',
		formatversion: 2,
		origin: '*'
	};

	const url = new URL("https://en.wikipedia.org/w/api.php");
	url.search = new URLSearchParams(params).toString();

	return fetch(url)
	.then(res => res.json())
	.then(data => {
		const page = data.query.pages[0];
		if (page.thumbnail) {
			return page.thumbnail.source;
		}
	});
}

createCells(grid, numCells);
gridLayout.initialize(grid, numCells);
window.addEventListener('resize', gridLayout.resizeGrid);

grid.addEventListener('click', async function () {
	if (revealedCells.length > 1) {
		const cell1 = revealedCells[0];
		const cell2 = revealedCells[1];
		revealedCells.length = 0;
		if (cell1.getName() === cell2.getName()) {
			cell1.solve();
			cell2.solve();
			unsolvedCells -= 2;
			if (unsolvedCells <= 0) console.log("You win!");
		} 
		else {
			await new Promise(resolve => setTimeout(resolve, 1000));
			cell1.hide();
			cell2.hide();
		}
	}
});