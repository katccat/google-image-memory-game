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

export function waitForFlag(flagRef) {
	return new Promise(resolve => {
		function checkFlag() {
			if (flagRef()) {
				// keep checking until it turns false
				setTimeout(checkFlag, 50);
			} else {
				resolve();
			}
		}
		checkFlag();
	});
}

export function fitText(element) {
	const parent = element.parentElement;
	let size = 10;
	element.style.fontSize = size + 'px';
	while (element.scrollWidth <= parent.clientWidth &&
		element.scrollHeight <= parent.clientHeight &&
		size < 200) {
		size++;
		element.style.fontSize = size + 'px';
	}
	element.style.fontSize = (size - 1) + 'px';
}