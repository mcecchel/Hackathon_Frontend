import { useEffect, useReducer, useRef, useState, type DragEvent } from 'react';
import AppHeader, { type View } from '../AppHeader';
import { analyzePhoto, uploadPhoto, type AnalysisResult } from '../analysis/api';
import {
	AlertIcon,
	AnalysisDetails,
	Block,
	CheckIcon,
	Hint,
	IssuesFound,
	isJpeg,
	MicroBlock,
	PerfectPhotoBadge,
	PhotoIcon,
	PhotoPreview,
	PRIMARY,
	SMALL_SECONDARY,
	Spinner,
	useObjectUrl,
} from '../analysis/ui';

// --- State machine ---------------------------------------------------------

type State =
	| { status: 'empty' }
	| { status: 'ready' | 'analyzing' | 'analysisError'; file: File }
	| { status: 'passed' | 'failed' | 'uploading' | 'uploadError' | 'uploaded'; file: File; result: AnalysisResult };

type Action =
	| { type: 'select'; file: File }
	| { type: 'analyze' }
	| { type: 'analysisSucceeded'; result: AnalysisResult }
	| { type: 'analysisFailed' }
	| { type: 'upload' }
	| { type: 'uploadSucceeded' }
	| { type: 'uploadFailed' };

const initialState: State = { status: 'empty' };

const isBusy = (state: State) => state.status === 'analyzing' || state.status === 'uploading';

// Every transition is guarded by the current status, so late or duplicate
// events (double clicks, stale responses) can never put the UI in an invalid state.
function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'select':
			return isBusy(state) ? state : { status: 'ready', file: action.file };
		case 'analyze':
			return state.status === 'ready' || state.status === 'analysisError'
				? { status: 'analyzing', file: state.file }
				: state;
		case 'analysisSucceeded':
			return state.status === 'analyzing'
				? { status: action.result.passed ? 'passed' : 'failed', file: state.file, result: action.result }
				: state;
		case 'analysisFailed':
			return state.status === 'analyzing' ? { status: 'analysisError', file: state.file } : state;
		case 'upload':
			return state.status === 'passed' || state.status === 'uploadError' ? { ...state, status: 'uploading' } : state;
		case 'uploadSucceeded':
			return state.status === 'uploading' ? { ...state, status: 'uploaded' } : state;
		case 'uploadFailed':
			return state.status === 'uploading' ? { ...state, status: 'uploadError' } : state;
	}
}

// --- Helpers ---------------------------------------------------------------

const resultOf = (state: State) => ('result' in state ? state.result : null);

function validatePhoto(files: FileList | null): File | string | null {
	if (!files || files.length === 0) return null;
	if (files.length > 1) return 'Select one photo at a time.';
	const file = files.item(0);
	if (!file) return null;
	if (!isJpeg(file)) return `“${file.name}” is not a JPEG. Choose a .jpg or .jpeg photo.`;
	if (file.size === 0) return `“${file.name}” is empty. Choose another photo.`;
	return file;
}

// --- Page ------------------------------------------------------------------

