async function getImage(word) {
	let images = await fetch('words/images.json').then(res => res.json());
	return images[word];
}
async function getImageOnDemand(word) {
	return await getWikipediaImage(word);
}
async function getWikipediaImage(title) {
	const params = {
		action: 'query',
		prop: 'pageimages',
		piprop: 'thumbnail',
		pithumbsize: 800,
		pilicense: 'any',
		titles: title,
		format: 'json',
		formatversion: 2,
		origin: '*'
	};

	const url = new URL("https://en.wikipedia.org/w/api.php");
	url.search = new URLSearchParams(params).toString();

	return fetch(url)
	.then(res => res.json())
	.then(data => {
		const page = data.query.pages[0];
		if (page.thumbnail) {
			return page.thumbnail.source;
		}
	});
}