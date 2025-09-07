export const Config = {
	fadeDelay: 700,
	category: { special: {} },
	funColorChance: 0.2,
	funGlyphChance: 0.6,
	maxLives: 3,
	colors: [
		'#ed6a5e', // red
		'#86b2f9', // blue
		'#fdd868', // yellow
		'#76d590', // green
	],
	messages: {
		intro: ["I'm feeling lucky"],
		victory: ["I'm not a robot", "reCAPTCHA'd", "Great!"],
		perfect: ['Perfect!', "I'm feeling lucky"],
		nearmiss: ["Phew!", "Close!", "I'm a lil rusty"],
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
	boardAnimation: {
		fade: 'fade',
		buffering: 'buffering',
	}
};

Config.getCategories = async function() {
	this.category.all = await fetch('./words/images.json').then(res => res.json());
	this.category.special.dogs = await fetch('./words/dogs.json').then(res => res.json());
	this.category.special.apple = await fetch('./words/apple.json').then(res => res.json());
};