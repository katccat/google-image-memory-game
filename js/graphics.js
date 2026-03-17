import { Config } from "./config.js";
import { getLines } from "./utils.js";

export const Elements = {
	grid: document.getElementById('grid'),
	gridContainer: document.getElementById('grid-container'),
	tooltip: document.getElementById('tooltip'),
	levelDisplay: document.getElementById('level-counter'),
	splashText: document.getElementById('splash-text'),
	splashContainer: document.getElementById('splash-container'),
	faceDisplay: document.getElementById('face'),
	lives: [
		{ // life 1 index 0
			animated: document.getElementById('life1-gif'),
			static: document.getElementById('life1-static'),
			dead: document.getElementById('life1-dead'),
		},
		{ // life 2 index 1
			animated: document.getElementById('life2-gif'),
			static: document.getElementById('life2-static'),
			dead: document.getElementById('life2-dead'),
		},
		{ // life 3 index 2
			animated: document.getElementById('life3-gif'),
			static: document.getElementById('life3-static'),
			dead: document.getElementById('life3-dead'),
		},
	],
}
export class Graphics {};

Graphics.faceChanger = function(game) {
	this.game = game;
	const faceImages = {
		mistake1: [
			'images/faces/2.png',
			'images/faces/3a.png',
			'images/faces/4a.png',
		],
		mistake2: [
			'images/faces/3b.png',
			'images/faces/4b.png',
			'images/faces/5b2.gif',
		],
		length: 3,
		default: 'images/faces/1.png',
		died1: 'images/faces/7b.png',
		died2: 'images/faces/7b.png',
		diedImmediately: 'images/faces/7a.png',
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
		let index = Math.min(Math.round(
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
		else if (victory && game.state.level >= Config.difficulty.medium) {
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
Graphics.lifeDisplay = {
	lifeElements: Elements.lives,
	getIndex(life) {
		const index = Math.max(Math.min(life - 1, this.lifeElements.length - 1), 0);
		return index;
	},
	show(element) {
		element.classList.remove('fade-out');
	},
	hide(element) {
		element.classList.add('fade-out');
	},
	animateLife(life) {
		const index = this.getIndex(life);

		this.show(this.lifeElements[index].animated);
		this.hide(this.lifeElements[index].static);
		this.hide(this.lifeElements[index].dead);
	},
	staticLife(life) {
		const index = this.getIndex(life);

		this.hide(this.lifeElements[index].animated);
		this.show(this.lifeElements[index].static);
		this.hide(this.lifeElements[index].dead);
	},
	removeLife(life) {
		const index = this.getIndex(life);

		this.hide(this.lifeElements[index].animated);
		this.hide(this.lifeElements[index].static);
		this.show(this.lifeElements[index].dead);
	},
	addLife(life) {
		const index = this.getIndex(life);

		this.animateLife(life);
		if (index > 0) this.staticLife(life - 1);
	},
	stageLives(lives) {
		this.lifeElements.forEach((_, i) => {
			const life = i + 1;
			if (life < lives) this.staticLife(life);
			else if (life === lives) this.animateLife(life);
			else this.removeLife(life);
		});
	},
}
Graphics.resetToolTip = function(game, victory) {
	Elements.levelDisplay.innerText = `Level ${game.state.level}`;
	this.lifeDisplay.stageLives(game.state.lives);
	game.faceChanger.resetFace(victory);
}
Graphics.colorSequencer = function(sequence) {
	const colorSequence = sequence;
	
	let index = Math.floor(Math.random() * colorSequence.length);
	this.nextColor = function() {
		let color = colorSequence[index];
		index = (index + 1) % colorSequence.length;
		return color;
	}
}
Graphics.typeText = async function(text, ...elements) {
	const delayMs = 150;
	elements.forEach(element => element.innerHTML = '');
	for (let i = 0; i < text.length; i++) {
		for (const char of text[i]) {
			elements.forEach(element => element.innerHTML += char);
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
		if (i < text.length - 1) elements.forEach(element => element.innerHTML += '<br>');
	}
}
Graphics.deleteText = async function(...elements) {
	const delayMs = 30;
	while (elements[0].innerHTML.length > 0) {
		elements.forEach(element => {
			const html = element.innerHTML;
			// if the last characters are a tag e.g. <br>, strip the whole tag
			if (html.endsWith('>')) {
				element.innerHTML = html.replace(/<[^>]+>$/, '');
			} else {
				element.innerHTML = html.slice(0, -1);
			}
		});
		await new Promise(resolve => setTimeout(resolve, delayMs));
	}
}