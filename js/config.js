export const Config = {
	fadeDelay: 700,
	category: { special: {} },
	funColorChance: 0,
	funGlyphChance: 0.6,
	maxLives: 3,
	colors: [
		'#ed6a5e', // red
		'#86b2f9', // blue
		'#fdd868', // yellow
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
	introImages: [
		'images/im.png',
		'images/not.png',
		'images/a.png',
		'images/robot.png',
	],
	difficulty: {
		easy: 0,
		normal: 5,
		hard: 12,
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
		enlarge: {
			keyframes: [
				{ scale: '1', offset: 0 },
				{ scale: '0.9', offset: 0.5 },
				{ scale: '1', offset: 1 },
			],
			options: {
				duration: 500,
				iterations: 1,
				easing: 'ease-in-out',
				endDelay: 1000,
			}
		},
		slide: {
			right: {
				keyframes: [
					{ transform: 'translateX(100%)', offset: 0 },
					{ transform: 'translateX(0)', offset: 1 },
				],
				options: { duration: 600, easing: 'ease-out', fill: 'forwards' },
			},
			left: {
				keyframes: [
					{ transform: 'translateX(-100%)', opacity: 0, offset: 0 },
					{ transform: 'translateX(0)', opacity: 1, offset: 1 },
				],
				options: { duration: 600, easing: 'ease-out', fill: 'forwards' },
			},
			up: {
				keyframes: [
					{ transform: 'translateY(-100%)', opacity: 0, offset: 0 },
					{ transform: 'translateY(0)', opacity: 1, offset: 1 },
				],
				options: { duration: 600, easing: 'ease-out', fill: 'forwards' },
			},
			down: {
				keyframes: [
					{ transform: 'translateY(100%)', opacity: 0, offset: 0 },
					{ transform: 'translateY(0)', opacity: 1, offset: 1 },
				],
				options: { duration: 600, easing: 'ease-out', fill: 'forwards' },
			},
		},
	}
};

Config.getCategories = async function() {
	try {
		this.category.all = await fetch('https://backend.clayrobot.net/memorygame').then(res => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		});
	} catch (err) {
		console.warn('Failed to fetch remote index, falling back to local:', err.message);
		this.category.all = await fetch('./words/images.json').then(res => res.json());
	}
	this.category.special.dogs = await fetch('./words/dogs.json').then(res => res.json());
	this.category.special.apple = await fetch('./words/apple.json').then(res => res.json());
};