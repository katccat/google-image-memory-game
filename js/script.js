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
			cellsFading: false,
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
			let sibling1, sibling2;
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
				if (!sibling1) sibling1 = cell;
				else sibling2 = cell;
			}
			sibling1.sibling = sibling2;
			sibling2.sibling = sibling1;
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
		if (this.state.revealedCells.length == 1) {
			this.state.revealedCells[0].highlight();
		}
		else if (this.state.revealedCells.length > 1) {
			const [cell1, cell2] = this.state.revealedCells;
			this.state.revealedCells.length = 0;

			if (cell1.getName() === cell2.getName()) {
				cell1.solve();
				cell2.solve();
				this.state.unsolvedCells -= 2;
				if (this.state.unsolvedCells <= 0) {
					if (this.board.giveLife) this.incrementLives(true);
					this.state.level++;
					Elements.gridContainer.animate(Config.animation.enlarge.keyframes, Config.animation.enlarge.options);
					Elements.gridContainer.addEventListener('transitionend', () => {
						this.newGame(true, Config.boardAnimationID.fade);
					}, { once: true });
				}
			}
			else {
				this.state.remainingMistakes--;
				// if either of these cells have already been viewed, this could have been avoided
				if (this.state.viewedCells.includes(cell1) || this.state.viewedCells.includes(cell2)) {
					this.state.avoidableMistakesMade++;
					cell1.shake();
					cell2.shake();
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
					this.incrementLives(false);
					Graphics.updateLives(this.state.lives);
					if (this.state.lives <= 0) {
						this.restartGame();
					}
					else {
						this.newGame(false, Config.boardAnimationID.buffering);
					}
					return;
				}
				this.state.cellsFading = true;

				function waitForFlag(flagRef) {
					return new Promise(resolve => {
						function checkFlag() {
							if (flagRef()) {
								// keep checking until it turns false
								setTimeout(checkFlag, 50);
							} else {
								resolve();
							}
						}
						checkFlag();
					});
				}

				const fadeDelay = new Promise(resolve => setTimeout(resolve, Config.fadeDelay));
				const interrupt = waitForFlag(() => this.state.cellsFading);

				await Promise.race([fadeDelay, interrupt]);

				this.state.cellsFading = false;
				cell1.hide();
				cell2.hide();

			}
			for (const cell of [cell1, cell2]) {
				cell.unhighlight();
				if (!this.state.viewedCells.includes(cell)) {
					this.state.viewedCells.push(cell);
				}
			}
		}
	};
	newGame = async function (victory, boardAnimation = Config.boardAnimationID.fade) {
		if (this.state.level <= this.boards.length - 1) {
			this.board = this.boards[this.state.level];
		}
		else this.board = BoardCreator.createBoard(this.state.level);

		if (this.board.cellCount < 4 || this.board.cellCount % 2 !== 0) {
			console.error("Please provide an even cell count greater than or equal to 4.");
			return;
		}
		this.visualState.showLoading = boardAnimation == Config.boardAnimationID.buffering;
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
		if (boardAnimation == Config.boardAnimationID.fade) {
			Elements.grid.classList.toggle('active', false);
			Elements.tooltip.classList.toggle('fade-out', true);
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
		Elements.grid.classList.toggle('active', true);
		Elements.tooltip.classList.toggle('fade-out', false);
		if (boardAnimation == Config.boardAnimationID.buffering) {
			Graphics.resetToolTip(this, victory);
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
		this.newGame(false, Config.boardAnimationID.fade);
	};
	incrementLives = function (increment) {
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
game.newGame(true, Config.boardAnimationID.fade);
window.addEventListener('resize', () => gridLayout.resizeGrid());
Elements.grid.addEventListener('click', () => game.handleClick());
Elements.faceDisplay.addEventListener('click', () => {
	game.incrementLives(false);
	game.newGame(false, Config.boardAnimationID.buffering);
});