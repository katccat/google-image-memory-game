import { useEffect, useRef, useState, useCallback } from 'react';
import { imageValidator, shuffle, randomItem } from './utils.js';
import { soundEffects } from './soundEffects.js';
import '../css/pixelQuiz.css';

const NUM_ROUNDS = 10;

// Sample resolution per tier: fewer samples = blockier = harder to guess.
const TIERS = { easy: 22, medium: 12, hard: 7 };

// Gradual unlock, then mix. roundIndex is 0-based.
function pickTier(roundIndex) {
	let pool;
	if (roundIndex < 3) pool = ['easy'];
	else if (roundIndex < 6) pool = ['easy', 'medium'];
	else pool = ['easy', 'medium', 'hard'];
	return randomItem(pool);
}

function displayName(trends, key) {
	return trends[key]?.nickname || key;
}

// Pick a target trend with a loadable image plus two distractor names.
// Mutates `used`/`unusable` sets so rounds don't repeat answers or retry dead trends.
async function buildRound(trends, allKeys, used, unusable, roundIndex) {
	const fresh = shuffle(allKeys.filter(k => !unusable.has(k) && !used.has(k)));
	const pool = fresh.length ? fresh : shuffle(allKeys.filter(k => !unusable.has(k)));

	for (const key of pool) {
		const raw = Array.isArray(trends[key].url) ? trends[key].url : [trends[key].url];
		const urls = shuffle(raw.filter(Boolean));

		let image = null;
		for (const url of urls) {
			if (await imageValidator.isValid(url)) { image = url; break; }
		}
		if (!image) { unusable.add(key); continue; }

		const distractors = shuffle(allKeys.filter(k => k !== key && !unusable.has(k))).slice(0, 2);
		if (distractors.length < 2) return null;

		used.add(key);
		const tier = pickTier(roundIndex);
		const options = shuffle([key, ...distractors].map(k => ({ key: k, name: displayName(trends, k) })));
		return {
			image,
			options,
			correctIndex: options.findIndex(o => o.key === key),
			answer: displayName(trends, key),
			tier,
			baseSamples: TIERS[tier],
		};
	}
	return null;
}

function useCanvasSize() {
	const compute = () => Math.round(Math.min(window.innerWidth * 0.86, window.innerHeight * 0.5, 460));
	const [size, setSize] = useState(compute);
	useEffect(() => {
		const onResize = () => setSize(compute());
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);
	return size;
}

// Draws a center-cropped square of `image`, pixelated to `samples` blocks per side.
// When `reveal` flips true, animates samples up to full resolution, then onRevealed().
function PixelCanvas({ image, baseSamples, reveal, size, onRevealed }) {
	const canvasRef = useRef(null);
	const imgRef = useRef(null);
	const [loaded, setLoaded] = useState(false);
	const dpr = Math.min(window.devicePixelRatio || 1, 2);

	useEffect(() => {
		setLoaded(false);
		imgRef.current = null;
		const img = new Image();
		// No crossOrigin: we only composite to the canvas, never read pixels back,
		// so cross-origin tainting doesn't matter here.
		img.onload = () => { imgRef.current = img; setLoaded(true); };
		img.onerror = () => { imgRef.current = null; };
		img.src = image;
		return () => { img.onload = null; img.onerror = null; };
	}, [image]);

	const cropSquare = (img) => {
		const side = Math.min(img.naturalWidth, img.naturalHeight);
		return { side, sx: (img.naturalWidth - side) / 2, sy: (img.naturalHeight - side) / 2 };
	};

	const drawPixelated = useCallback((samples) => {
		const canvas = canvasRef.current;
		const img = imgRef.current;
		if (!canvas || !img) return;
		const ctx = canvas.getContext('2d');
		const { side, sx, sy } = cropSquare(img);
		const s = Math.max(1, Math.round(samples));

		const off = document.createElement('canvas');
		off.width = s;
		off.height = s;
		const octx = off.getContext('2d');
		octx.imageSmoothingEnabled = true;
		octx.drawImage(img, sx, sy, side, side, 0, 0, s, s);

		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(off, 0, 0, s, s, 0, 0, canvas.width, canvas.height);
	}, []);

	const drawCrisp = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imgRef.current;
		if (!canvas || !img) return;
		const ctx = canvas.getContext('2d');
		const { side, sx, sy } = cropSquare(img);
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
	}, []);

	// Show the blocky base image whenever we're not mid-reveal.
	useEffect(() => {
		if (loaded && !reveal) drawPixelated(baseSamples);
	}, [loaded, reveal, baseSamples, drawPixelated]);

	// Reveal: ramp samples from base → full, then a final crisp pass.
	useEffect(() => {
		if (!loaded || !reveal) return;
		const full = Math.min(canvasRef.current.width, 480);
		const start = performance.now();
		const duration = 1000;
		let raf;
		const step = (now) => {
			const k = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - k, 3);
			drawPixelated(baseSamples + (full - baseSamples) * eased);
			if (k < 1) {
				raf = requestAnimationFrame(step);
			} else {
				drawCrisp();
				onRevealed && onRevealed();
			}
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [loaded, reveal, baseSamples, drawPixelated, drawCrisp, onRevealed]);

	return (
		<div className="pq-canvas-wrap" style={{ width: size, height: size }}>
			<canvas
				ref={canvasRef}
				width={Math.round(size * dpr)}
				height={Math.round(size * dpr)}
				className="pq-canvas"
				style={{ width: size, height: size }}
			/>
			{!loaded && <div className="pq-canvas-loading">Loading…</div>}
		</div>
	);
}

