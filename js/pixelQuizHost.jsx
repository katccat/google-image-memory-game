import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PixelQuiz } from './pixelQuiz.jsx';
import { hideBackground } from './utils.js';

// Mounts the Pixel Quiz React tree into a throwaway root and returns a controller
// matching the Game interface (newGame/destroy) so main.js can treat both alike.
export function startPixelQuiz(trendData, onExit) {
	const mount = document.createElement('div');
	mount.id = 'pixel-quiz-root';
	document.body.appendChild(mount);

	const root = createRoot(mount);
	hideBackground(true);

	let destroyed = false;
	const destroy = () => {
		if (destroyed) return;
		destroyed = true;
		root.unmount();
		mount.remove();
		hideBackground(false);
	};

	root.render(createElement(PixelQuiz, { trendData, onExit }));

	return { newGame() {}, destroy };
}
