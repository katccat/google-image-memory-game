import { Config } from './config.js';
import { Elements } from './graphics.js';
import { Graphics } from './graphics.js';
import { GridLayout } from './gridlayout.js';
import { Cell } from './cell.js';
import { Board } from './board.js';
import { BoardCreator } from './board.js';
import { randomItem } from './utils.js';
import { validateImage } from './utils.js';
import { waitForFlag } from './utils.js';

class Game {
	constructor(boards) {
		this.state = {
			coolDown: false,
			cellsFading: false,
			firstRun: true,
			newGame() {
				this.cells = [];
				this.orderSolved = [];
				this.revealedCells = [];
				this.viewedCells = []; // for keeping track of avoidable mistakes
				this.viewedWords = []; // for keeping track of unique pictures seen
				this.usedGlyphs = [];
				this.unsolvedCells = 0;
				this.remainingMistakes = 0;
				this.avoidableMistakesMade = 0;
			},

			reset() {
				this.level = 0;
				this.lives = 3;
				this.viewedWordsInSession = [];
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
			showOverlayText: true,
		};

		this.boards = boards;
		this.faceChanger = new Graphics.faceChanger(this);
	}
	createCells = function (numCells) {
		const fragment = document.createDocumentFragment();
		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			if (Math.random() < Config.funColorChance) {
				cell.setFrontColor(randomItem(Config.colors));
			}
			if (this.state.level === 0 && numCells === Config.introImages.length) {
				cell.setFrontGlyph(Config.introImages[i]);
			}
			else if (Math.random() < Config.funGlyphChance && this.state.usedGlyphs.length < Config.glyphs.length) {
				let glyph;
				do {
					glyph = randomItem(Config.glyphs);
				} while (this.state.usedGlyphs.includes(glyph));
				cell.setFrontGlyph(glyph);
				this.state.usedGlyphs.push(glyph);
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
				if (!board.allowRecycleWords && this.state.viewedWordsInSession.includes(word)) {
					continue;
				}
				imageURL = board.images[word].url;
				if (usedImages.includes(imageURL)) {
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
				activeCellCount++;
				cellsCopy.splice(randomCellIndex, 1);
				if (!sibling1) sibling1 = cell;
				else sibling2 = cell;
			}
			sibling1.sibling = sibling2;
			sibling2.sibling = sibling1;
			const color = this.colorSequencer.nextColor();
			sibling1.setBackColor(color);
			sibling2.setBackColor(color);
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
	deleteCells = async function (victory) {
		let currentDelay = 250;
		const delayStep = 1.1
		if (!victory) {
			for (const cell of this.state.cells) {
				cell.deactivate();
				await new Promise(resolve => setTimeout(resolve, currentDelay));
				currentDelay *= delayStep;
			}
		}
		else {
			for (const cell of this.state.orderSolved) {
				cell.deactivate();
				await new Promise(resolve => setTimeout(resolve, currentDelay));
				currentDelay *= delayStep;
			}
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
				this.state.orderSolved.push(cell1, cell2);
				if (this.state.unsolvedCells <= 0) {
					if (this.board.giveLife) this.incrementLives(true);
					this.state.level++;
					//await Elements.gridContainer.animate(Config.animation.enlarge.keyframes, Config.animation.enlarge.options).finished;
					await new Promise(resolve => setTimeout(resolve, 3000));
					this.newGame(true, Config.boardAnimationID.fade);
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
					Elements.tooltip.classList.toggle('fail', true);
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

				const fadeDelay = new Promise(resolve => setTimeout(resolve, Config.fadeDelay));
				const interrupt = waitForFlag(() => this.state.cellsFading);

				await Promise.race([fadeDelay, interrupt]);

				this.state.cellsFading = false;
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

	selectMessage = function (victory) {
		if (this.state.firstRun) return null;
		if (victory) {
			if (this.state.level <= 1) return Config.messages.intro;
			if (this.state.avoidableMistakesMade === 0) return Config.messages.perfect;
			if (this.state.remainingMistakes === 0) return Config.messages.nearmiss;
			return Config.messages.victory;
		}
		if (this.state.level < this.memory.previousLevel) return Config.messages.gameover;
		return Config.messages.failure;
	};

	newGame = async function (victory, boardAnimation = Config.boardAnimationID.fade) {
		// ── Message selection (before state resets) ──────────────────
		let messageList = this.selectMessage(victory);
		/*if (victory && this.board.giveLife) {
			messageList = ["+1!"];
		};*/
		// ── Board selection ──────────────────────────────────────────
		if (this.state.level <= this.boards.length - 1) {
			this.board = this.boards[this.state.level];
		} else {
			this.board = BoardCreator.createBoard(this.state.level);
		}

		if (this.board.cellCount < 4 || this.board.cellCount % 2 !== 0) {
			console.error("Please provide an even cell count greater than or equal to 4.");
			return;
		}
		// ── Begin teardown ───────────────────────────────────────────
		this.state.coolDown = true;
		this.visualState.showLoading = boardAnimation === Config.boardAnimationID.buffering;

		if (boardAnimation === Config.boardAnimationID.fade) {
			// Fade out grid and tooltip simultaneously, reset tooltip once faded
			Elements.grid.classList.toggle('active', false);
			Elements.tooltip.classList.toggle('fade-out', true);
			Elements.tooltip.addEventListener('transitionend', () => {
				Graphics.resetToolTip(this, victory);
			}, { once: true });
		}

		// Wait for cells to finish fading out before removing them
		await this.deleteCells(victory);

		// ── State reset ──────────────────────────────────────────────
		if (victory) {
			this.state.viewedWordsInSession.push(...this.state.viewedWords);
			if (this.state.viewedWordsInSession.length >= Object.keys(Config.category.all).length - 50) {
				this.state.viewedWordsInSession = [];
			}
		}
		this.state.newGame();

		// ── Build new board ──────────────────────────────────────────
		const levelChanged = this.state.level !== this.memory.previousLevel;
		if (levelChanged) this.gridLayout.update(this.board.cellCount);
		this.createCells(this.board.cellCount);

		// ── Splash message (blocks until animation completes) ────────
		if (messageList) await Graphics.splashText(randomItem(messageList));

		// ── Fade grid back in ────────────────────────────────────────
		Elements.grid.classList.toggle('active', true);
		Elements.tooltip.classList.toggle('fade-out', false);
		if (boardAnimation === Config.boardAnimationID.buffering) {
			Graphics.resetToolTip(this, victory);
		}

		// ── Activate cells (animates in one by one) ──────────────────
		await this.activateCells(this.board, levelChanged);

		// ── Finalise ─────────────────────────────────────────────────
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
			}
		}
		else this.state.lives--;
	};
}

async function init() {
	await Config.getCategories();
	const boards = [
		new Board(4, Config.category.all),
		new Board(8, Config.category.all, 1),
	];
	const game = new Game(boards);
	game.gridLayout = new GridLayout(Elements);
	game.colorSequencer = new Graphics.colorSequencer(Config.darkColors);
	globalThis.game = game;
	game.newGame(true, Config.boardAnimationID.fade);
	window.addEventListener('resize', () => game.gridLayout.resizeGrid());
	Elements.grid.addEventListener('click', () => game.handleClick());
	Elements.faceDisplay.addEventListener('click', () => {
		game.incrementLives(false);
		game.newGame(false, Config.boardAnimationID.buffering);
	});
}
init();