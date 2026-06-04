export class GridLayout {
	static #FACTORS = Object.freeze({
		4:  [2],
		8:  [2, 4],
		10: [3, 4],
		14: [3, 5],
		16: [4],
		20: [4, 5],
		24: [3, 4, 6, 8],
		36: [3, 4, 6, 9, 12],
	});

	#grid;
	#elements;
	#cellCount = 0;
	#suitableFactors = [];

	constructor(elements) {
		this.#grid = elements.grid;
		this.#elements = elements;
	}

	async update(numCells) {
		const known = GridLayout.#FACTORS[numCells];
		if (known) {
			this.#suitableFactors = known;
			this.#cellCount = known[0] * known[known.length - 1];
		} else {
			this.#cellCount = numCells;
			this.#suitableFactors = [];
			for (let i = 2; i < numCells; i++) {
				if (numCells % i === 0) this.#suitableFactors.push(i);
			}
			if (this.#suitableFactors.length > 2 && this.#suitableFactors[0] === 2) {
				this.#suitableFactors.splice(0, 1);
				this.#suitableFactors.splice(-1, 1);
			}
		}
		this.resizeGrid();
	}

	#findBestDimensions(viewportAspectRatio) {
		const estimate = Math.sqrt(this.#cellCount * viewportAspectRatio);
		let bestDiff = Infinity;
		let bestColumns = this.#suitableFactors[0];
		for (const factor of this.#suitableFactors) {
			const diff = Math.abs(factor - estimate);
			if (diff < bestDiff) { bestDiff = diff; bestColumns = factor; }
		}
		return [bestColumns, this.#cellCount / bestColumns];
	}

	resizeGrid() {
		const { tooltip, gameContainer } = this.#elements;
		const root = document.documentElement;

		// Batch the pre-write reads to avoid separate forced reflows.
		const containerWidth  = gameContainer.getBoundingClientRect().width;
		const tooltipHeight   = tooltip.getBoundingClientRect().height;

		const viewportWidth  = containerWidth;
		const viewportHeight = window.innerHeight - tooltipHeight;
		const [columns, rows] = this.#findBestDimensions(viewportWidth / viewportHeight);
		const gridAspectRatio = columns / rows;

		root.style.setProperty('--columns', columns);
		root.style.setProperty('--rows', rows);
		this.#grid.style.aspectRatio = `${columns} / ${rows}`;

		if (viewportWidth / viewportHeight > gridAspectRatio) {
			this.#grid.style.height = '100%';
			this.#grid.style.width  = 'auto';
		} else {
			this.#grid.style.width  = '100%';
			this.#grid.style.height = 'auto';
		}

		// Single post-layout read — both tooltip width and cellPerspective share it.
		const gridWidth = this.#grid.getBoundingClientRect().width;
		tooltip.style.width = gridWidth + 'px';

		const cellWidth = gridWidth / columns;
		const cellPerspective =
			cellWidth > 280 ? 720 :
			cellWidth > 150 ? 500 :
			cellWidth > 100 ? 300 : 200;
		root.style.setProperty('--cell-perspective', `${cellPerspective}px`);
	}
}
