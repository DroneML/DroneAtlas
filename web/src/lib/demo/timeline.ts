import { writable, derived, get } from 'svelte/store';

export interface Beat {
	id: string;
	title: string;
	caption?: string;
	start: number; // seconds
	duration: number; // seconds
	enter?: (ctx: TimelineContext) => void | Promise<void>;
	tick?: (ctx: TimelineContext, t: number) => void; // t in [0,1]
	exit?: (ctx: TimelineContext) => void | Promise<void>;
}

export interface TimelineContext {
	now: number; // seconds since start
	beat: Beat;
	beatProgress: number; // [0,1]
	totalDuration: number;
}

export interface TimelineState {
	playing: boolean;
	now: number;
	beatIndex: number;
	beatProgress: number;
	totalDuration: number;
}

export function createTimeline(beats: Beat[]) {
	const totalDuration = beats.reduce((acc, b) => Math.max(acc, b.start + b.duration), 0);

	const state = writable<TimelineState>({
		playing: false,
		now: 0,
		beatIndex: 0,
		beatProgress: 0,
		totalDuration
	});

	const beat = derived(state, ($s) => beats[$s.beatIndex] ?? beats[0]);

	let raf = 0;
	let lastFrame = 0;
	let activeBeatId: string | null = null;

	function findBeatIndex(t: number) {
		for (let i = beats.length - 1; i >= 0; i--) {
			if (t >= beats[i].start) return i;
		}
		return 0;
	}

	async function applyBeatTransition(prevId: string | null, nextIdx: number) {
		const next = beats[nextIdx];
		if (!next || next.id === prevId) return;
		if (prevId) {
			const prev = beats.find((b) => b.id === prevId);
			if (prev?.exit) await prev.exit({ now: get(state).now, beat: prev, beatProgress: 1, totalDuration });
		}
		if (next.enter) await next.enter({ now: get(state).now, beat: next, beatProgress: 0, totalDuration });
		activeBeatId = next.id;
	}

	function frame(ts: number) {
		const s = get(state);
		if (!s.playing) return;
		const dt = lastFrame ? (ts - lastFrame) / 1000 : 0;
		lastFrame = ts;
		const now = Math.min(s.now + dt, totalDuration);
		const idx = findBeatIndex(now);
		const b = beats[idx];
		const progress = b ? Math.min(1, Math.max(0, (now - b.start) / b.duration)) : 0;
		state.set({ ...s, now, beatIndex: idx, beatProgress: progress });

		if (b) {
			if (b.id !== activeBeatId) {
				applyBeatTransition(activeBeatId, idx);
			}
			b.tick?.({ now, beat: b, beatProgress: progress, totalDuration }, progress);
		}

		if (now >= totalDuration) {
			state.update((v) => ({ ...v, playing: false }));
			return;
		}
		raf = requestAnimationFrame(frame);
	}

	function play() {
		const s = get(state);
		if (s.playing) return;
		lastFrame = 0;
		state.set({ ...s, playing: true });
		// Trigger initial beat enter if needed
		const idx = findBeatIndex(s.now);
		applyBeatTransition(activeBeatId, idx);
		raf = requestAnimationFrame(frame);
	}

	function pause() {
		cancelAnimationFrame(raf);
		state.update((v) => ({ ...v, playing: false }));
	}

	function seek(t: number) {
		const clamped = Math.max(0, Math.min(totalDuration, t));
		const idx = findBeatIndex(clamped);
		const b = beats[idx];
		const progress = b ? Math.min(1, Math.max(0, (clamped - b.start) / b.duration)) : 0;
		state.update((v) => ({ ...v, now: clamped, beatIndex: idx, beatProgress: progress }));
		applyBeatTransition(activeBeatId, idx);
	}

	function nextBeat() {
		const s = get(state);
		const next = beats[s.beatIndex + 1];
		if (next) seek(next.start);
	}

	function prevBeat() {
		const s = get(state);
		const cur = beats[s.beatIndex];
		// If we're more than 0.5s into the beat, restart it; otherwise go to previous
		if (s.now - cur.start > 0.5) {
			seek(cur.start);
		} else {
			const prev = beats[s.beatIndex - 1];
			if (prev) seek(prev.start);
		}
	}

	function destroy() {
		cancelAnimationFrame(raf);
	}

	return { state, beat, beats, play, pause, seek, nextBeat, prevBeat, destroy };
}

export type Timeline = ReturnType<typeof createTimeline>;

// easing helpers
export const easing = {
	linear: (t: number) => t,
	easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
	easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
	easeIn: (t: number) => t * t * t
};
