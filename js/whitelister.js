import { GridLayout } from './gridlayout.js';

class Game {
	static config = {
		fadeDelay: 700,
		category: {
			all: '/words/images-2.json',
			dogs: '/words/dogs.json',
			foods: '/words/foods.json',
		},
		cellsPerGrid: 16,
	};
	static elements = {
		grid: document.getElementById('grid'),
		gridContainer: document.getElementById('grid-container'),
		tooltip: document.getElementById('tooltip'),
		levelDisplay: document.getElementById('level-counter'),
		faceDisplay: document.getElementById('face'),
	};

	constructor() {
		this.state = {
			cells: [],
			unsolvedCells: 0,
			coolDown: false,
			level: 0,
		};
		this.totalSets = 0;
	}

	async createCells(numCells) {
		this.state.cells = [];
		this.state.unsolvedCells = 0;
		const fragment = document.createDocumentFragment();
		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			fragment.appendChild(cell.getElement());
			this.state.cells.push(cell);
		}
		Game.elements.grid.appendChild(fragment);

		await this.assignValuesToCells();
	}
	async assignValuesToCells() {
		this.state.coolDown = true;
		const wordList = Object.keys(imageJSON);
		const activeCells = Math.min(this.state.cells.length, wordList.length);
		for (let i = 0; i < activeCells; i++) {
			let word = wordList[i];
			let imageURL = imageJSON[word].url;
			this.state.cells[i].activate(word, imageURL);
		}
		this.state.unsolvedCells = activeCells;
		this.state.coolDown = false;
	}

	async handleClick() {
		this.state.unsolvedCells--;
		if (this.state.unsolvedCells <= 0) {
			// commit buffered changes
			pushChanges();
			if (Object.keys(imageJSON).length > 0) this.newGame();
		}
	}

	async deleteCells() {
		this.state.coolDown = true;
		for (const cell of this.state.cells) {
			cell.getElement().remove();
		}
		this.state.coolDown = false;
	}

	async newGame(proceed = true) {
		if (proceed) this.state.level++;
		pendingApproved = {};
		pendingRejected = {};
		pendingClear = [];
		Game.elements.levelDisplay.innerText = `Set ${this.state.level} of ${this.totalSets}`;
		await this.deleteCells();
		await this.createCells(Game.config.cellsPerGrid);
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

		this.interactContainer = document.createElement('div');
		this.interactContainer.className = 'controls';

		let rejectArea = document.createElement('div');
		rejectArea.className = 'reject';
		this.rejectImage = document.createElement('div');
		this.rejectImage.className = 'image';
		this.rejectImage.innerText = 'I';
		this.rejectWord = document.createElement('div');
		this.rejectWord.className = 'word';
		this.rejectWord.innerText = 'W';
		rejectArea.appendChild(this.rejectImage);
		rejectArea.appendChild(this.rejectWord);
		
		this.approveButton = document.createElement('div');
		this.approveButton.className = 'approve';

		this.interactContainer.appendChild(rejectArea);
		this.interactContainer.appendChild(this.approveButton);
		this.container.appendChild(this.interactContainer);

		this.textDisplay = document.createElement('div');
		this.textDisplay.className = 'overlay-text';
		this.container.appendChild(this.textDisplay);
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
		this.container.classList.add("active");
		this.state = Cell.State.DEFAULT;
		this.approveButton.addEventListener('click', addWord.bind(this));
		this.rejectImage.addEventListener('click', rejectImage.bind(this));
		this.rejectWord.addEventListener('click', rejectWord.bind(this));
	}
	deactivate() {
		this.state = Cell.State.INACTIVE;
		this.container.classList.remove("active");
		this.interactContainer.remove();
	}
	setOverlayImage(src) {
		this.overlay.style.backgroundImage = `url(${src})`;
	}
}
const approvedImageJSONItems = {};
const rejectedImageJSONItems = {
	doNotRetry : [],
	retry: [],
	rejectedImages: {}
};

