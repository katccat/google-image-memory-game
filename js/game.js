import { Config } from './config.js';
import { Elements, Graphics, FaceChanger, PercentScorer, ColorSequencer } from './graphics.js';
import { GridLayout } from './gridLayout.js';
import { Cell } from './cell.js';
import { Board, BoardCreator } from './board.js';
import { randomItem, shuffle, hideBackground, waitForFlag } from './utils.js';
import { CellLoopScheduler } from './cellSolvedLoop.js';
import { TrendSelector } from './trendSelector.js';
import { soundEffects } from './soundEffects.js';

export class Game {
	constructor(trendData, challengeMode = false, reportBuffer = null) {
		this.trendData = trendData;
		this.reportBuffer = reportBuffer;
		this.gameDate = trendData.fetchedDate;
		this.saveProgress = true;
		this.challengeMode = challengeMode;
		this.state = {
			coolDown: false,
			cellsFading: false,
			firstRun: true,
			previousLevel: -1,
			score: { num: 0, denominator: 1 },
			refresh() {
				this.cells = [];
				this.solvedCells = [];
				this.revealedCells = [];
				this.viewedCells = [];
				this.unsolvedCells = 0;
				this.remainingMistakes = 0;
				this.avoidableMistakes = 0;
				this.pendingTrends = new Set();
				this.victory = false;
				this.announceMilestone = false;
			},
			reset() {
				this.level = 0;
				this.lives = 3;
				this.totalAvoidableMistakes = 0;
				this.totalLevelsCompleted   = 0;
				this.perfectLevels          = 0;
			}
		};
		this.state.refresh();
		this.state.reset();
		this.boards = [];

		if (this.challengeMode) this.boards.push(new Board(4, 1));
		else this.boards.push(new Board(4, 0), new Board(8, 0));

		this._build();

		this.gridLayout = new GridLayout(Elements);
		this.faceChanger = new FaceChanger(this);
		this.trendSelector = new TrendSelector(trendData, this);
		this.percentScorer = new PercentScorer();
		this.cellLoopScheduler = new CellLoopScheduler();
		this.colorSequencerDark = new ColorSequencer(Config.darkColors);
		this.colorSequencerLight = new ColorSequencer(Config.colors);
		this.restore();

		this._resizeHandler = () => this.gridLayout.resizeGrid();
		this._gridClickHandler = () => this.onCellClick();
		this._faceClickHandler = () => window.history.back();

		window.addEventListener('resize', this._resizeHandler);
		Elements.grid.addEventListener('click', this._gridClickHandler);
		Elements.faceContainer.addEventListener('click', this._faceClickHandler);

		if (Config.isDev) {
			this._devKeyHandler = (e) => {
				if (e.key !== 'W') return; // Shift+W
				const stats = {
					trendsCollected:   this.state.score.num            || 45,
					levelsCompleted:   this.state.totalLevelsCompleted  || 8,
					perfectLevels:     this.state.perfectLevels         || 5,
					avoidableMistakes: this.state.totalAvoidableMistakes,
				};
				Graphics.showWinScreen(stats, () => console.log('[dev] win screen dismissed'));
			};
			window.addEventListener('keydown', this._devKeyHandler);
		}
	}

