export function GridLayout(elements) {
	const factors = [];
	factors[4] = [2];
	factors[8] = [2, 4];
	factors[16] = [4];
	factors[20] = [4, 5];
	factors[24] = [3, 4, 6, 8];
	factors[36] = [3, 4, 6, 9, 12];
	let cellCount, suitableFactors;
	const grid = elements.grid;

	this.update = function (numCells) {
		cellCount = numCells;
		suitableFactors = [];

		if (factors[numCells]) suitableFactors = factors[numCells];
		else {
			for (let i = 2; i < cellCount; i++) {
				if (cellCount % i == 0) suitableFactors.push(i);
			}
			if (suitableFactors.length > 2 && suitableFactors[0] == 2) {
				suitableFactors.splice(0, 1);
				suitableFactors.splice(-1, 1);
			}
		}
		this.resizeGrid();
	}
	this.findBestDimensions = function (viewportAspectRatio) {
		const columnCountEstimate = Math.sqrt(cellCount * viewportAspectRatio);
		let smallestDiffToFactor = Infinity;
		let bestColumnCount = suitableFactors[0];
		for (const factor of suitableFactors) {
			let diff = Math.abs(factor - columnCountEstimate);
			if (diff < smallestDiffToFactor) {
				smallestDiffToFactor = diff;
				bestColumnCount = factor;
			}
		}
		let bestRowCount = cellCount / bestColumnCount;
		return [bestColumnCount, bestRowCount];
	}
	this.resizeGrid = () => {
		const tooltip = elements.tooltip;
		const gridContainer = elements.gridContainer;
		const viewportWidth = gridContainer.getBoundingClientRect().width;
		const viewportHeight = window.innerHeight - tooltip.getBoundingClientRect().height;
		const viewportAspectRatio = viewportWidth / viewportHeight;
		const [columns, rows] = this.findBestDimensions(viewportWidth / viewportHeight);
		const gridAspectRatio = columns / rows;
		grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
		grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
		grid.style.aspectRatio = `${columns} / ${rows}`;

		if (viewportAspectRatio > gridAspectRatio) {
			// Viewport is wider than grid: set height to 100%, width auto
			grid.style.height = "100%";
			grid.style.width = "auto";
		}
		else {
			// Viewport is taller than grid: set width to 100%, height auto
			grid.style.width = "100%";
			grid.style.height = "auto";
		}
		tooltip.style.width = grid.getBoundingClientRect().width + 'px';
	}
};