import { Config } from './config.js';
import { randomItem } from './utils.js';

export class Board {
	static textMode = {
		showText: 'showText',
		hideText: 'hideText',
		splashText: 'splashText',
	};
	constructor(cellCount, images, additionalMistakes = 0) {
		this.cellCount = cellCount;
		this.images = images;
		this.additionalMistakes = additionalMistakes;
		this.giveLife = false;
		this.textMode = Board.textMode.showText;
		this.funColorChance = Config.funColorChance;
	}
}

export class BoardCreator {
	static specialBoardChance = 0.3;
	static cellCounts = {
		easy: [16, 20],
		normal: [24, 28],
		hard: [30, 32, 36],
	};
	static levels = Config.difficulty;
	static giveLifeThreshold = 24;
	static previous = { level: null, board: null };
	static createBoard(level) {
		if (BoardCreator.previous.level == level) return BoardCreator.previous.board;

		let cellCount, doSpecialCategory, category, textMode;
		{
			const cellCounts = BoardCreator.cellCounts.easy;
			if (level >= BoardCreator.levels.normal) {
				cellCounts.push(...BoardCreator.cellCounts.normal);
				if (level >= BoardCreator.levels.hard) {
					cellCounts.push(...BoardCreator.cellCounts.hard);
				}
			}
			cellCount = randomItem(cellCounts);
		}

		doSpecialCategory = Math.random() < BoardCreator.specialBoardChance;

		if (doSpecialCategory) {
			let categoryKey = randomItem(Object.keys(Config.category.special));
			category = Config.category.special[categoryKey];
			textMode = Board.textMode.splashText;
		}
		else {
			category = Config.category.all;
			textMode = Board.textMode.showText;
		}
		const board = new Board(cellCount, category);
		board.textMode = textMode;

		if (level < BoardCreator.levels.normal || (level < BoardCreator.levels.hard && doSpecialCategory)) {
			if (cellCount < 16) board.additionalMistakes = 1;
			else board.additionalMistakes = 2;
		}
		else if (level >= BoardCreator.levels.hard) {
			board.additionalMistakes = -1;
		}
		if (cellCount >= BoardCreator.giveLifeThreshold || doSpecialCategory) {
			board.giveLife = true;
		}
		if (level >= BoardCreator.levels.normal) {
			board.funColorChance = Math.min(1, (Config.funColorChance + (0.05 * (level - BoardCreator.levels.normal))));
		}
		BoardCreator.previous.board = board;
		BoardCreator.previous.level = level;
		return board;
	}
}