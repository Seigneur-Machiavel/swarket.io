const xxHash32 = typeof window !== 'undefined'
	? (await import('../hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32))
	: (await import('../../node_modules/hive-p2p/libs/xxhash32.mjs').then(m => m.xxHash32));

// Generates next LCG state
function lcg(state) { return (state * 1664525 + 1013904223) % 4294967296; }

export class SeededRandom {

	/** Shuffles array in-place with deterministic seed @param {string | number} seed */
	static shuffle(array = [], seed = 0) {
		let state = typeof seed === 'string' ? xxHash32(seed) : seed;
		for (let i = array.length - 1; i > 0; i--) {
			state = lcg(state);
			const j = Math.floor((state / 4294967296) * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	/** Picks N random items from array (no mutation) @param {string | number} seed */
	static pick(array = [], count = 2, seed = 0) {
		if (count >= array.length) return [...array];

		const shuffled = SeededRandom.shuffle([...array], seed);
		return shuffled.slice(0, count);
	}

	/** Picks one random item from array @param {string | number} seed */
	static pickOne(array = [], seed = 0) {
		if (array.length === 0) return;
		const state = lcg(typeof seed === 'string' ? xxHash32(seed) : seed);
		return array[state % array.length];
	}
}