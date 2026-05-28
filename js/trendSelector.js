import { Config } from './config.js';
import { imageValidator } from './utils.js';

export class TrendSelector {
	#trends;
	#game;
	#keys;

	constructor(trendData, game) {
		this.#trends = trendData.trends;
		this.#game = game;
		this.#keys = {
			unused: new Set(Object.keys(this.#trends)),
			used: new Set(),
			deferred: new Set(),
			unusable: new Set(),
		};
	}

	restoreKeys(restoredKeys) {
		if (!restoredKeys) return;
		const t = this.#trends;
		this.#keys.unused   = new Set((restoredKeys.unused   ?? []).filter(k => t[k]));
		this.#keys.deferred = new Set((restoredKeys.deferred ?? []).filter(k => t[k]));
		this.#keys.used     = new Set((restoredKeys.used     ?? []).filter(k => t[k]));
		this.#keys.unusable = new Set((restoredKeys.unusable ?? []).filter(k => t[k]));

		// Add any new keys not present in the saved state
		const allRestored = [this.#keys.unused, this.#keys.deferred, this.#keys.used, this.#keys.unusable];
		for (const key of Object.keys(t)) {
			if (!allRestored.some(set => set.has(key))) this.#keys.unused.add(key);
		}

		if (!Config.deferViewedTrends) {
			this.#keys.deferred.forEach(k => this.#keys.unused.add(k));
			this.#keys.deferred.clear();
		}
	}

	#move(key, from, to) {
		if (!from.has(key)) return false;
		from.delete(key);
		to.add(key);
		return true;
	}

	#markUnusable(key) {
		if (!this.#move(key, this.#keys.unused, this.#keys.unusable))
			if (!this.#move(key, this.#keys.deferred, this.#keys.unusable))
				this.#move(key, this.#keys.used, this.#keys.unusable);
	}

	deferUsed() {
		this.#keys.used.forEach(k => this.#keys.deferred.add(k));
		this.#keys.used.clear();
	}

	markUsed(key) {
		if (!this.#move(key, this.#keys.unused, this.#keys.used))
			this.#move(key, this.#keys.deferred, this.#keys.used);
	}

	markViewed(key) {
		this.#move(key, this.#keys.unused, this.#keys.deferred);
	}

	addTrends(trendSet, victory) {
		if (trendSet.size < 1) return;
		if (victory) {
			for (const trend of trendSet) this.markUsed(trend);
		} else if (Config.deferViewedTrends) {
			for (const trend of trendSet) this.markViewed(trend);
		}
		if (this.#game.saveProgress) this.saveData();
	}

	removeTrends(amount) {
		const usedKeys = [...this.#keys.used];
		amount = Math.min(amount, usedKeys.length);
		const dest = Config.deferViewedTrends ? this.#keys.deferred : this.#keys.unused;
		for (let i = 0; i < amount; i++) {
			const index = Math.floor(Math.random() * usedKeys.length);
			const key = usedKeys.splice(index, 1)[0];
			this.#move(key, this.#keys.used, dest);
		}
		if (this.#game.saveProgress) this.saveData();
	}

	async getRandomTrendKeys(amount) {
		const result = [];
		const unusedKeys   = [...this.#keys.unused];
		const deferredKeys = [...this.#keys.deferred];
		const usedKeys     = [...this.#keys.used];

		const pickKeys = (count) => {
			const picked = [];
			for (let i = 0; i < count; i++) {
				let usedTrend = false;
				let pool;
				if (unusedKeys.length > 0)        pool = unusedKeys;
				else if (deferredKeys.length > 0)  pool = deferredKeys;
				else if (usedKeys.length > 0)      { pool = usedKeys; usedTrend = true; }
				else break;

				const index = Math.floor(Math.random() * pool.length);
				const key = pool.splice(index, 1)[0];
				picked.push({ key, usedTrend });
			}
			return picked;
		};

		const validateKey = async ({ key, usedTrend }) => {
			const trendObject = this.#trends[key];
			const urlList = Array.isArray(trendObject.url) ? trendObject.url : [trendObject.url];

			if (urlList.length === 0 || urlList[0] === undefined) {
				this.#markUnusable(key);
				return null;
			}

			const results = await Promise.all(
				urlList.map(async (img) => ({ url: img, isValid: await imageValidator.isValid(img) }))
			);
			const validUrls = results.filter(r => r.isValid).map(r => r.url);
			trendObject.url = validUrls;

			const isViable = this.#game.challengeMode ? validUrls.length >= 2 : validUrls.length > 0;
			if (!isViable) {
				this.#markUnusable(key);
				return null;
			}
			return { key, usedTrend };
		};

		let needed = amount;
		while (result.length < amount) {
			const candidates = pickKeys(needed);
			if (candidates.length === 0) {
				console.error('No trend with valid images found.');
				break;
			}
			const valid = (await Promise.all(candidates.map(validateKey))).filter(Boolean);
			result.push(...valid);
			needed = amount - result.length;
		}

		return result;
	}

	getScore() {
		return {
			num: this.#keys.used.size,
			denominator: Object.keys(this.#trends).length - this.#keys.unusable.size,
		};
	}

	getAllUsedTrends() {
		return [...this.#keys.used];
	}

	saveData() {
		const data = {
			unused:   [...this.#keys.unused],
			used:     [...this.#keys.used],
			deferred: [...this.#keys.deferred],
			unusable: [...this.#keys.unusable],
		};
		this.#game.saveData('trendKeys', data);
	}
}
