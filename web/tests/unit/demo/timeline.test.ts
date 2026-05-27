import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { get } from 'svelte/store';
import { createTimeline, easing, type Beat } from '$lib/demo/timeline';

const beats: Beat[] = [
	{ id: 'intro', title: 'Intro', start: 0, duration: 2 },
	{ id: 'survey', title: 'Survey', start: 2, duration: 3 },
	{ id: 'result', title: 'Result', start: 5, duration: 1 }
];

describe('demo timeline', () => {
	beforeEach(() => {
		global.requestAnimationFrame = mock(() => 1) as unknown as typeof requestAnimationFrame;
		global.cancelAnimationFrame = mock(() => {}) as unknown as typeof cancelAnimationFrame;
	});

	test('initializes duration and slide state from beats', () => {
		const timeline = createTimeline(beats);
		const state = get(timeline.state);

		expect(state.totalDuration).toBe(6);
		expect(state.totalSlides).toBe(3);
		expect(get(timeline.beat).id).toBe('intro');
	});

	test('seek clamps time and updates active beat progress', () => {
		const timeline = createTimeline(beats);

		timeline.seek(3.5);
		expect(get(timeline.state)).toMatchObject({ now: 3.5, beatIndex: 1, slideIndex: 1, beatProgress: 0.5 });

		timeline.seek(99);
		expect(get(timeline.state)).toMatchObject({ now: 6, beatIndex: 2, atSlideEnd: true });

		timeline.seek(-99);
		expect(get(timeline.state)).toMatchObject({ now: 0, beatIndex: 0 });
	});

	test('navigates between slides and starts playback on next slide', () => {
		const timeline = createTimeline(beats);

		timeline.nextSlide();
		expect(get(timeline.state)).toMatchObject({ now: 2, beatIndex: 1, playing: true });

		timeline.pause();
		expect(get(timeline.state).playing).toBe(false);

		timeline.seek(3);
		timeline.prevSlide();
		expect(get(timeline.state)).toMatchObject({ now: 2, beatIndex: 1, playing: false });

		timeline.prevSlide();
		expect(get(timeline.state)).toMatchObject({ now: 0, beatIndex: 0 });
	});

	test('easing helpers keep endpoints stable', () => {
		expect(easing.linear(0.25)).toBe(0.25);
		expect(easing.easeIn(0)).toBe(0);
		expect(easing.easeIn(1)).toBe(1);
		expect(easing.easeOut(0)).toBe(0);
		expect(easing.easeOut(1)).toBe(1);
		expect(easing.easeInOut(0)).toBe(0);
		expect(easing.easeInOut(1)).toBe(1);
	});
});
