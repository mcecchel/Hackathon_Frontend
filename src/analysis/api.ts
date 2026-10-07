// Client for the photo quality backend.
// Both calls are mocked for now: swap their bodies for real `fetch` calls to
// `import.meta.env.VITE_API_BASE_URL` once the C++ engine is exposed over HTTP.

export type DefectType = 'blur' | 'dark' | 'finger';

export interface Defect {
	id: string;
	type: DefectType;
	/** 0..1 */
	confidence: number;
	/** Bounding box as percentages of the image size. */
	box: { x: number; y: number; w: number; h: number };
}

/** Outcome of a single engine check (one per detector). */
export interface Check {
	type: DefectType;
	detected: boolean;
	/** 0..1 likelihood that the defect is present. */
	score: number;
}

export interface AnalysisResult {
	passed: boolean;
	checks: Check[];
	/** Localized defects, used to draw bounding boxes. */
	defects: Defect[];
}

const ANALYSIS_DELAY_MS = 2000;
const UPLOAD_DELAY_MS = 1500;

const MOCK_DEFECTS: Defect[] = [
	{ id: 'd1', type: 'blur', confidence: 0.92, box: { x: 15, y: 20, w: 25, h: 30 } },
	{ id: 'd2', type: 'dark', confidence: 0.87, box: { x: 55, y: 60, w: 15, h: 20 } },
	{ id: 'd3', type: 'finger', confidence: 0.78, box: { x: 0, y: 70, w: 18, h: 30 } },
];

const CHECK_TYPES: DefectType[] = ['blur', 'dark', 'finger'];

export async function analyzePhoto(file: File, signal?: AbortSignal): Promise<AnalysisResult> {
	await wait(ANALYSIS_DELAY_MS, signal);

	// Deterministic mock: the same photo always gets the same verdict,
	// while different photos exercise both outcomes.
	const seed = hash(`${file.name}:${file.size}`);
	const defects = seed % 2 === 0 ? [] : MOCK_DEFECTS.slice(0, 1 + (seed % MOCK_DEFECTS.length));
	const checks = CHECK_TYPES.map((type) => {
		const defect = defects.find((d) => d.type === type);
		return { type, detected: Boolean(defect), score: defect?.confidence ?? 0.05 };
	});
	return { passed: defects.length === 0, checks, defects };
}

export async function uploadPhoto(_file: File, signal?: AbortSignal): Promise<void> {
	await wait(UPLOAD_DELAY_MS, signal);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(signal.reason);
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});
}

function hash(value: string): number {
	let h = 0;
	for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
	return h;
}
