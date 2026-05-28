import { Config } from './config.js';

export function hideBackground(active) {
	document.body.classList.toggle('in-game', active);
	const video = document.querySelector('#background video');
	if (video) active ? video.pause() : video.play();
}

export function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export function percentScoreFloat(score) {
	const num = score?.num;
	const denominator = score?.denominator ? score.denominator : 1;
	return parseFloat((num / denominator * 100).toFixed(Config.scoreRounding));
}

export function percentScoreString(score) {
	const num = score?.num;
	const denominator = score?.denominator ? score.denominator : 1;
	return (num / denominator * 100).toFixed(Config.scoreRounding);
}

export class ImageValidator {
	// Map of url -> boolean, insertion-ordered for eviction
	#cache = new Map();
	static #MAX_ENTRIES = 500;

	constructor() {
		const saved = JSON.parse(localStorage.getItem('images'));
		if (saved) {
			for (const [url, valid] of Object.entries(saved)) {
				this.#cache.set(url, valid);
			}
		}
	}

	async isValid(url, ignoreStorage = false) {
		if (!ignoreStorage && this.#cache.has(url)) return this.#cache.get(url);
		const valid = await this.#validate(url);
		this.#cache.set(url, valid);
		while (this.#cache.size > ImageValidator.#MAX_ENTRIES) {
			this.#cache.delete(this.#cache.keys().next().value);
		}
		this.#save();
		return valid;
	}

	#save() {
		localStorage.setItem('images', JSON.stringify(Object.fromEntries(this.#cache)));
	}

	async #validate(url) {
		if (!url) return false;
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 1000);
			const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
			clearTimeout(timeoutId);
			if (response.status === 404) return false;
		} catch {
			// CORS or network error — fall through to img fallback
		}
		return new Promise(resolve => {
			const img = new Image();
			let settled = false;
			let pollId;

			function settle(result) {
				if (settled) return;
				settled = true;
				clearTimeout(timeoutId);
				clearInterval(pollId);
				img.onload = null;
				img.onerror = null;
				img.src = '';
				resolve(result);
			}

			pollId = setInterval(() => { if (img.naturalWidth > 0) settle(true); }, 50);
			img.onload = () => settle(true);
			img.onerror = () => settle(false);
			const timeoutId = setTimeout(() => settle(false), 5000);
			img.src = url;
		});
	}
}

export const imageValidator = new ImageValidator();

export function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

export function waitForFlag(flagRef, state) {
	return new Promise(resolve => {
		function check() {
			if (flagRef() === state) resolve();
			else setTimeout(check, 50);
		}
		check();
	});
}

export function isPhone() {
	return window.matchMedia('(max-width: 600px)').matches;
}

// Binary-search for the largest font size that keeps element within maxHeight.
// Reduces forced reflows from O(n) to O(log n) vs. a linear scan.
export function fitFontSize(element, text, maxHeight) {
	element.textContent = text;
	let hi = Math.floor(parseFloat(getComputedStyle(element).fontSize));
	if (element.offsetHeight <= maxHeight) return hi + 'px';
	let lo = 1;
	while (lo < hi - 1) {
		const mid = Math.floor((lo + hi) / 2);
		element.style.fontSize = mid + 'px';
		if (element.offsetHeight <= maxHeight) lo = mid;
		else hi = mid;
	}
	element.style.fontSize = lo + 'px';
	return lo + 'px';
}
