import { Config } from './config.js';
import { Game } from './game.js';
import { Menu } from './menu.js';

async function init(skipMenu = false) {
	if (skipMenu) {
		const trendData = await fetchWithOfflineFallback(Config.ENDPOINT.TODAY);
		const game = new Game(trendData, false);
		game.newGame();
		return;
	}
	let index = {};
	try {
		index = await getIndex();
	} catch {}

	const menu = new Menu(index);
	menu.show();

	let currentGame = null;

	menu.onStart(async ({ date, endpoint, challengeMode, restart }) => {
		if (restart) clearSavedProgress(date, challengeMode);

		const trendData = await fetchWithOfflineFallback(endpoint ?? Config.ENDPOINT.TODAY);

		history.pushState({ view: 'game' }, '');

		currentGame = new Game(trendData, challengeMode);
		await menu.hide();
		currentGame.newGame();
	});

	window.addEventListener('popstate', () => {
		if (currentGame) {
			currentGame.destroy();
			currentGame = null;
		}
		menu.show();
	});
}
init(false);

function clearSavedProgress(date, challengeMode) {
	if (!date) return;
	const entry = JSON.parse(localStorage.getItem(date) || '{}');
	if (challengeMode) {
		delete entry.challenge;
	} else {
		delete entry.normal;
		// clear old flat-format keys for backward compat
		delete entry.trendKeys;
		delete entry.score;
		delete entry.session;
	}
	localStorage.setItem(date, JSON.stringify(entry));
}

async function fetchWithOfflineFallback(endpoint) {
	const attempts = [
		() => getTrendSet(endpoint),
		() => getTrendSet(Config.ENDPOINT.FALLBACK),
		() => fetch(Config.OFFLINE_FALLBACK).then(res => { if (!res.ok) throw new Error(); return res.json(); }),
	];
	for (const attempt of attempts) {
		try { return await attempt(); } catch {}
	}
	throw new Error('All trend sources failed');
}

async function getTrendSet(endpoint) {
	if (!endpoint) throw new Error('No endpoint');
	const trendData = await fetch(Config.BACKEND + endpoint).then(res => {
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}).then(data => {
		if (data.count < 1) throw new Error('No trends found');
		return data;
	});
	return trendData;
}

async function getIndex() {
	return fetch(Config.BACKEND + Config.ENDPOINT.INDEX).then(res => {
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}).then(index => {
		if (Object.keys(index).length < 1) throw new Error('No trends found in index');
		return index;
	});
}