export function PixelQuiz({ trendData, onExit }) {
	const trends = trendData.trends;
	const allKeys = useRef(Object.keys(trends));
	const used = useRef(new Set());
	const unusable = useRef(new Set());
	const alive = useRef(true);

	const [roundIndex, setRoundIndex] = useState(0);
	const [phase, setPhase] = useState('loading'); // loading | asking | revealing | answered | done
	const [round, setRound] = useState(null);
	const [selected, setSelected] = useState(null);
	const [score, setScore] = useState(0);

	const canvasSize = useCanvasSize();

	useEffect(() => {
		alive.current = true;
		return () => { alive.current = false; };
	}, []);

	useEffect(() => {
		if (roundIndex >= NUM_ROUNDS) { setPhase('done'); return; }
		let cancelled = false;
		(async () => {
			setPhase('loading');
			setSelected(null);
			setRound(null);
			const next = await buildRound(trends, allKeys.current, used.current, unusable.current, roundIndex);
			if (cancelled || !alive.current) return;
			if (!next) { setPhase('done'); return; }
			setRound(next);
			setPhase('asking');
		})();
		return () => { cancelled = true; };
	}, [roundIndex]);

	const onSelect = (i) => {
		if (phase !== 'asking') return;
		setSelected(i);
		setPhase('revealing');
		soundEffects.flip();
	};

	const onRevealed = useCallback(() => {
		setPhase('answered');
		if (selected === round.correctIndex) {
			setScore(s => s + 1);
			soundEffects.match();
		} else {
			soundEffects.resetFailTick();
			soundEffects.failTick();
		}
	}, [selected, round]);

	const next = () => {
		if (phase !== 'answered') return;
		setRoundIndex(r => r + 1);
	};

	if (phase === 'done') {
		return <DoneScreen score={score} total={NUM_ROUNDS} onExit={onExit} />;
	}

	const revealing = phase === 'revealing' || phase === 'answered';
	const correct = round && selected === round.correctIndex;

	const optionClass = (i) => {
		if (!revealing) return 'pq-option';
		if (i === round.correctIndex) return 'pq-option pq-option--correct';
		if (i === selected) return 'pq-option pq-option--wrong';
		return 'pq-option pq-option--dim';
	};

	return (
		<div id="pixel-quiz">
			<div className="pq-card">
				<div className="pq-hud">
					<button className="pq-back" onClick={onExit} aria-label="Back">
						<span className="material-symbols-sharp">close</span>
					</button>
					<span className="pq-round">Round {Math.min(roundIndex + 1, NUM_ROUNDS)} / {NUM_ROUNDS}</span>
					<span className="pq-score">{score}<span className="pq-score-check"> ✓</span></span>
				</div>

				<div className="pq-stage">
					{round
						? <PixelCanvas
							key={roundIndex}
							image={round.image}
							baseSamples={round.baseSamples}
							reveal={revealing}
							size={canvasSize}
							onRevealed={onRevealed}
						/>
						: <div className="pq-canvas-wrap" style={{ width: canvasSize, height: canvasSize }}>
							<div className="pq-canvas-loading">Loading…</div>
						</div>
					}
					{round && revealing && (
						<div className={`pq-tier pq-tier--${round.tier}`}>{round.tier}</div>
					)}
				</div>

				<div className="pq-options">
					{round && round.options.map((opt, i) => (
						<button
							key={opt.key}
							className={optionClass(i)}
							disabled={phase !== 'asking'}
							onClick={() => onSelect(i)}
						>
							{opt.name}
						</button>
					))}
				</div>

				<div className="pq-footer">
					{phase === 'answered' && (
						<>
							<span className={`pq-verdict ${correct ? 'pq-verdict--win' : 'pq-verdict--lose'}`}>
								{correct ? 'Correct!' : 'Nope!'}
							</span>
							<button className="pq-next" onClick={next}>
								{roundIndex + 1 >= NUM_ROUNDS ? 'See results' : 'Next'}
								<span className="material-symbols-sharp">arrow_forward</span>
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function DoneScreen({ score, total, onExit }) {
	const pct = Math.round((score / total) * 100);
	const headline =
		pct === 100 ? "Flawless!" :
		pct >= 70 ? "Sharp eyes!" :
		pct >= 40 ? "Not bad!" :
		"Only human!";
	return (
		<div id="pixel-quiz" className="pq-done" onClick={onExit}>
			<div className="pq-card pq-done-card">
				<div className="pq-done-headline candy-text">{headline}</div>
				<div className="pq-done-score">{score}<span className="pq-done-slash">/{total}</span></div>
				<div className="pq-done-label">trends identified</div>
				<div className="pq-done-prompt">Tap to continue</div>
			</div>
		</div>
	);
}