class imageJSONItem {
	constructor(src, approved = true) {
		this.url = src;
		this.whitelisted = approved;
	}
}

// temp buffers, cleared each set
let pendingApproved = {};
let pendingRejected = {};
let pendingClear = [];

function addWord() {
	const word = this.getName();
	const item = new imageJSONItem(imageJSON[word].url, true);
	pendingApproved[word] = item;
	pendingClear.push(word);
	this.deactivate();
	game.handleClick();
}
function rejectWord() {
	const word = this.getName();
	const item = new imageJSONItem(imageJSON[word].url, true);
	if (!pendingRejected.doNotRetry) pendingRejected.doNotRetry = [];
	pendingRejected.doNotRetry.push(word);
	pendingClear.push(word);
	this.deactivate();
	game.handleClick();
}
function rejectImage() {
	const word = this.getName();
	const imageURL = imageJSON[word].url;
	if (!pendingRejected.rejectedImages) pendingRejected.rejectedImages = {};
	if (pendingRejected.rejectedImages[word]) pendingRejected.rejectedImages[word].url.push(imageURL);
	else {
		pendingRejected.rejectedImages[word] = {url: [imageURL]};
	}
	if (!pendingRejected.retry) pendingRejected.retry = [];
	pendingRejected.retry.push(word);
	pendingClear.push(word);
	this.deactivate();
	game.handleClick();
}
function pushChanges() {
	// Merge approved
	Object.assign(approvedImageJSONItems, pendingApproved);

	// Merge rejected arrays
	if (pendingRejected.doNotRetry) {
		rejectedImageJSONItems.doNotRetry.push(...pendingRejected.doNotRetry);
	}
	if (pendingRejected.retry) {
		rejectedImageJSONItems.retry.push(...pendingRejected.retry);
	}

	// Merge rejectedImages (nested object of arrays)
	if (pendingRejected.rejectedImages) {
		for (const [word, data] of Object.entries(pendingRejected.rejectedImages)) {
			if (!rejectedImageJSONItems.rejectedImages[word]) {
				rejectedImageJSONItems.rejectedImages[word] = { url: [] };
			}
			rejectedImageJSONItems.rejectedImages[word].url.push(...data.url);
		}
	}

	// Clear used words from main JSON
	for (const word of pendingClear) {
		delete imageJSON[word];
	}

	console.log("Approved:\n" + JSON.stringify(approvedImageJSONItems, null, 2));
	console.log("Rejected:\n" + JSON.stringify(rejectedImageJSONItems, null, 2));

	if (Object.keys(imageJSON).length == 0) {
		if (Object.keys(approvedImageJSONItems).length > 0) {
			const approvedFile = new Blob(
				[JSON.stringify(approvedImageJSONItems, null, '\t')],
				{ type: "application/json" }
			);
			createDownload(approvedFile, "images.json");
		}
		if (Object.keys(rejectedImageJSONItems).length > 0) {
			const rejectedFile = new Blob(
				[JSON.stringify(rejectedImageJSONItems, null, '\t')],
				{ type: "application/json" }
			);
			createDownload(rejectedFile, "rejected.json");
		}
	}
}

function createDownload(file, name) {
	const url = URL.createObjectURL(file);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
}

const imageJSON = await fetch('./words/images.json').then(res => res.json());

const gridLayout = new GridLayout(Game.elements);
gridLayout.update(Game.config.cellsPerGrid);
const game = new Game();
{
	const wordList = Object.keys(imageJSON);
	for (const word of wordList) {
		if (imageJSON[word].whitelisted) {
			const imageURL = imageJSON[word].url;
			pendingApproved[word] = new imageJSONItem(imageURL, true);
		}
	}
	pushChanges();
	game.totalSets = Math.ceil(Object.keys(imageJSON).length / Game.config.cellsPerGrid);
}
game.newGame();
window.addEventListener('resize', () => gridLayout.resizeGrid());
Game.elements.faceDisplay.addEventListener('click', () => game.newGame(false));