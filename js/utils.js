export function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export async function validateImage(url, game) {
	return new Promise((resolve) => {
		if (game.memory.validImages[url]) {
			resolve(true);
			return;
		}
		const img = new Image();
		img.src = url;
		img.onload = () => { 
			game.memory.validImages[url] = true;
			resolve(true); 
			cleanup(); 
		};
		img.onerror = () => { resolve(false); cleanup(); };
		function cleanup() {
			img.onload = null;
			img.onerror = null;
		}
	});
}