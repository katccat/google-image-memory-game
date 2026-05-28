import { Config } from './config.js';
import { percentScoreFloat, percentScoreString, randomItem } from './utils.js';
import { soundEffects } from './soundEffects.js';

export const Elements = {
	// Shared chrome — always present in index.html, usable by any game mode.
	splashContainer:   document.getElementById('splash-container'),
	splashText:        document.getElementById('splash-text'),
	winSplashA:        document.getElementById('win-splash-a'),
	winSplashB:        document.getElementById('win-splash-b'),
	winScreen:         document.getElementById('win-screen'),
	winScreenHeadline: document.getElementById('win-screen-headline'),
	winStatTrends:     document.getElementById('win-stat-trends'),
	winStatLevels:     document.getElementById('win-stat-levels'),
	winStatPerfect:    document.getElementById('win-stat-perfect'),
	// Memory-match game elements — null until Game._build(), cleared by Game._teardownDOM().
	gameContainer:  null,
	grid:           null,
	tooltip:        null,
	title:          null,
	levelDisplay:   null,
	scoreDisplay:   null,
	messageText:    null,
	splashImage:    null,
	faceDisplay:    null,
	faceOverlay:    null,
	continuePrompt: null,
};

export class FaceChanger {
	static #FACES = {
		firstTrack: [
			{ src: 'images/faces/2.png' },
			{ src: 'images/faces/3a.png' },
			{ src: 'images/faces/scarf.png' },
		],
		countDown: {
			length: 3,
			threshold: 1,
			strike1: [
				{ src: 'images/faces/4a.gif' },
				{ src: 'images/faces/5a.gif' },
				{ src: 'images/faces/7a.png' },
			],
			strike2: [
				{ src: 'images/faces/4b.gif' },
				{ src: 'images/faces/5b.gif' },
				{ src: 'images/faces/7b.png' },
			],
		},
		default: { src: 'images/faces/1.png', threshold: 0 },
		special: [
			{ src: 'images/faces/trophy_resized.gif', fx: 'images/faces/break.gif', threshold: 100 },
			{ src: 'images/faces/special4.gif',       fx: 'images/faces/break.gif', threshold: 90  },
			{ src: 'images/faces/special3.gif',       fx: 'images/faces/break.gif', threshold: 75  },
			{ src: 'images/faces/special2.png',       fx: 'images/faces/break.gif', threshold: 50  },
			{ src: 'images/faces/special1.png',                                     threshold: 25  },
		],
	};

	#game;
	#dead = false;
	#countedMistakes = 0;
	#currentFace = FaceChanger.#FACES.default;
	#lastScore = 0;

	constructor(game) {
		this.#game = game;
	}

	changeFace() {
		if (this.#dead) return;
		const faces = FaceChanger.#FACES;
		const remaining = this.#game.state.remainingMistakes;
		const avoidable = this.#game.state.avoidableMistakes;

		if (this.#currentFace?.fx) Elements.faceOverlay.src = FaceChanger.#cacheBust(this.#currentFace.fx);

		if (remaining <= faces.countDown.threshold) {
			const sequence = avoidable > 1 ? faces.countDown.strike2 : faces.countDown.strike1;
			const index = Math.max(Math.min(faces.countDown.threshold - remaining, sequence.length - 1), 0);
			this.#currentFace = sequence[index];
			Graphics.flashImage(this.#currentFace.src);
		} else if (avoidable > 0) {
			this.#countedMistakes++;
			const index = Math.max(Math.min(this.#countedMistakes - 1, faces.firstTrack.length - 1), 0);
			this.#currentFace = faces.firstTrack[index];
		}

		Elements.faceDisplay.src = this.#currentFace.src;
		if (remaining < 0) {
			this.#dead = true;
			soundEffects.bells();
		} else if (remaining === 0) {
			soundEffects.chatter();
		}
	}

	resetFace(victory = false, animate = false) {
		const faces = FaceChanger.#FACES;
		const score = percentScoreFloat(this.#game.state.score);
		let specialFace;
		let thresholdCrossed = 0;
		if (victory) {
			for (const tier of faces.special) {
				if (score >= tier.threshold) {
					specialFace = tier;
					thresholdCrossed = tier.threshold;
					break;
				}
			}
		}
		if (specialFace) {
			if (thresholdCrossed > this.#lastScore) {
				soundEffects.whistle();
				if (animate) Graphics.flashImage(specialFace.src);
			}
			this.#currentFace = specialFace;
		} else {
			this.#currentFace = faces.default;
		}
		Elements.faceDisplay.src = this.#currentFace.src;
		this.#countedMistakes = 0;
		this.#dead = false;
		this.#lastScore = score;
	}

	static #cacheBust(src) {
		return src + '?t=' + Date.now();
	}
}

export class PercentScorer {
	#scoreDisplay = Elements.scoreDisplay;
	#scoreBar = document.getElementById('score-bar');
	#scoreBarFill = document.getElementById('score-bar-fill');
	#intervalId = null;

	#display(formattedScore) {
		this.#scoreDisplay.classList.add('visible');
		this.#scoreBar.classList.add('visible');
		this.#scoreDisplay.textContent = formattedScore + '%';
	}

	// Set bar fill height once; CSS transition handles the animation.
	// Pass animate=false to skip the transition (e.g. on instant resets).
	#setBarHeight(percent, animate) {
		const clamped = Math.min(Math.max(percent, 0), 100);
		// Barber-pole speed: linear from 8s at 0% to 0.6s at 100%.
		const duration = 10 - (clamped / 100) * 6;
		this.#scoreBarFill.style.animationDuration = duration.toFixed(2) + 's';
		if (!animate) {
			this.#scoreBarFill.style.transition = 'none';
			this.#scoreBarFill.style.height = clamped + '%';
			this.#scoreBarFill.offsetHeight; // flush layout so transition:none takes effect
			this.#scoreBarFill.style.transition = '';
		} else {
			// Always grow from the bottom: snap to 0, then transition up.
			this.#scoreBarFill.style.transition = 'none';
			this.#scoreBarFill.style.height = '0%';
			this.#scoreBarFill.offsetHeight; // commit the 0% before re-enabling transition
			this.#scoreBarFill.style.transition = '';
			this.#scoreBarFill.style.height = clamped + '%';
		}
	}

	async interpolateScore(oldScore, newScore) {
		const displayStart = percentScoreFloat(oldScore);
		const displayEnd = percentScoreFloat(newScore);
		if (displayStart === displayEnd) {
			this.#scoreDisplay.classList.add('enlarge');
			setTimeout(() => this.#scoreDisplay.classList.remove('enlarge'), 1500);
			return;
		}
		this.#setBarHeight(Math.abs(displayEnd), true);
		if (displayEnd < displayStart) this.#scoreDisplay.classList.add('debit');
		this.#scoreDisplay.classList.add('enlarge');
		if (this.#intervalId) clearInterval(this.#intervalId);

		return new Promise(resolve => {
			let current = displayStart;
			const step = displayEnd > current ? 0.1 : -0.1;
			this.#intervalId = setInterval(() => {
				current += step;
				soundEffects.scoreTick();
				this.#display(Math.abs(current).toFixed(Config.scoreRounding));
				const done = step > 0
					? parseFloat(current.toFixed(Config.scoreRounding)) >= displayEnd
					: parseFloat(current.toFixed(Config.scoreRounding)) <= displayEnd;
				if (done) {
					soundEffects.scoreTickEnd();
					clearInterval(this.#intervalId);
					this.#intervalId = null;
					this.#scoreDisplay.classList.remove('enlarge', 'debit');
					resolve();
				}
			}, 80);
		});
	}

	updateScore(score) {
		if (this.#intervalId) clearInterval(this.#intervalId);
		this.#intervalId = null;
		this.#scoreDisplay.classList.remove('enlarge');
		this.#setBarHeight(percentScoreFloat(score), false);
		this.#display(percentScoreString(score));
	}
}

export class ColorSequencer {
	#colors;
	#index;

	constructor(sequence) {
		this.#colors = sequence;
		this.#index = Math.floor(Math.random() * sequence.length);
	}

	nextColor() {
		const color = this.#colors[this.#index];
		this.#index = (this.#index + 1) % this.#colors.length;
		return color;
	}
}

export class Graphics {
	static async splashText(text) {
		Elements.splashContainer.classList.add('fade-in');
		await Graphics.typeText(text, 90, true, Elements.splashText);
		Elements.splashContainer.classList.remove('fade-in');
	}

	static async flashMessage(text) {
		Elements.messageText.textContent = text;
		const animation = Config.animation.splash2;
		return Elements.messageText.animate(animation.keyframes, animation.options).finished;
	}

	static async flashImage(src) {
		const image = Elements.splashImage;
		image.src = src;
		const animation = Config.animation.splash2;
		return image.animate(animation.keyframes, animation.options).finished;
	}

	static resetToolTip(game, victory) {
		Elements.levelDisplay.textContent = `Level ${game.state.level}`;
		game.percentScorer.updateScore(game.state.score);
		game.faceChanger.resetFace(victory);
	}

	static async typeTextColored(text, colors, delayMs, ...elements) {
		const words = text.split(' ');
		elements.forEach(element => {
			element.innerHTML = '';
			words.forEach((word, wi) => {
				if (wi > 0) element.appendChild(document.createTextNode(' '));
				const wordSpan = document.createElement('span');
				wordSpan.style.color = colors[wi % colors.length];
				for (const char of word) {
					const charSpan = document.createElement('span');
					charSpan.textContent = char;
					charSpan.style.opacity = '0';
					charSpan.style.transition = 'opacity 0.15s linear';
					wordSpan.appendChild(charSpan);
				}
				element.appendChild(wordSpan);
			});
		});

		const charSpanSets = elements.map(el => [...el.querySelectorAll('span > span')]);
		const len = Math.max(...charSpanSets.map(s => s.length));
		for (let i = 0; i < len; i++) {
			requestAnimationFrame(() => {
				charSpanSets.forEach(spans => { if (spans[i]) spans[i].style.opacity = '1'; });
			});
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}

	static async typeText(text, delayMs, audio, ...elements) {
		elements.forEach(element => {
			element.innerHTML = '';
			for (const char of text) {
				const span = document.createElement('span');
				span.textContent = char;
				span.style.opacity = '0';
				span.style.transition = 'opacity 0.15s linear';
				element.appendChild(span);
			}
		});

		const spanSets = elements.map(el => [...el.querySelectorAll('span')]);
		for (let i = 0; i < text.length; i++) {
			const index = i;
			requestAnimationFrame(() => {
				spanSets.forEach(spans => spans[index].style.opacity = '1');
			});
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}

	static async deleteText(delayMs, ...elements) {
		const spanSets = elements.map(el => [...el.querySelectorAll('span')]);
		const maxLen = Math.max(...spanSets.map(s => s.length));
		for (let i = maxLen - 1; i >= 0; i--) {
			const index = i;
			requestAnimationFrame(() => {
				spanSets.forEach(spans => { if (spans[index]) spans[index].style.opacity = '0'; });
			});
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
		elements.forEach(element => { element.innerHTML = ''; });
	}

	static async winSplash(text) {
		const layerA = Elements.winSplashA;
		const layerB = Elements.winSplashB;

		layerA.getAnimations().forEach(a => a.cancel());
		layerB.getAnimations().forEach(a => a.cancel());

		layerA.textContent = text;
		layerB.textContent = text;

		const duration = 1600;
		const easing = 'ease-out';

		const animA = layerA.animate([
			{ transform: 'translate(-50%, -50%) scale(1)',   opacity: 1, offset: 0    },
			{ transform: 'translate(-50%, -50%) scale(1)',   opacity: 1, offset: 0.28 },
			{ transform: 'translate(-50%, -50%) scale(2.8)', opacity: 0, offset: 1    },
		], { duration, easing, fill: 'forwards' });

		const animB = layerB.animate([
			{ transform: 'translate(-50%, -50%) scale(1)',   opacity: 1, offset: 0    },
			{ transform: 'translate(-50%, -50%) scale(1)',   opacity: 1, offset: 0.28 },
			{ transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0, offset: 1    },
		], { duration, easing, fill: 'forwards' });

		try {
			await Promise.all([animA.finished, animB.finished]);
		} catch {
			// A subsequent call cancelled these animations
			return;
		}
		animA.cancel();
		animB.cancel();
		layerA.textContent = '';
		layerB.textContent = '';
	}

	static showPrompt() {
		Elements.continuePrompt.classList.add('fade-in');
	}

	static hidePrompt() {
		Elements.continuePrompt.classList.remove('fade-in');
	}

	/**
	 * Shows the full-screen 100%-win panel.
	 * Star rating: 3★ = 0 avoidable mistakes, 2★ = 1–5, 1★ = 6+
	 */
	static async showWinScreen(stats, onDismiss) {
		const { trendsCollected, levelsCompleted, perfectLevels, avoidableMistakes } = stats;
		const stars = avoidableMistakes === 0 ? 3 : avoidableMistakes <= 5 ? 2 : 1;

		Elements.winStatTrends.textContent  = trendsCollected;
		Elements.winStatLevels.textContent  = levelsCompleted;
		Elements.winStatPerfect.textContent = perfectLevels;

		const starEls = Elements.winScreen.querySelectorAll('.win-star');
		starEls.forEach((star, i) => {
			star.className = 'win-star';
			if (i < stars) star.classList.add('earned');
		});

		const statsEl  = document.getElementById('win-screen-stats');
		const promptEl = document.getElementById('win-screen-prompt');
		statsEl.classList.remove('visible');
		promptEl.classList.remove('visible', 'pulsing');
		Elements.winScreenHeadline.innerHTML = '';

		Elements.winScreen.classList.add('active');
		await new Promise(r => setTimeout(r, 280));

		const googleColors = ['var(--google-blue)', 'var(--google-red)', 'var(--google-yellow)', 'var(--google-green)'];
		const offset = Math.floor(Math.random() * googleColors.length);
		const rotated = [...googleColors.slice(offset), ...googleColors.slice(0, offset)];
		await Graphics.typeTextColored(randomItem(Config.messages.end), rotated, 72, Elements.winScreenHeadline);

		await new Promise(r => setTimeout(r, 160));

		for (let i = 0; i < starEls.length; i++) {
			starEls[i].classList.add('popped');
			if (i < stars) soundEffects.match();
			await new Promise(r => setTimeout(r, 240));
		}
		if (stars === 3) {
			await new Promise(r => setTimeout(r, 80));
			soundEffects.whistle();
		}

		await new Promise(r => setTimeout(r, 180));
		statsEl.classList.add('visible');

		await new Promise(r => setTimeout(r, 480));
		promptEl.classList.add('pulsing');

		Elements.winScreen.addEventListener('click', function handler() {
			Elements.winScreen.removeEventListener('click', handler);
			promptEl.classList.remove('pulsing');
			Elements.winScreen.classList.remove('active');
			if (onDismiss) setTimeout(onDismiss, 310);
		}, { once: true });
	}
}