export default function SingleImageAnalysis({ onNavigate }: { onNavigate: (view: View) => void }) {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [pickError, setPickError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const requestRef = useRef<AbortController | null>(null);

	const file = state.status === 'empty' ? null : state.file;
	const previewUrl = useObjectUrl(file);
	const busy = isBusy(state);

	// Abort any in-flight request if the user leaves the page.
	useEffect(() => () => requestRef.current?.abort(), []);

	const startRequest = () => {
		requestRef.current?.abort();
		requestRef.current = new AbortController();
		return requestRef.current.signal;
	};

	const handleFiles = (files: FileList | null) => {
		const result = validatePhoto(files);
		if (result === null) return;
		if (typeof result === 'string') {
			setPickError(result);
		} else {
			setPickError(null);
			dispatch({ type: 'select', file: result });
		}
	};

	const openPicker = () => inputRef.current?.click();

	const runAnalysis = async (photo: File) => {
		const signal = startRequest();
		dispatch({ type: 'analyze' });
		try {
			const result = await analyzePhoto(photo, signal);
			dispatch({ type: 'analysisSucceeded', result });
		} catch {
			if (!signal.aborted) dispatch({ type: 'analysisFailed' });
		}
	};

	const runUpload = async (photo: File) => {
		const signal = startRequest();
		dispatch({ type: 'upload' });
		try {
			await uploadPhoto(photo, signal);
			dispatch({ type: 'uploadSucceeded' });
		} catch {
			if (!signal.aborted) dispatch({ type: 'uploadFailed' });
		}
	};

	const handleDragLeave = (event: DragEvent<HTMLElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
	};

	const handleDrop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setIsDragging(false);
		handleFiles(event.dataTransfer.files);
	};

	return (
		<div className="flex min-h-dvh flex-col bg-slate-50 font-sans text-slate-800">
			<AppHeader current="single-image" onNavigate={onNavigate} locked={busy} />

			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
				<div className="mb-6 text-center">
					<h1 className="text-2xl font-bold text-pnx-blue sm:text-3xl">Check a photo</h1>
					{state.status === 'empty' && (
						<p className="mx-auto mt-2 max-w-2xl text-slate-600">
							Select a JPEG photo: we’ll check it for blur, poor lighting and fingers in the frame before you
							upload it to Panoramax.
						</p>
					)}
				</div>

				<input
					ref={inputRef}
					type="file"
					accept="image/jpeg,.jpg,.jpeg"
					className="hidden"
					disabled={busy}
					onChange={(event) => {
						handleFiles(event.target.files);
						// Allow picking the same file again.
						event.target.value = '';
					}}
				/>

				{/* 2:1 layout on desktop: photo + analysis details on top, result below.
				    On mobile the result follows the photo, so the main actions stay close to it. */}
				<div className="grid gap-6 lg:grid-cols-3">
					<Block
						title="Photo"
						className="lg:col-span-2"
						action={
							file && (
								<button type="button" className={SMALL_SECONDARY} onClick={openPicker} disabled={busy}>
									Change photo
								</button>
							)
						}
					>
						{state.status === 'empty' ? (
							<button
								type="button"
								onClick={openPicker}
								onDragOver={(event) => {
									event.preventDefault();
									setIsDragging(true);
								}}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								aria-describedby={pickError ? 'photo-error' : undefined}
								className={`flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors lg:min-h-96 ${
									isDragging
										? 'border-pnx-purple bg-pnx-purple-light'
										: 'border-slate-300 bg-white hover:border-pnx-purple/60 hover:bg-pnx-purple-light/50'
								}`}
							>
								<span className="rounded-xl bg-pnx-blue-light p-4">
									<PhotoIcon className="h-8 w-8 text-pnx-blue" />
								</span>
								<span className="block text-lg font-semibold text-pnx-blue">Choose a JPEG photo</span>
								<span className="block text-sm text-slate-600">
									<span className="hidden sm:block">or drag it here</span>
									<span className="block">.jpg or .jpeg</span>
								</span>
							</button>
						) : (
							<PhotoPreview
								file={state.file}
								url={previewUrl}
								analyzing={state.status === 'analyzing'}
								result={resultOf(state)}
							/>
						)}

						{pickError && (
							<p
								id="photo-error"
								role="alert"
								className="mt-3 flex items-start gap-2 text-sm font-medium text-status-error-strong"
							>
								<AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
								{pickError}
							</p>
						)}
					</Block>

					<Block title="Result" className="lg:col-span-3 lg:row-start-2" delay={80}>
						<div className="grid gap-4 md:grid-cols-3" aria-live="polite">
							<AnalysisStatus state={state} onAnalyze={() => file && runAnalysis(file)} />
							<IssuesFound result={resultOf(state)} />
							<PublishingPermission state={state} onUpload={() => file && runUpload(file)} />
						</div>
					</Block>

					<Block title="Analysis details" className="lg:col-start-3 lg:row-start-1" delay={160}>
						<AnalysisDetails
							result={resultOf(state)}
							analyzing={state.status === 'analyzing'}
							unavailable={state.status === 'analysisError'}
						/>
					</Block>
				</div>
			</main>
		</div>
	);
}

