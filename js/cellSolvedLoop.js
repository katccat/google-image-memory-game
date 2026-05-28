import { Config } from './config.js';
import { fitFontSize } from './utils.js';
import { Graphics } from './graphics.js';
import { Elements } from './graphics.js';

export class CellLoopScheduler {
	#cellLoops = [];
	#loopIndex = 0;
	#playing = false;

	newLoop(...cells) {
		const loop = new CellSolvedLoop(...cells);
		loop.start();
		this.#cellLoops.splice(this.#loopIndex, 0, loop);
		if (!this.#playing && Config.slideImages && this.#cellLoops.some(l => l.imageSlideAvailable)) {
			this.#startSlideLoop();
		}
	}

	#startSlideLoop() {
		this.#playing = true;
		(async () => {
			const delay = Config.delay.changeCellImage;
			let success = true;
			while (this.#playing) {
				if (success) {
					const randomDelay = Math.random() * 2000;
					await new Promise(r => setTimeout(r, delay + randomDelay));
				}
				if (!this.#playing) break;
				this.#loopIndex = this.#loopIndex % this.#cellLoops.length;
				success = await this.#cellLoops[this.#loopIndex].slideImages();
				this.#loopIndex++;
			}
		})();
	}

	stop() {
		this.#playing = false;
		this.#cellLoops.length = 0;
		Elements.grid.classList.remove('show-views');
	}

	async endScreen() {
		this.#playing = true;
		await Promise.all(this.#cellLoops.map(loop => loop.typingDone));
		this.#cellLoops.forEach(loop => loop.setBespoke());
		Elements.grid.classList.add('show-views');
		(async () => {
			const delay = Config.delay.changeCellLabel;
			while (this.#playing) {
				await new Promise(r => setTimeout(r, delay));
				if (!this.#playing) break;
				Elements.grid.classList.remove('show-views');
				await new Promise(r => setTimeout(r, delay));
				if (!this.#playing) break;
				Elements.grid.classList.add('show-views');
			}
		})();
	}
}

export class CellSolvedLoop {
	constructor(...cells) {
		let backgroundResolver, typingResolver;
		this.backgroundVisible = new Promise(r => backgroundResolver = r);
		this.typingDone = new Promise(r => typingResolver = r);
		this.imageSlideAvailable = cells[0].imageSlideAvailable;

		const labelElements = cells.map(cell => cell.elements.label);
		const text = cells[0].getDisplayName();
		const testElement = cells[0].createLabelBuffer();
		const fontSize = fitFontSize(testElement, text, labelElements[0].offsetHeight);
		cells[0].destroyLabelBuffer();
		labelElements.forEach(e => e.style.fontSize = fontSize);

		this.setBespoke = () => cells.forEach(cell => { if (cell.special) cell.setBespoke(); });

		this.slideImages = async () => {
			if (!Config.slideImages || !this.imageSlideAvailable) return false;
			await this.backgroundVisible;
			await this.typingDone;
			cells.forEach(cell => cell.slideImages());
			return true;
		};

		this.start = async () => {
			Promise.all(cells.map(cell => cell.showBackground())).then(() => backgroundResolver());
			await new Promise(r => setTimeout(r, 500));
			await Graphics.typeText(text, 90, false, ...labelElements);
			await new Promise(r => setTimeout(r, Config.delay.resolveTyping));
			typingResolver();
		};
	}
}