	_build() {
		const container = document.createElement('div');
		container.id = 'game-container';
		container.className = 'shadow';
		container.innerHTML = `
			<div id="tooltip">
				<span class="tooltip-text">
					<span id="title">I'm not a robot</span><h1><span id="level-counter">Level  </span></h1>
				</span>
				<div id="tooltip-right">
					<div id="score-bar">
						<div id="score-bar-fill"></div>
					</div>
					<div id="tooltip-right-inner">
						<div class="face-container">
							<img id="glasses">
							<img src="images/faces/1.png" id="face">
						</div>
						<span id="score-counter">0.0%</span>
					</div>
				</div>
			</div>
			<div id="grid">
				<div id="in-game-message" class="center">0</div>
				<div id="continue-prompt" class="center">Tap to<br>Continue</div>
				<img id="splash-image" class="center" src="images/faces/7a.png">
			</div>
		`;
		document.body.appendChild(container);

		Elements.gameContainer  = container;
		Elements.grid           = container.querySelector('#grid');
		Elements.tooltip        = container.querySelector('#tooltip');
		Elements.title          = container.querySelector('#title');
		Elements.levelDisplay   = container.querySelector('#level-counter');
		Elements.scoreDisplay   = container.querySelector('#score-counter');
		Elements.messageText    = container.querySelector('#in-game-message');
		Elements.splashImage    = container.querySelector('#splash-image');
		Elements.faceDisplay    = container.querySelector('#face');
		Elements.faceOverlay    = container.querySelector('#glasses');
		Elements.faceContainer  = container.querySelector('.face-container');
		Elements.continuePrompt = container.querySelector('#continue-prompt');

		if (Config.isDev) Elements.title.textContent = "I'm not a robot (dev)";
		if (this.challengeMode) Elements.tooltip.classList.add('red');
	}

	_teardownDOM() {
		Elements.gameContainer?.remove();
		Elements.gameContainer  = null;
		Elements.grid           = null;
		Elements.tooltip        = null;
		Elements.title          = null;
		Elements.levelDisplay   = null;
		Elements.scoreDisplay   = null;
		Elements.messageText    = null;
		Elements.splashImage    = null;
		Elements.faceDisplay    = null;
		Elements.faceOverlay    = null;
		Elements.faceContainer  = null;
		Elements.continuePrompt = null;
	}

	restore = function() {
		const date = this.gameDate;
		if (!date) { this.saveProgress = false; return; }
		const dateEntry = JSON.parse(localStorage.getItem(this.gameDate));
		let savedData;
		if (dateEntry) {
			savedData = this.challengeMode
				? dateEntry.challenge
				: dateEntry.normal ?? dateEntry;
		}
		let trendKeysRestored;
		if (savedData) {
			try {
				this.trendSelector.restoreKeys(savedData.trendKeys);
				trendKeysRestored = true;
			} catch {
				trendKeysRestored = false;
			}
			try {
				if (savedData.score) this.state.score = savedData.score;
			} catch {}
			if (!trendKeysRestored) return;
			try {
				if (savedData.session) {
					this.board = savedData.session.board;
					this.state.level = savedData.session.level;
					this.state.lives = savedData.session.lives;
				}
			} catch {}
		}
		this.updateScore(this.trendSelector.getScore(), false);
		this.saveProgress = true;
	}

	_getIntroMessage() {
		const entry = randomItem(Config.introMessage);
		const words = randomItem(entry.words);
		return entry.shuffle ? shuffle(words) : words;
	}

	createCells = function(numCells) {
		const fragment = document.createDocumentFragment();
		const introMessage = this._getIntroMessage();
		const usedGlyphs = [];
		for (let i = 0; i < numCells; i++) {
			const cell = new Cell(this);
			if (this.state.level === 0 && numCells === 4) {
				cell.writeOnFront(introMessage[i]);
				cell.setFontColor(this.colorSequencerLight.nextColor());
			} else if (Math.random() < Config.funGlyphChance && usedGlyphs.length < Config.glyphs.length) {
				let glyph;
				do { glyph = randomItem(Config.glyphs); } while (usedGlyphs.includes(glyph));
				cell.setFrontGlyph(glyph);
				usedGlyphs.push(glyph);
			}
			fragment.appendChild(cell.getElement());
			this.state.cells.push(cell);
		}
		Elements.grid.appendChild(fragment);
	}

