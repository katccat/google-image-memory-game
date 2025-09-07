import { Config } from "./config.js";

export const Elements = {
	grid: document.getElementById('grid'),
	gridContainer: document.getElementById('grid-container'),
	tooltip: document.getElementById('tooltip'),
	levelDisplay: document.getElementById('level-counter'),
	splashText: document.getElementById('splash-text'),
	splashContainer: document.getElementById('splash-container'),
	faceDisplay: document.getElementById('face'),
	life1: document.getElementById('life1'),
	life2: document.getElementById('life2'),
	life3: document.getElementById('life3'),
}
export class Graphics {};

Graphics.faceChanger = function(game) {
	this.game = game;
	const faceImages = {
		mistake1: [
			'images/faces/2.png',
			'images/faces/3a.png',
			'images/faces/4a.png',
			'images/faces/5a.png',
		],
		mistake2: [
			'images/faces/2.png',
			'images/faces/3b.png',
			'images/faces/4b.png',
			'images/faces/5b.png',
		],
		length: 4,
		default: 'images/faces/1.png',
		died1: 'images/faces/7a.png',
		died2: 'images/faces/7b.png',
		diedImmediately: 'images/faces/7c.png',
		special: 'images/faces/sophisticated.png',
		special2: 'images/faces/sophisticated2.png',
	};

	let maxMistakes;
	let doSequence2 = false;
	let dead = false;
	const faceDisplay = Elements.faceDisplay;

	this.setMaxMistakes = function (mistakes) {
		maxMistakes = mistakes;
	}
	this.changeFace = function () {
		if (dead) return;
		if (this.game.state.remainingMistakes <= 0) {
			if (this.game.state.avoidableMistakesMade == 1) {
				faceDisplay.src = faceImages.diedImmediately;
			}
			else if (!doSequence2) {
				faceDisplay.src = faceImages.died1;
			}
			else {
				faceDisplay.src = faceImages.died2;
			}
			dead = true;
			return;
		}

		let progress = maxMistakes - Math.max(this.game.state.remainingMistakes, 0);
		let index = Math.min(Math.floor(
			(progress / maxMistakes) * (faceImages.length - 1)
		), faceImages.length - 1);

		if (this.game.state.avoidableMistakesMade > 1 && !(faceDisplay.src == faceImages.default || faceDisplay.src == faceImages.special || faceDisplay.src == faceImages.special2)) {
			doSequence2 = true;
		}
		if (doSequence2) faceDisplay.src = faceImages.mistake2[index];
		else faceDisplay.src = faceImages.mistake1[index];
	}
	this.resetFace = function (victory = false) {
		if (victory && game.state.level >= Config.difficulty.hard) {
			faceDisplay.src = faceImages.special2;
		}
		else if (victory && game.state.level >= Config.difficulty.normal) {
			faceDisplay.src = faceImages.special;
		}
		else {
			faceDisplay.src = faceImages.default;
		}
		doSequence2 = false;
		dead = false;
	}
}
Graphics.splashTextHandler = function() {
	Elements.splashContainer.classList.remove("expand");
};
Graphics.splashText = async function(text) {
	const splashText = Elements.splashText;
	const splashContainer = Elements.splashContainer;
	splashContainer.removeEventListener('transitionend', Graphics.splashTextHandler, { once: true });
	splashContainer.classList.toggle("notransition", true);
	splashContainer.classList.remove("expand");
	void splashContainer.offsetWidth;
	splashText.textContent = text;
	splashContainer.classList.toggle("expand", true);
	splashContainer.classList.toggle("notransition", false);
	return new Promise(resolve => {
		const handler = () => {
			splashContainer.classList.remove("expand");
			resolve(); // <-- now awaited properly
		};
		splashContainer.addEventListener('transitionend', handler, { once: true });
	});
};
Graphics.splashTextInstant = function(text) {
	const splashText = Elements.splashText;
	const splashContainer = Elements.splashContainer;
	splashContainer.removeEventListener('transitionend', Graphics.splashTextHandler, { once: true });
	splashContainer.classList.toggle("notransition", true);
	splashContainer.classList.remove("expand");
	void splashContainer.offsetWidth;
	splashText.textContent = text;
	splashContainer.classList.toggle("expand", true);
	splashContainer.classList.toggle("notransition", false);
	splashContainer.addEventListener('transitionend', Graphics.splashTextHandler, { once: true });
};
Graphics.updateLives = function(lives) {
	const life3 = Elements.life3;
	const life2 = Elements.life2;
	const life1 = Elements.life1;
	if (lives >= 3) {
		life3.classList.toggle('invisible', false);
		life2.classList.toggle('invisible', false);
		life1.classList.toggle('invisible', false);
	}
	else if (lives == 2) {
		life3.classList.toggle('invisible', false);
		life2.classList.toggle('invisible', false);
		life1.classList.toggle('invisible', true);
	}
	else if (lives == 1) {
		life3.classList.toggle('invisible', false);
		life2.classList.toggle('invisible', true);
		life1.classList.toggle('invisible', true);
	}
	else {
		life3.classList.toggle('invisible', true);
		life2.classList.toggle('invisible', true);
		life1.classList.toggle('invisible', true);
	}
}
Graphics.resetToolTip = function(game, victory) {
	Elements.levelDisplay.innerText = `Level ${game.state.level}`;
	this.updateLives(game.state.lives);
	game.faceChanger.resetFace(victory);
}