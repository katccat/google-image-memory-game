import { Config } from './config.js';
import { randomItem } from './utils.js';
import { isPhone } from './utils.js';

export class Board {
	constructor(cellCount, images, additionalMistakes = 0) {
		this.cellCount = cellCount;
		this.images = images;
		this.additionalMistakes = additionalMistakes;
		this.giveLife = false;
		this.funColorChance = Config.funColorChance;
		this.allowRecycleWords = false;
	}
}

export class BoardCreator {
	static specialBoardChance = 0;
	static cellCounts = {
		normal: {
			easy: [8, 12, 18],
			medium: [20, 24],
			hard: [30, 36],
		},
		phone: {
			easy: [8, 12, 12],
			medium: [18, 20],
			hard: [24],
		}
	};
	static levels = Config.difficulty;
	static giveLifeThreshold = 12;
	static previous = { level: null, board: null };
	static createBoard(level) {
		let cellCount, doSpecialCategory, category, allowRecycleWords;

		{
			const availableCellCounts = isPhone() ? BoardCreator.cellCounts.phone : BoardCreator.cellCounts.normal;
			const cellCounts = availableCellCounts.easy;
			if (level >= BoardCreator.levels.medium) {
				cellCounts.push(...availableCellCounts.medium);
				if (level >= BoardCreator.levels.hard) {
					cellCounts.push(...availableCellCounts.hard);
				}
			}
			cellCount = randomItem(cellCounts);
		}

		doSpecialCategory = Math.random() < BoardCreator.specialBoardChance;

		if (doSpecialCategory) {
			let categoryKey = randomItem(Object.keys(Config.category.special));
			category = Config.category.special[categoryKey];
			allowRecycleWords = true;
		}
		else {
			category = Config.category.all;
			allowRecycleWords = false;
		}
		const board = new Board(cellCount, category);
		board.allowRecycleWords = allowRecycleWords;

		if (cellCount > 16) {
			if (level < BoardCreator.levels.hard) board.additionalMistakes = 2;
			else board.additionalMistakes = 1;
		}
		else if (level < BoardCreator.levels.normal) board.additionalMistakes = 1;

		if (cellCount >= BoardCreator.giveLifeThreshold || doSpecialCategory) {
			board.giveLife = true;
		}
		BoardCreator.previous.board = board;
		BoardCreator.previous.level = level;
		return board;
	}
}