	activateCells = async function(board, animate = true) {
		let cellsCopy = [...this.state.cells];
		let activatedCells = [];
		const randomTrendKeys = await this.trendSelector.getRandomTrendKeys(this.state.cells.length / 2);
		for (let i = 0; i < randomTrendKeys.length; i++) {
			const { key, usedTrend } = randomTrendKeys[i];
			const trendObject = this.trendData.trends[key];
			if (!this.challengeMode) shuffle(trendObject.url);
			const images = [...trendObject.url];
			const cellPair = [];
			for (let j = 0; j < 2; j++) {
				const index = Math.floor(Math.random() * cellsCopy.length);
				const cell = cellsCopy.splice(index, 1)[0];
				if (this.challengeMode && images.length > 0) {
					const imageIndex = Math.floor(Math.random() * images.length);
					const url = images.splice(imageIndex, 1);
					cell.activate(key, { ...trendObject, url });
				} else {
					cell.activate(key, trendObject);
				}
				cell.usedTrend = usedTrend;
				cellPair.push(cell);
				activatedCells.push(cell);
			}
			const color = this.colorSequencerDark.nextColor();
			cellPair.forEach(cell => {
				cell.setBackColor(color);
				if (!animate) cell.reveal();
			});
		}
		this.state.unsolvedCells = activatedCells.length;
		this.state.remainingMistakes = activatedCells.length / 2 - 1 + board.additionalMistakes;
		if (animate) {
			cellsCopy = [...this.state.cells];
			let delay = 200;
			while (cellsCopy.length > 0) {
				// const index = Math.floor(Math.random() * activatedCells.length);
				const index = 0;
				const cell = cellsCopy.splice(index, 1)[0];
				if (!activatedCells.includes(cell)) continue;
				cell.reveal();
				if (delay > 0) {
					await new Promise(resolve => setTimeout(resolve, delay));
					delay = Math.floor(delay * 0.9);
				}
			}
		}
	}

	deleteCells = async function(victory) {
		let cells;
		if (victory) {
			cells = [...this.state.solvedCells];
			cells.reverse();
		} else {
			cells = [...this.state.cells];
			cells.reverse();
			// shuffle(cells);
		}

		if (cells.length < 1) return;


		const numCells = cells.length;
		console.log(numCells);
		const delayStep = 1.2;
		// const totalDuration = numCells <= 8 ? 1500 : numCells <= 12 ? 2500 : 3500;
		const totalDuration = 1000;
		const initialDelay = totalDuration * (delayStep - 1) / (Math.pow(delayStep, numCells) - 1);
		let currentDelay = initialDelay;
		for (const cell of cells) {
			cell.fade();
			await new Promise(resolve => setTimeout(resolve, currentDelay));
			currentDelay *= delayStep;
		}
		await new Promise(resolve => setTimeout(resolve, 300));

		for (const cell of this.state.cells) cell.remove();
		this.state.cells.length = 0;
	}

	winGame = async function() {
		this.state.victory = true;
		this.state.coolDown = true;
		if (this.board.giveLife) this.addLife();

		this.trendSelector.addTrends(this.state.pendingTrends, true);

		this.state.totalAvoidableMistakes += this.state.avoidableMistakes;
		this.state.totalLevelsCompleted++;
		if (this.state.avoidableMistakes === 0) this.state.perfectLevels++;

		const prevWon  = this.state.score.won;
		const newScore = this.trendSelector.getScore();
		const justWon  = !prevWon && (newScore.num >= newScore.denominator);

		this.updateScore(newScore, true);

		if (justWon) {
			Graphics.winSplash(randomItem(Config.messages.end));
			this.faceChanger.resetFace(true, false);
		} else {
			this.faceChanger.resetFace(true, true);
		}

		this.state.level++;
		this.saveData('session', { board: null, level: this.state.level, lives: this.state.lives });

		await this.cellLoopScheduler.endScreen();

		if (justWon) {
			const stats = {
				trendsCollected:   newScore.num,
				levelsCompleted:   this.state.totalLevelsCompleted,
				perfectLevels:     this.state.perfectLevels,
				avoidableMistakes: this.state.totalAvoidableMistakes,
			};
			Graphics.showWinScreen(stats, () => {
				this.state.announceMilestone = false;
				this.newGame(true);
			});
		} else {
			this.state.awaitPlayer = true;
			const showDelay = Config.delay.showContinuePrompt;
			await new Promise(r => setTimeout(r, showDelay));
			if (this.state.awaitPlayer) {
				Graphics.showPrompt();
				const fadeDelay = Config.delay.changeCellLabel - showDelay;
				await new Promise(r => setTimeout(r, fadeDelay));
				Graphics.hidePrompt();
			}
		}
	}

