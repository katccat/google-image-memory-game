import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Graphics } from './graphics.js';
import { randomItem } from './utils.js';
import { soundEffects } from './soundEffects.js';

export function WinScreen({ stats, onDismiss }) {
	const { trendsCollected, levelsCompleted, perfectLevels, avoidableMistakes } = stats;
	const earnedStars = avoidableMistakes === 0 ? 3 : avoidableMistakes <= 5 ? 2 : 1;

	const [active, setActive] = useState(false);
	const [starPopped, setStarPopped] = useState([false, false, false]);
	const [statsVisible, setStatsVisible] = useState(false);
	const [clickable, setClickable] = useState(false);
	const [promptPulsing, setPromptPulsing] = useState(false);

	const headlineRef = useRef(null);
	const alive = useRef(true);

	useEffect(() => {
		alive.current = true;
		return () => { alive.current = false; };
	}, []);

	useEffect(() => {
		const run = async () => {
			setActive(true);
			await new Promise(r => setTimeout(r, 280));
			if (!alive.current) return;

			const googleColors = ['var(--google-blue)', 'var(--google-red)', 'var(--google-yellow)', 'var(--google-green)'];
			const offset = Math.floor(Math.random() * googleColors.length);
			await Graphics.typeTextColored("I'm Not A Robot", googleColors, 72, headlineRef.current);
			if (!alive.current) return;

			await new Promise(r => setTimeout(r, 160));
			if (!alive.current) return;

			for (let i = 0; i < 3; i++) {
				const idx = i;
				setStarPopped(prev => { const s = [...prev]; s[idx] = true; return s; });
				if (i < earnedStars) soundEffects.match();
				await new Promise(r => setTimeout(r, 240));
				if (!alive.current) return;
			}

			if (earnedStars === 3) {
				await new Promise(r => setTimeout(r, 80));
				soundEffects.whistle();
			}

			await new Promise(r => setTimeout(r, 180));
			if (!alive.current) return;
			setStatsVisible(true);

			await new Promise(r => setTimeout(r, 480));
			if (!alive.current) return;
			setPromptPulsing(true);
			setClickable(true);
		};

		run();
	}, []);

	const handleClick = useCallback(() => {
		if (!clickable) return;
		setClickable(false);
		setPromptPulsing(false);
		setActive(false);
		if (onDismiss) setTimeout(onDismiss, 310);
	}, [clickable, onDismiss]);

	return (
		<div
			id="win-screen"
			className={active ? 'active' : undefined}
			onClick={handleClick}
		>
			<div id="win-screen-card">
				<div id="win-screen-headline" className="candy-text" ref={headlineRef} />
				<div id="win-screen-stars">
					{[0, 1, 2].map(i => (
						<img
							key={i}
							src={`images/star1.gif?v=${i}`}
							alt="Star"
							className={[
								'win-star',
								i < earnedStars ? 'earned' : '',
								starPopped[i] ? 'popped' : '',
							].filter(Boolean).join(' ')}
						></img>
					))}
				</div>
				<div id="win-screen-stats" className={statsVisible ? 'visible' : undefined}>
					<div className="win-stat win-stat--trends">
						<span className="win-stat-value">{trendsCollected}</span>
						<span className="win-stat-label">Trends</span>
					</div>
					<div className="win-stat win-stat--levels">
						<span className="win-stat-value">{levelsCompleted}</span>
						<span className="win-stat-label">Rounds</span>
					</div>
					<div className="win-stat win-stat--perfect">
						<span className="win-stat-value">{perfectLevels}</span>
						<span className="win-stat-label">Flawless</span>
					</div>
				</div>
				<div id="win-screen-prompt" className={promptPulsing ? 'pulsing' : undefined}>Tap to Continue</div>
			</div>
		</div>
	);
}
