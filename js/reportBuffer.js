export class ReportBuffer {
	#buffer = [];
	static MAX_SIZE = 100;

	add(key, trendObject) {
		const newUrls = Array.isArray(trendObject.url) ? trendObject.url : [trendObject.url];
		const idx = this.#buffer.findIndex(e => e.key === key);
		if (idx !== -1) {
			const entry = this.#buffer.splice(idx, 1)[0];
			newUrls.forEach(u => entry.urls.add(u));
			this.#buffer.unshift(entry);
		} else {
			this.#buffer.unshift({
				key,
				name: trendObject.nickname || key.toLowerCase(),
				urls: new Set(newUrls),
			});
			if (this.#buffer.length > ReportBuffer.MAX_SIZE) this.#buffer.pop();
		}
	}

	getItems() {
		return [...this.#buffer];
	}
}