	loseGame = async function() {
		this.state.victory = false;
		this.state.coolDown = true;
		this.removeLife();
		this.trendSelector.addTrends(this.state.pendingTrends, false);
		const gameOver = this.state.lives <= 0;
		this.saveData('session', {
			board: null,
			level: gameOver ? 0 : this.state.level,
			lives: gameOver ? Config.maxLives : this.state.lives,
		});
		if (!this.state.score.won) {
			const removeNum = gameOver ? Config.removeAmountWhenGameOver : Config.removeAmountWhenLose;
			if (removeNum > 0) {
				this.trendSelector.removeTrends(removeNum);
				await this.updateScore(this.trendSelector.getScore(), true);
			}
		}
		await new Promise(resolve => setTimeout(resolve, Config.delay.loseTransition));
		if (gameOver) this.restartGame();
		else this.newGame(false);
	}

	showPostGame = async function(text) {
		const typeSpeed = 90;
		Elements.splashContainer.classList.add('fade-in');
		const googleColors = ['var(--google-blue)', 'var(--google-red)', 'var(--google-green)', 'var(--google-yellow)'];
		shuffle(googleColors);
		await Graphics.typeTextColored(text, googleColors, typeSpeed, Elements.splashText);
		Elements.splashContainer.classList.remove('fade-in');
	}

	selectMessage = function(victory) {
		if (victory) {
			if (this.state.level <= 1) {
				const messages = Config.messages.intro;
				return this.challengeMode ? messages.challenge : messages.normal;
			}
			if (this.state.announceMilestone) return [`${this.state.score.num} trends collected!`];
			if (this.state.avoidableMistakes === 0) return Config.messages.perfect;
			if (this.state.remainingMistakes === 0) return Config.messages.nearmiss;
			return null;
		}
		if (this.state.level < this.state.previousLevel) return Config.messages.gameover;
		return Config.messages.failure;
	}

	selectBoard = function() {
		const board = this.state.level <= this.boards.length - 1
			? this.boards[this.state.level]
			: BoardCreator.createBoard(this.state.level, this.state.lives, this.challengeMode);
		if (board.cellCount < 4 || board.cellCount % 2 !== 0) {
			console.error('Please provide an even cell count greater than or equal to 4.');
			return;
		}
		return board;
	}

	newGame = async function(victory) {
		this.cellLoopScheduler.stop();
		let messageList;
		if (!this.state.firstRun) {
			messageList = this.selectMessage(!!victory || this.state.firstRun);
		}
		if (!(this.board && this.state.firstRun)) this.board = this.selectBoard();
		if (!this.board) return;
		const newCellCount = (this.board.cellCount !== this.state.cells.length) || this.state.firstRun;

		if (!this.state.firstRun) {
			Elements.grid.classList.remove('active');
			Elements.tooltip.classList.remove('active');
			Elements.tooltip.addEventListener('transitionend', () => {
				Graphics.resetToolTip(this, !!victory);
			}, { once: true });
		} else {
			Graphics.resetToolTip(this, this.state.firstRun);
		}

		await this.deleteCells(!!victory);

		if (messageList) await this.showPostGame(randomItem(messageList));

		if (newCellCount) await this.gridLayout.update(this.board.cellCount);
		this.state.refresh();

		this.createCells(this.board.cellCount);

		Elements.tooltip.classList.add('active');
		Elements.grid.classList.add('active');
		hideBackground(true);

		await this.activateCells(this.board, true);

		Elements.gameContainer.classList.add('shadow');

		this.state.coolDown = false;
		this.state.firstRun = false;
		this.state.previousLevel = this.state.level;
		this.saveData('session', {
			board: this.board,
			level: this.state.level,
			lives: this.state.lives,
		});
	}

