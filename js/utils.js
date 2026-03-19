export function randomItem(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export async function validateImage(url) {
	return new Promise((resolve) => {
		const img = new Image();
		img.src = url;
		img.onload = () => { 
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

export function waitForFlag(flagRef, state) {
	return new Promise(resolve => {
		function checkFlag() {
			if (flagRef() === state) {
				resolve();
			} else {
				setTimeout(checkFlag, 50);
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

export function isPhone() {
	const phoneQuery = window.matchMedia('(max-width: 600px)');
	return phoneQuery.matches;
}
export async function awaitTransition(element) {
	const duration = parseFloat(getComputedStyle(element).transitionDuration) * 1000;
	if (!duration) return;
	await new Promise(resolve => {
		element.addEventListener('transitionend', resolve, { once: true });
	});
}
export function getLines(element, text) {
	const oldText = element.textContent
	const words = text.split(/(?<=[-–—\s])/);
	const lines = [];
	let currentLine = '';

	element.textContent = 'a'; // so we're not starting off with a height of zero and guaranteeing a line break
	let baselineHeight = element.offsetHeight;

	for (const word of words) {
		const test = currentLine ? currentLine + word : word;
		element.textContent = test;

		if (element.offsetHeight > baselineHeight && currentLine !== '') {
			// this word caused a new line
			lines.push(currentLine);
			currentLine = word;
		}
		else {
			currentLine = test;
		}
	}

	if (currentLine) lines.push(currentLine);
	element.textContent = oldText;
	return lines;
}
export function truncate(str, maxLength) {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength - 3) + '...';
}