// --- Result micro-blocks specific to this page ---------------------------

function AnalysisStatus({ state, onAnalyze }: { state: State; onAnalyze: () => void }) {
	const label = 'Analysis status';
	switch (state.status) {
		case 'empty':
			return (
				<MicroBlock label={label} tone="neutral" title="Waiting for a photo">
					<Hint>Select a JPEG photo to start.</Hint>
				</MicroBlock>
			);
		case 'ready':
		case 'analyzing':
		case 'analysisError': {
			const analyzing = state.status === 'analyzing';
			const failed = state.status === 'analysisError';
			return (
				<MicroBlock
					label={label}
					tone={failed ? 'warning' : 'neutral'}
					title={analyzing ? 'Analyzing…' : failed ? 'Analysis failed' : 'Ready to analyze'}
					icon={
						analyzing ? (
							<Spinner className="h-5 w-5 text-pnx-purple" />
						) : failed ? (
							<AlertIcon className="h-5 w-5" />
						) : undefined
					}
				>
					<Hint>
						{analyzing
							? 'This takes a few seconds.'
							: failed
								? 'Something went wrong. Check your connection and try again.'
								: 'We’ll check sharpness, exposure and obstructions.'}
					</Hint>
					<button type="button" className={`${PRIMARY} mt-auto`} onClick={onAnalyze} disabled={analyzing}>
						{analyzing && <Spinner className="h-4 w-4" />}
						{analyzing ? 'Analyzing…' : failed ? 'Try again' : 'Analyze photo'}
					</button>
				</MicroBlock>
			);
		}
		default:
			return (
				<MicroBlock
					label={label}
					tone="neutral"
					title="Completed"
					icon={<CheckIcon className="h-5 w-5 text-pnx-blue" />}
				>
					<Hint>All checks have been run.</Hint>
				</MicroBlock>
			);
	}
}

function PublishingPermission({ state, onUpload }: { state: State; onUpload: () => void }) {
	const label = 'Publishing permission';
	switch (state.status) {
		case 'passed':
		case 'uploading':
		case 'uploadError': {
			const uploading = state.status === 'uploading';
			return (
				<MicroBlock
					label={label}
					tone="success"
					title={<PerfectPhotoBadge />}
				>
					<Hint>Allowed: the photo is ready for Panoramax.</Hint>
					{state.status === 'uploadError' && (
						<p role="alert" className="text-sm font-medium text-status-error-strong">
							Upload failed. Check your connection and try again.
						</p>
					)}
					<button type="button" className={`${PRIMARY} mt-auto`} onClick={onUpload} disabled={uploading}>
						{uploading && <Spinner className="h-4 w-4" />}
						{uploading ? 'Uploading…' : state.status === 'uploadError' ? 'Retry upload' : 'Upload to Panoramax'}
					</button>
				</MicroBlock>
			);
		}
		case 'uploaded':
			return (
				<MicroBlock label={label} tone="success" title="Published" icon={<CheckIcon className="h-5 w-5" />}>
					<Hint>Uploaded to Panoramax. Thanks for contributing!</Hint>
				</MicroBlock>
			);
		case 'failed':
			return (
				<MicroBlock label={label} tone="error" title="Not allowed" icon={<AlertIcon className="h-5 w-5" />}>
					<Hint>Fix the issues and take the photo again.</Hint>
				</MicroBlock>
			);
		default:
			return (
				<MicroBlock label={label} tone="neutral" title="Pending">
					<Hint>Depends on the analysis result.</Hint>
				</MicroBlock>
			);
	}
}
