export class SoundEffects {
	constructor() {
		this._ctx = null;
		this.muted = false;
		this._failTickIdx = 0;
		this._winTickIdx = 0;
		this._buffers = {};
		this._unlocked = false;
	}

	get ctx() {
		if (!this._ctx) this._ctx = new AudioContext();
		return this._ctx;
	}

	async unlock() {
		if (this._unlocked) return;
		this._unlocked = true;
		const ctx = this.ctx;
		if (ctx.state === 'suspended') await ctx.resume();
		await Promise.all(Object.entries({
			flip:    './sound/gentle_click.mp3',
			bells:   './sound/bells.mp3',
			whistle: './sound/whistle.mp3',
			chatter: './sound/chatter.mp3',
			snap:    './sound/snap.mp3',
		}).map(async ([name, url]) => {
			try {
				const raw = await (await fetch(url)).arrayBuffer();
				this._buffers[name] = await ctx.decodeAudioData(raw);
			} catch {}
		}));
	}

	_playBuffer(name) {
		if (this.muted) return;
		const buf = this._buffers[name];
		if (!buf) return;
		try {
			const src = this.ctx.createBufferSource();
			src.buffer = buf;
			src.connect(this.ctx.destination);
			src.start();
		} catch {}
	}

	_tone({ freq, freqEnd, type = 'sine', vol = 0.15, duration = 0.1, delay = 0 } = {}) {
		if (this.muted) return;
		try {
			const ctx = this.ctx;
			if (ctx.state === 'suspended') ctx.resume();
			const now = ctx.currentTime;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = type;
			osc.frequency.setValueAtTime(freq, now + delay);
			if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + delay + duration);
			gain.gain.setValueAtTime(vol, now + delay);
			gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now + delay);
			osc.stop(now + delay + duration);
		} catch {}
	}

	flip()     { this._playBuffer('flip'); }
	bells()    { this._playBuffer('bells'); }
	whistle()  { this._playBuffer('whistle'); }
	chatter()  { this._playBuffer('chatter'); }
	matchWin() { this._playBuffer('snap'); }

	match() {
		this._tone({ freq: 659, vol: 0.15, duration: 0.12 });
		this._tone({ freq: 988, vol: 0.15, duration: 0.14, delay: 0.1 });
	}

	failTick() {
		const freq = 1000 * Math.pow(2, -(this._failTickIdx++ * 0.2) / 12);
		this._tone({ freq, freqEnd: freq * 0.8, vol: 0.05, duration: 0.08 });
	}

	winTick() {
		const freq = 500 * Math.pow(2, (this._winTickIdx++ * 0.1) / 12);
		this._tone({ freq, freqEnd: freq * 1.2, vol: 0.05, duration: 0.08 });
	}

	resetFailTick() { this._failTickIdx = 0; }
	resetWinTick()  { this._winTickIdx = 0; }

	scoreTick()    { this._tone({ freq: 1200, freqEnd: 1100, vol: 0.04, duration: 0.04 }); }
	scoreTickEnd() { this._tone({ freq: 1500, freqEnd: 1600, vol: 0.06, duration: 0.15 }); }
	click()        { this._tone({ freq: 1200, freqEnd: 1100, type: 'triangle', vol: 0.04, duration: 0.04 }); }
}

export const soundEffects = new SoundEffects();
