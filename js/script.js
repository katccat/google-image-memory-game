import { Config } from './config.js';
import { Elements } from './graphics.js';
import { Graphics } from './graphics.js';
import { GridLayout } from './gridlayout.js';
import { Cell } from './cell.js';
import { Board } from './board.js';
import { BoardCreator } from './board.js';
import { randomItem } from './utils.js';
import { validateImage } from './utils.js';

class Game {
	constructor(boards) {
		this.state = {
			coolDown: false,
			firstRun: true,
			newGame() {
				this.cells = [];
				this.revealedCells = [];
				this.viewedCells = [];
				this.viewedWords = [];
				this.usedGlyphs = [];
				this.unsolvedCells = 0;
				this.remainingMistakes = 0;
				this.avoidableMistakesMade = 0;
			},

			reset() {
				this.level = 0;
				this.lives = 3;
			}
		};
		this.state.newGame();
		this.state.reset();
		this.memory = {
			validImages: [],
			previousLevel: -1,
		};
		this.visualState = {
			showLoading: false,
			splashNames: false,
			showOverlayText: true,
		};

		this.boards = boards;
		this.faceChanger = new Graphics.faceChanger(this);
	}
	createCells = function (numCells) {
		const fragment = document.createDocumentFragment();
		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			if (numCells === Config.introImages.length) {
				cell.img = Config.introImages[i];
			}
			fragment.appendChild(cell.getElement());
			this.state.cells.push(cell);
		}
		Elements.grid.appendChild(fragment);
	};
	activateCells = async function (board, animate) {
		let cellsCopy = [...this.state.cells];
		const usedImages = [];
		const wordList = Object.keys(board.images);
		let activeCellCount = 0;
		for (let i = 0; i < this.state.cells.length / 2; i++) {
			let tries = 0;
			let imageValid = false;
			let word, imageURL;
			while (tries < 10) {
				tries++;
				let wordIndex = Math.floor(Math.random() * wordList.length);
				word = wordList[wordIndex];
				imageURL = board.images[word].url;
				if (!board.images[word].whitelisted || usedImages.includes(imageURL)) {
					continue;
				}
				imageValid = await validateImage(imageURL, this);
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
				const randomCellIndex = Math.floor(Math.random() * cellsCopy.length);
				const cell = cellsCopy[randomCellIndex];
				cell.activate(word, imageURL);
				if (Math.random() < board.funColorChance) {
					const randomColor = randomItem(Config.colors);
					cell.setColor(randomColor);
				}
				activeCellCount++;
				cellsCopy.splice(randomCellIndex, 1);
			}
		}
		this.state.unsolvedCells = activeCellCount;
		this.state.remainingMistakes = activeCellCount / 2 - 1 + board.additionalMistakes;

		cellsCopy = [...this.state.cells];
		let delay = 300;
		for (let i = 0; i < activeCellCount; i++) {
			const randomCellIndex = Math.floor(Math.random() * cellsCopy.length);
			const cell = cellsCopy[randomCellIndex];
			cell.reveal();
			cellsCopy.splice(randomCellIndex, 1);
			if (delay > 0 && animate) {
				await new Promise(resolve => setTimeout(resolve, delay));
				delay = Math.floor(delay * 0.8);
			}
		}
	};
	deleteCells = async function () {
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
	};
	handleClick = async function () {
		if (this.state.revealedCells.length > 1) {
			const [cell1, cell2] = this.state.revealedCells;
			this.state.revealedCells.length = 0;

			if (cell1.getName() === cell2.getName()) {
				cell1.solve();
				cell2.solve();
				this.state.unsolvedCells -= 2;
				if (this.state.unsolvedCells <= 0) {
					if (this.board.giveLife) this.incrementLife(true);
					this.state.level++;
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
					//Elements.tooltip.classList.toggle('fail', true);
					this.incrementLife(false);
					Graphics.updateLives(this.state.lives);
					if (this.state.lives <= 0) {
						this.restartGame();
					}
					else {
						this.newGame(false);
					}
				}

				//this.state.coolDown = true;

				await new Promise(resolve => setTimeout(resolve, Config.fadeDelay));

				//this.state.coolDown = false;
				cell1.hide();
				cell2.hide();

			}
			for (const cell of [cell1, cell2]) {
				if (!this.state.viewedCells.includes(cell)) {
					this.state.viewedCells.push(cell);
				}
			}
		}
	};
	newGame = async function (victory) {
		if (this.state.level <= this.boards.length - 1) {
			this.board = this.boards[this.state.level];
		}
		else this.board = BoardCreator.createBoard(this.state.level);

		if (this.board.cellCount < 4 || this.board.cellCount % 2 !== 0) {
			console.error("Please provide an even cell count greater than or equal to 4.");
			return;
		}
		this.visualState.showLoading = !victory && this.state.level == this.memory.previousLevel;
		let messageList;
		if (!this.state.firstRun) {
			if (victory) {
				if (this.state.level <= 1) messageList = Config.messages.intro;
				else if (this.state.avoidableMistakesMade == 0) messageList = Config.messages.perfect;
				else if (this.state.remainingMistakes == 0) messageList = Config.messages.nearmiss;
				else messageList = Config.messages.victory;
			}
			else if (this.state.level < this.memory.previousLevel) messageList = Config.messages.gameover;
			else messageList = Config.messages.failure;
		}

		this.state.coolDown = true;
		if (this.state.level != this.memory.previousLevel) {
			Elements.tooltip.classList.toggle('fade-out', true);
			Elements.grid.classList.toggle('active', false);
			Elements.tooltip.addEventListener('transitionend', () => {
				Graphics.resetToolTip(this, victory);
			}, { once: true });
		}
		await this.deleteCells();
		this.state.newGame();
		this.visualState.splashNames = this.board.textMode == Board.textMode.splashText;
		if (this.state.level != this.memory.previousLevel) gridLayout.update(this.board.cellCount);
		this.createCells(this.board.cellCount);
		if (messageList) await Graphics.splashText(randomItem(messageList));
		Elements.tooltip.classList.toggle('fade-out', false);
		Elements.grid.classList.toggle('active', true);
		if (this.state.level == this.memory.previousLevel) {
			Graphics.resetToolTip(this, false);
		}
		await this.activateCells(this.board, this.state.level != this.memory.previousLevel);
		this.faceChanger.setMaxMistakes(this.state.remainingMistakes);
		this.state.coolDown = false;
		this.state.firstRun = false;
		this.memory.previousLevel = this.state.level;
	};
	restartGame = function () {
		Graphics.updateLives(this.state.lives);
		this.state.reset();
		this.newGame(false);
	};
	incrementLife = function (increment) {
		if (increment) {
			if (this.state.lives < Config.maxLives) {
				this.state.lives++;
				Graphics.splashTextInstant("+1!");
			}
		}
		else this.state.lives--;
	};
}

const boards = [];
{
	await Config.getCategories();
	boards.push(new Board(4, Config.category.all)); // 0
	boards.push(new Board(8, Config.category.all, 1)); // 1
}
const gridLayout = new GridLayout(Elements);
const game = new Game(boards);
globalThis.game = game;
game.newGame(true);
window.addEventListener('resize', () => gridLayout.resizeGrid());
Elements.grid.addEventListener('click', () => game.handleClick());
Elements.faceDisplay.addEventListener('click', () => {
	game.incrementLife(false);
	game.newGame(false);
});