	destroy = function() {
		Elements.grid.classList.remove('active');
		hideBackground(false);
		Elements.tooltip.classList.remove('active');
		window.removeEventListener('resize', this._resizeHandler);
		Elements.grid.removeEventListener('click', this._gridClickHandler);
		Elements.faceContainer.removeEventListener('click', this._faceClickHandler);
		if (this._devKeyHandler) window.removeEventListener('keydown', this._devKeyHandler);
		this.cellLoopScheduler.stop();
		Graphics.hidePrompt();
		for (const cell of this.state.cells) cell.remove();
		this.state.cells.length = 0;
		this.state.coolDown = true;
		this._teardownDOM();
	}

	restartGame = function() {
		this.state.reset();
		this.newGame(false);
	}

	updateScore = async function(score, animate) {
		const prev = { num: this.state.score.num, denominator: this.state.score.denominator };
		this.state.score.num = score.num;
		this.state.score.denominator = score.denominator;

		if (this.state.score.num >= this.state.score.denominator) {
			this.state.score.won = true;
		}
		if (animate) {
			await this.percentScorer.interpolateScore(prev, this.state.score);
			let crossed = false;
			if (this.state.score.won) {
				crossed = prev.num < this.state.score.num;
			} else {
				crossed = Config.milestones.find(m => prev.num < m && this.state.score.num >= m);
			}
			this.state.announceMilestone = crossed;
		}
		this.saveData('score', this.state.score);
	}

	saveData = function(property, data) {
		if (!this.saveProgress) return;
		const dateEntry = JSON.parse(localStorage.getItem(this.gameDate) || '{}');
		const modeKey = this.challengeMode ? 'challenge' : 'normal';
		if (!dateEntry[modeKey]) dateEntry[modeKey] = {};
		dateEntry[modeKey][property] = data;
		localStorage.setItem(this.gameDate, JSON.stringify(dateEntry));
	}

	addLife = function() {
		this.state.lives = Math.min(this.state.lives + 1, Config.maxLives);
	}

	removeLife = function() {
		this.state.lives = Math.max(this.state.lives - 1, 0);
	}

	// Handles all card-click events. Moved here from the standalone handleClick module
	// so that all state transitions stay within the Game class.
	onCellClick = async function() {
		if (this.state.awaitPlayer) {
			this.state.awaitPlayer = false;
			Graphics.hidePrompt();
			this.newGame(this.state.victory);
			return;
		}
		if (this.state.revealedCells.length > 1) {
			const [cell1, cell2] = this.state.revealedCells;
			if (!cell1.usedTrend) this.state.pendingTrends.add(cell1.getName());
			if (!cell2.usedTrend) this.state.pendingTrends.add(cell2.getName());
			this.state.revealedCells.length = 0;

			if (cell1.getName() === cell2.getName()) {
				cell1.solve();
				cell2.solve();
				this.cellLoopScheduler.newLoop(cell1, cell2);
				this.state.unsolvedCells -= 2;
				this.state.solvedCells.push(cell1, cell2);
				soundEffects.match();
				if (this.state.unsolvedCells <= 0) this.winGame();
			} else {
				this.state.remainingMistakes--;

				const promises = [];
				if (this.state.viewedCells.includes(cell1) || this.state.viewedCells.includes(cell2)) {
					this.state.avoidableMistakes++;
				} else {
					const word1 = cell1.getName();
					for (const cell of this.state.viewedCells) {
						if (cell.getName() === word1) {
							this.state.avoidableMistakes++;
							break;
						}
					}
				}

				if (this.state.avoidableMistakes > 0) this.faceChanger.changeFace();

				if (this.state.remainingMistakes < 0) {
					this.loseGame();
					return;
				}
				this.state.cellsFading = true;
				promises.push(
					new Promise(resolve => setTimeout(resolve, Config.delay.fade)),
					waitForFlag(() => this.state.cellsFading, false)
				);
				await Promise.race(promises);
				this.state.cellsFading = false;
				cell1.hide();
				cell2.hide();
			}

			for (const cell of [cell1, cell2]) {
				if (!this.state.viewedCells.includes(cell)) this.state.viewedCells.push(cell);
			}
		}
	}
}
