import { writable, derived, get } from 'svelte/store';

export interface Beat {
	id: string;
	title: string;
	subtitle?: string;
	caption?: string;
	presenterNote?: string;
	showTelemetry?: boolean;
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
	atSlideEnd: boolean;
	slideIndex: number;
	totalSlides: number;
}

export function createTimeline(beats: Beat[]) {
	const totalDuration = beats.reduce((acc, b) => Math.max(acc, b.start + b.duration), 0);

	const state = writable<TimelineState>({
		playing: false,
		now: 0,
		beatIndex: 0,
		beatProgress: 0,
		totalDuration,
		atSlideEnd: false,
		slideIndex: 0,
		totalSlides: beats.length
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
			if (prev?.exit)
				await prev.exit({ now: get(state).now, beat: prev, beatProgress: 1, totalDuration });
		}
		if (next.enter)
			await next.enter({ now: get(state).now, beat: next, beatProgress: 0, totalDuration });
		activeBeatId = next.id;
	}

	function frame(ts: number) {
		const s = get(state);
		if (!s.playing) return;
		const dt = lastFrame ? (ts - lastFrame) / 1000 : 0;
		lastFrame = ts;

		const curBeat = beats[s.beatIndex] ?? beats[0];
		const slideEnd = curBeat.start + curBeat.duration;
		const rawNext = s.now + dt;

		// Clamp at the end of the current slide and pause.
		if (rawNext >= slideEnd) {
			const clamped = slideEnd;
			const progress = 1;
			if (curBeat.id !== activeBeatId) {
				applyBeatTransition(activeBeatId, s.beatIndex);
			}
			curBeat.tick?.(
				{ now: clamped, beat: curBeat, beatProgress: progress, totalDuration },
				progress
			);
			state.set({
				...s,
				now: clamped,
				beatProgress: progress,
				playing: false,
				atSlideEnd: true
			});
			return;
		}

		const now = rawNext;
		const progress = Math.max(0, (now - curBeat.start) / curBeat.duration);
		state.set({ ...s, now, beatProgress: progress });

		if (curBeat.id !== activeBeatId) {
			applyBeatTransition(activeBeatId, s.beatIndex);
		}
		curBeat.tick?.({ now, beat: curBeat, beatProgress: progress, totalDuration }, progress);

		raf = requestAnimationFrame(frame);
	}

	function play() {
		const s = get(state);
		if (s.playing) return;
		lastFrame = 0;
		state.set({ ...s, playing: true, atSlideEnd: false });
		applyBeatTransition(activeBeatId, s.beatIndex);
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
		const atEnd = progress >= 1;
		state.update((v) => ({
			...v,
			now: clamped,
			beatIndex: idx,
			slideIndex: idx,
			beatProgress: progress,
			atSlideEnd: atEnd
		}));
		applyBeatTransition(activeBeatId, idx);
	}

	function nextSlide() {
		cancelAnimationFrame(raf);
		const s = get(state);
		const nextIdx = Math.min(beats.length - 1, s.beatIndex + 1);
		const next = beats[nextIdx];
		if (!next || nextIdx === s.beatIndex) return;
		state.update((v) => ({
			...v,
			now: next.start,
			beatIndex: nextIdx,
			slideIndex: nextIdx,
			beatProgress: 0,
			atSlideEnd: false,
			playing: false
		}));
		applyBeatTransition(activeBeatId, nextIdx);
		play();
	}

	function prevSlide() {
		cancelAnimationFrame(raf);
		const s = get(state);
		const cur = beats[s.beatIndex];
		const intoSlide = s.now - cur.start;
		let targetIdx = s.beatIndex;
		if (intoSlide <= 0.5) {
			targetIdx = Math.max(0, s.beatIndex - 1);
		}
		const target = beats[targetIdx];
		state.update((v) => ({
			...v,
			now: target.start,
			beatIndex: targetIdx,
			slideIndex: targetIdx,
			beatProgress: 0,
			atSlideEnd: false,
			playing: false
		}));
		applyBeatTransition(activeBeatId, targetIdx);
	}

	// Backwards-compat aliases (older callers may still reference these).
	const nextBeat = nextSlide;
	const prevBeat = prevSlide;

	function destroy() {
		cancelAnimationFrame(raf);
	}

	return {
		state,
		beat,
		beats,
		play,
		pause,
		seek,
		nextSlide,
		prevSlide,
		nextBeat,
		prevBeat,
		destroy
	};
}

export type Timeline = ReturnType<typeof createTimeline>;

// easing helpers
export const easing = {
	linear: (t: number) => t,
	easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
	easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
	easeIn: (t: number) => t * t * t
};
