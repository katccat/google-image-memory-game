export function GridLayout(elements) {
	let cellCount, suitableFactors;
	const grid = elements.grid;

	this.update = function (numCells) {
		cellCount = numCells;
		suitableFactors = [];

		if (cellCount == 4) suitableFactors = [2];
		else if (cellCount == 8) suitableFactors = [2, 4];
		else {
			for (let i = 3; i < cellCount; i++) {
				if (cellCount % i == 0 && cellCount / i != 2) suitableFactors.push(i);
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