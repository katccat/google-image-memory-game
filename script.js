const grid = document.getElementById('grid');
const numCells = 36;
const cells = [];

function computeBestDimensions(numCells, aspectRatio) {
	factors = [];
	for (let i = 1; i <= numCells; i++) {
		if (numCells % i == 0) {
			factors.push(i);
		}
	}
	let smallestDiff = Infinity;
	const approximateColumns =  Math.sqrt(numCells * aspectRatio);
	let closestFactor = factors[0];
	for (const factor of factors) {
		let diff = Math.abs(factor - approximateColumns);
		if (diff < smallestDiff) {
			smallestDiff = diff;
			closestFactor = factor;
		}
	}
	return [closestFactor, numCells / closestFactor];
}
function resizeGrid() {
	let viewportWidth = window.innerWidth;
	let viewportHeight = window.innerHeight;
	let aspectRatio = viewportWidth / viewportHeight;
	let dimensions = computeBestDimensions(numCells, aspectRatio);
	let columns = dimensions[0];
	let rows = dimensions[1];
	console.log(`${columns} by ${rows}`);
	grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
	grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
	grid.style.aspectRatio = `${columns} / ${rows}`;
}
window.addEventListener('load', resizeGrid);
window.addEventListener('resize', resizeGrid);

// Create and add square cells
for (let i = 0; i < numCells; i++) {
	const cell = document.createElement('div');
	cell.className = 'cell';
	grid.appendChild(cell);
	cell.innerHTML = "<p>Hello</p>"
	cells.push(cell);
}
