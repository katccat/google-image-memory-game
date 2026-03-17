export const Config = {
	fadeDelay: 700,
	category: { 
		special: {} 
	},
	funColorChance: 0,
	funGlyphChance: 0.1,
	maxLives: 3,
	colors: [
		'#ed6a5e', // red
		'#86b2f9', // blue
		'#ffd65a', // yellow
		'#76d590', // green
	],
	darkColors: [
		'#4285F4B3',
		'#EA4335B3',
		'#FBBC05B3',
		'#34A853B3',
		/*'#00000066',*/
	],
	messages: {
		intro: ["I'm feeling lucky"],
		victory: ["I'm not a robot", "reCAPTCHA'd", "Great!"],
		perfect: ['Perfect!', "I'm feeling lucky"],
		nearmiss: ["Phew!", "Close!"],
		failure: ["Aw, snap!", "That's an error.", "Please try again", "Only human!"],
		gameover: ["Game over!"],
	},
	glyphs: [
		"images/download_arrow.png",
		"images/mandarin.png",
		"images/puzzle.png",
		"images/share.png",
		"images/office.png",
		"images/cog.png",
		"images/search.png",
		"images/contact.png",
	],
	introMessage: [
		"I'm",
		"not",
		"a",
		"robot",
	],
	difficulty: {
		easy: 0,
		medium: 8,
		hard: 14,
	},
	boardAnimationID: {
		fade: 'fade',
		buffering: 'buffering',
	},
	animation: {
		shake: {
			keyframes: [
				{ marginLeft: '0', offset: 0 },
				{ marginLeft: '8%', offset: 0.25 },
				{ marginLeft: '-8%', offset: 0.75 },
				{ marginLeft: '0', offset: 1 }
			],
			options: {
				duration: 200,
				iterations: 2,
				easing: 'ease-in-out',
			}
		},
		slide: {
			right: {
				keyframes: [
					{ transform: 'translateX(100%)', offset: 0 },
					{ transform: 'translateX(0)', offset: 1 },
				],
				options: { duration: 700, easing: 'ease-out', fill: 'forwards' },
			},
			/*left: {
				keyframes: [
					{ transform: 'translateX(-100%)', offset: 0 },
					{ transform: 'translateX(0)', offset: 1 },
				],
				options: { duration: 700, easing: 'ease-out', fill: 'forwards' },
			},
			up: {
				keyframes: [
					{ transform: 'translateY(-100%)', offset: 0 },
					{ transform: 'translateY(0)', offset: 1 },
				],
				options: { duration: 700, easing: 'ease-out', fill: 'forwards' },
			},*/
			/*down: {
				keyframes: [
					{ transform: 'translateY(100%)', offset: 0 },
					{ transform: 'translateY(0)', offset: 1 },
				],
				options: { duration: 700, easing: 'ease-out', fill: 'forwards' },
			},*/
		},
	}
};

const IS_DEV = window.location.hostname !== 'clayrobot.net' &&
	window.location.hostname !== 'www.clayrobot.net' &&
	window.location.hostname !== 'clayrobot.netlify.app';

const BACKEND = IS_DEV
	? 'https://backend.clayrobot.net/dev/memorygame'
	: 'https://backend.clayrobot.net/memorygame';
Config.BACKEND = BACKEND;

Config.getCategories = async function() {
	try {
		this.category.all = await fetch(Config.BACKEND).then(res => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		});
	} catch (err) {
		console.warn('Failed to fetch remote index, falling back to local:', err.message);
		this.category.all = await fetch('./words/images.json').then(res => res.json());
	}
	this.category.special.dogs = await fetch('./words/dogs.json').then(res => res.json());
	this.category.special.apple = await fetch('./words/apple.json').then(res => res.json());
	this.category.all = this.category.all.trends;
};