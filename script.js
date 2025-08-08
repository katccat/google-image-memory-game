const grid = document.getElementById('grid');
const numCells = 16; // Set total number of square cells

// Determine optimal number of rows/columns (as close to square as possible)
const rows = Math.ceil(Math.sqrt(numCells));
const columns = Math.ceil(numCells / rows);

// Set CSS grid rows/columns
grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

// Create and add square cells
for (let i = 0; i < numCells; i++) {
	const cell = document.createElement('div');
	cell.className = 'grid-cell';
	grid.appendChild(cell);
}