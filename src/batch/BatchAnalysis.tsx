import { useEffect, useLayoutEffect, useReducer, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import AppHeader, { type View } from '../AppHeader';
import { analyzePhoto, uploadPhoto, type AnalysisResult } from '../analysis/api';
import {
	AlertIcon,
	AnalysisDetails,
	Block,
	CHECK_INFO,
	CheckIcon,
	CountUp,
	FolderIcon,
	Hint,
	IssuesFound,
	issuesOf,
	isJpeg,
	MicroBlock,
	PerfectPhotoBadge,
	PhotoPreview,
	PRIMARY,
	SMALL_SECONDARY,
	Spinner,
} from '../analysis/ui';

/** Photos analyzed or uploaded in parallel. */
const CONCURRENCY = 4;

// Phones and tablets can't reliably pick a folder: there the user selects several photos instead.
const PICK_PHOTOS_QUERY = '(hover: none) and (pointer: coarse)';

// --- State machine ---------------------------------------------------------

interface BatchItem {
	id: string;
	file: File;
	result: AnalysisResult | null;
	uploaded: boolean;
}

type Phase = 'empty' | 'ready' | 'analyzing' | 'analysisError' | 'done' | 'uploading' | 'uploadError' | 'uploaded';

interface State {
	phase: Phase;
	items: BatchItem[];
	/** Object URLs by item id, created once per selection (thumbnails and detail). */
	urls: ReadonlyMap<string, string>;
	/** Files left out of the selection because they aren't JPEG photos. */
	skipped: number;
}

type Action =
	| { type: 'select'; items: BatchItem[]; urls: ReadonlyMap<string, string>; skipped: number }
	| { type: 'analyze' }
	| { type: 'itemAnalyzed'; id: string; result: AnalysisResult }
	| { type: 'analysisDone' }
	| { type: 'analysisFailed' }
	| { type: 'upload' }
	| { type: 'itemUploaded'; id: string }
	| { type: 'uploadDone' }
	| { type: 'uploadFailed' };

const initialState: State = { phase: 'empty', items: [], urls: new Map(), skipped: 0 };

const isBusy = (phase: Phase) => phase === 'analyzing' || phase === 'uploading';

const updateItem = (items: BatchItem[], id: string, patch: Partial<BatchItem>) =>
	items.map((item) => (item.id === id ? { ...item, ...patch } : item));

// Every transition is guarded by the current phase, so late or duplicate events can't corrupt the batch.
function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'select':
			return isBusy(state.phase)
				? state
				: { phase: 'ready', items: action.items, urls: action.urls, skipped: action.skipped };
		case 'analyze':
			return state.phase === 'ready' || state.phase === 'analysisError' ? { ...state, phase: 'analyzing' } : state;
		case 'itemAnalyzed':
			return state.phase === 'analyzing'
				? { ...state, items: updateItem(state.items, action.id, { result: action.result }) }
				: state;
		case 'analysisDone':
			return state.phase === 'analyzing' && state.items.every((item) => item.result)
				? { ...state, phase: 'done' }
				: state;
		case 'analysisFailed':
			return state.phase === 'analyzing' ? { ...state, phase: 'analysisError' } : state;
		case 'upload':
			return state.phase === 'done' || state.phase === 'uploadError' ? { ...state, phase: 'uploading' } : state;
		case 'itemUploaded':
			return state.phase === 'uploading'
				? { ...state, items: updateItem(state.items, action.id, { uploaded: true }) }
				: state;
		case 'uploadDone':
			return state.phase === 'uploading' ? { ...state, phase: 'uploaded' } : state;
		case 'uploadFailed':
			return state.phase === 'uploading' ? { ...state, phase: 'uploadError' } : state;
	}
}

// --- Helpers ---------------------------------------------------------------

const pathOf = (file: File) => file.webkitRelativePath || file.name;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Runs `worker` on every item, with at most `limit` calls in flight. Stops at the first failure. */
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const lane = async () => {
		while (next < items.length) await worker(items[next++]!);
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

/** Files from a drop, walking into dropped folders. */
async function filesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
	// Both lists must be read synchronously, before the drop event ends.
	const plainFiles = Array.from(dataTransfer.files);
	const entries = Array.from(dataTransfer.items, (item) => item.webkitGetAsEntry()).filter(
		(entry): entry is FileSystemEntry => entry !== null,
	);
	if (entries.length === 0) return plainFiles;

	const files: File[] = [];
	const walk = async (entry: FileSystemEntry): Promise<void> => {
		if (entry.isFile) {
			files.push(await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)));
		} else if (entry.isDirectory) {
			const reader = (entry as FileSystemDirectoryEntry).createReader();
			// readEntries returns children in chunks, until an empty one.
			for (;;) {
				const chunk = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
				if (chunk.length === 0) break;
				for (const child of chunk) await walk(child);
			}
		}
	};
	for (const entry of entries) await walk(entry);
	return files;
}

// --- Page ------------------------------------------------------------------

export default function BatchAnalysis({ onNavigate }: { onNavigate: (view: View) => void }) {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [pickPhotos] = useState(() => window.matchMedia(PICK_PHOTOS_QUERY).matches);
	const [pickError, setPickError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [tab, setTab] = useState<'rejected' | 'passed'>('rejected');
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const requestRef = useRef<AbortController | null>(null);
	const returnRef = useRef<{ id: string; scrollY: number } | null>(null);

	const busy = isBusy(state.phase);
	const total = state.items.length;
	const analyzed = state.items.filter((item) => item.result).length;
	const passedItems = state.items.filter((item) => item.result?.passed);
	const rejectedItems = state.items.filter((item) => item.result && !item.result.passed);
	const uploadedCount = state.items.filter((item) => item.uploaded).length;
	const hasResults = state.phase === 'done' || state.phase === 'uploading' || state.phase === 'uploadError' || state.phase === 'uploaded';
	const selected = state.items.find((item) => item.id === selectedId);

	// React has no prop for folder selection.
	useEffect(() => {
		if (inputRef.current) inputRef.current.webkitdirectory = !pickPhotos;
	}, [pickPhotos]);

	// Abort any in-flight request if the user leaves the page.
	useEffect(() => () => requestRef.current?.abort(), []);

	// Release the previous selection's previews once it's replaced, and all of them on exit.
	useEffect(() => () => state.urls.forEach((url) => URL.revokeObjectURL(url)), [state.urls]);

	// Open on the rejected photos, unless there are none.
	useEffect(() => {
		if (state.phase === 'done') setTab(rejectedItems.length > 0 ? 'rejected' : 'passed');
	}, [state.phase]);

	// Coming back from a photo: restore the scroll position and focus its thumbnail.
	useLayoutEffect(() => {
		if (selectedId !== null || !returnRef.current) return;
		const { id, scrollY } = returnRef.current;
		returnRef.current = null;
		window.scrollTo(0, scrollY);
		document.getElementById(`thumb-${id}`)?.focus({ preventScroll: true });
	}, [selectedId]);

	const startRequest = () => {
		requestRef.current?.abort();
		requestRef.current = new AbortController();
		return requestRef.current;
	};

	const handleFiles = (files: File[]) => {
		if (busy || files.length === 0) return;
		const visible = files.filter((file) => !file.name.startsWith('.'));
		const photos = visible
			.filter((file) => isJpeg(file) && file.size > 0)
			.sort((a, b) => pathOf(a).localeCompare(pathOf(b), undefined, { numeric: true }));

		if (photos.length === 0) {
			setPickError(
				pickPhotos
					? 'No JPEG photos selected. Choose .jpg or .jpeg photos.'
					: 'No JPEG photos found. Choose a folder with .jpg or .jpeg photos.',
			);
			return;
		}

		const items = photos.map((file, index) => ({ id: String(index), file, result: null, uploaded: false }));
		const urls = new Map(items.map((item) => [item.id, URL.createObjectURL(item.file)]));
		setPickError(null);
		dispatch({ type: 'select', items, urls, skipped: visible.length - photos.length });
	};

	const openPicker = () => inputRef.current?.click();

	const runAnalysis = async () => {
		const controller = startRequest();
		dispatch({ type: 'analyze' });
		try {
			// Photos analyzed before a failure are kept: a retry only runs the remaining ones.
			await runPool(
				state.items.filter((item) => !item.result),
				CONCURRENCY,
				async (item) => {
					const result = await analyzePhoto(item.file, controller.signal);
					dispatch({ type: 'itemAnalyzed', id: item.id, result });
				},
			);
			dispatch({ type: 'analysisDone' });
		} catch {
			if (controller.signal.aborted) return;
			controller.abort();
			dispatch({ type: 'analysisFailed' });
		}
	};

	const runUpload = async () => {
		const controller = startRequest();
		dispatch({ type: 'upload' });
		try {
			await runPool(
				state.items.filter((item) => item.result?.passed && !item.uploaded),
				CONCURRENCY,
				async (item) => {
					await uploadPhoto(item.file, controller.signal);
					dispatch({ type: 'itemUploaded', id: item.id });
				},
			);
			dispatch({ type: 'uploadDone' });
		} catch {
			if (controller.signal.aborted) return;
			controller.abort();
			dispatch({ type: 'uploadFailed' });
		}
	};

	const openDetail = (id: string) => {
		returnRef.current = { id, scrollY: window.scrollY };
		setSelectedId(id);
		window.scrollTo(0, 0);
	};

	const handleDragLeave = (event: DragEvent<HTMLElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
	};

	const handleDrop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setIsDragging(false);
		void filesFromDrop(event.dataTransfer).then(handleFiles);
	};

	const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		const next = tab === 'rejected' ? 'passed' : 'rejected';
		setTab(next);
		document.getElementById(`tab-${next}`)?.focus();
	};

	const announcement =
		state.phase === 'done'
			? `Analysis complete: ${passedItems.length} passed, ${rejectedItems.length} rejected.`
			: state.phase === 'analysisError'
				? 'Analysis stopped.'
				: state.phase === 'uploadError'
					? 'Upload stopped.'
					: state.phase === 'uploaded'
						? `${plural(passedItems.length, 'photo')} published to Panoramax.`
						: '';

	const shownItems = tab === 'rejected' ? rejectedItems : passedItems;

	return (
		<div className="flex min-h-dvh flex-col bg-slate-50 font-sans text-slate-800">
			<AppHeader
				current="batch-folder"
				// From a photo's detail, "Batch" leads back to the results.
				onNavigate={(view) => (view === 'batch-folder' ? setSelectedId(null) : onNavigate(view))}
				locked={busy}
			/>

			<p className="sr-only" aria-live="polite">
				{announcement}
			</p>

			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,.jpg,.jpeg"
				multiple
				className="hidden"
				disabled={busy}
				onChange={(event) => {
					handleFiles(Array.from(event.target.files ?? []));
					// Allow picking the same folder again.
					event.target.value = '';
				}}
			/>

			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
				{selected?.result ? (
					<PhotoDetail
						item={selected}
						result={selected.result}
						url={state.urls.get(selected.id) ?? null}
						onClose={() => setSelectedId(null)}
					/>
				) : (
					<>
						<div className="mb-6 text-center">
							<h1 className="text-2xl font-bold text-pnx-blue sm:text-3xl">Check a batch of photos</h1>
							{state.phase === 'empty' && (
								<p className="mx-auto mt-2 max-w-2xl text-slate-600">
									{pickPhotos ? 'Select your JPEG photos' : 'Select a folder of JPEG photos'}: we’ll split them
									into passed and rejected, and show the issues found in each rejected photo.
								</p>
							)}
						</div>

						<div className="space-y-6">
							<Block
								title="Photos"
								action={
									state.phase !== 'empty' && (
										<button type="button" className={SMALL_SECONDARY} onClick={openPicker} disabled={busy}>
											{pickPhotos ? 'Change photos' : 'Change folder'}
										</button>
									)
								}
							>
								{state.phase === 'empty' ? (
									<button
										type="button"
										onClick={openPicker}
										{...(pickPhotos ? {} : {
											onDragOver: (event: DragEvent<HTMLElement>) => {
												event.preventDefault();
												setIsDragging(true);
											},
											onDragLeave: handleDragLeave,
											onDrop: handleDrop,
										})}
										aria-describedby={pickError ? 'batch-error' : undefined}
										className={`flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
											isDragging
												? 'border-pnx-purple bg-pnx-purple-light'
												: 'border-slate-300 bg-white hover:border-pnx-purple/60 hover:bg-pnx-purple-light/50'
										}`}
									>
										<span className="rounded-xl bg-pnx-purple-light p-4">
											<FolderIcon className="h-8 w-8 text-pnx-purple" />
										</span>
										<span className="block text-lg font-semibold text-pnx-blue">
											{pickPhotos ? 'Choose JPEG photos' : 'Choose a folder'}
										</span>
										<span className="block text-sm text-slate-600">
											{!pickPhotos && <span className="block">or drag it here</span>}
											<span className="block">.jpg or .jpeg photos</span>
										</span>
									</button>
								) : (
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<BatchStatus
											phase={state.phase}
											total={total}
											analyzed={analyzed}
											passed={passedItems.length}
											rejected={rejectedItems.length}
											skipped={state.skipped}
										/>
										<BatchAction
											phase={state.phase}
											total={total}
											passed={passedItems.length}
											uploaded={uploadedCount}
											onAnalyze={runAnalysis}
											onUpload={runUpload}
										/>
									</div>
								)}

								{pickError && (
									<p
										id="batch-error"
										role="alert"
										className="mt-3 flex items-start gap-2 text-sm font-medium text-status-error-strong"
									>
										<AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
										{pickError}
									</p>
								)}
							</Block>

							{hasResults && (
								<Block title="Results">
									<div
										role="tablist"
										aria-label="Analysis results"
										onKeyDown={handleTabKeyDown}
										className="-mt-1 mb-4 flex gap-1 border-b border-slate-200"
									>
										{(['rejected', 'passed'] as const).map((key) => (
											<button
												key={key}
												id={`tab-${key}`}
												type="button"
												role="tab"
												aria-selected={tab === key}
												aria-controls={`panel-${key}`}
												tabIndex={tab === key ? 0 : -1}
												onClick={() => setTab(key)}
												className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
													tab === key
														? 'border-pnx-purple text-pnx-blue'
														: 'border-transparent text-slate-600 hover:text-pnx-blue'
												}`}
											>
												{key === 'rejected'
													? `Rejected (${rejectedItems.length})`
													: `Passed (${passedItems.length})`}
											</button>
										))}
									</div>

									<div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
										{shownItems.length === 0 ? (
											<p className="py-10 text-center text-sm text-slate-600">
												{tab === 'rejected'
													? 'No rejected photos: every photo passed the check.'
													: 'No photos passed the check.'}
											</p>
										) : (
											<PhotoGrid items={shownItems} urls={state.urls} onOpen={openDetail} />
										)}
									</div>
								</Block>
							)}
						</div>
					</>
				)}
			</main>
		</div>
	);
}

// --- Selection, progress and summary ---------------------------------------

function BatchStatus({
	phase,
	total,
	analyzed,
	passed,
	rejected,
	skipped,
}: {
	phase: Phase;
	total: number;
	analyzed: number;
	passed: number;
	rejected: number;
	skipped: number;
}) {
	const skippedHint = skipped > 0 && (
		<Hint>{plural(skipped, 'file')} skipped: only .jpg and .jpeg photos are analyzed.</Hint>
	);

	switch (phase) {
		case 'analyzing':
			return (
				<div className="flex-1 space-y-2 sm:max-w-md">
					<p className="font-semibold text-slate-900">
						Analyzing… {analyzed} of {total} done
					</p>
					<div
						role="progressbar"
						aria-label="Analysis progress"
						aria-valuemin={0}
						aria-valuemax={total}
						aria-valuenow={analyzed}
						className="h-2 overflow-hidden rounded-full bg-slate-100"
					>
						<div
							className="h-full rounded-full bg-pnx-line transition-[width] duration-300"
							style={{ width: `${(analyzed / total) * 100}%` }}
						/>
					</div>
				</div>
			);
		case 'analysisError':
			return (
				<div>
					<p className="flex items-center gap-2 text-lg font-semibold text-status-warning-strong">
						<AlertIcon className="h-5 w-5" />
						Analysis stopped
					</p>
					<Hint>
						{analyzed} of {total} analyzed. Something went wrong: check your connection and try again.
					</Hint>
				</div>
			);
		case 'done':
		case 'uploading':
		case 'uploadError':
		case 'uploaded':
			return (
				<div>
					<p className="text-lg font-semibold text-slate-900">
						{plural(total, 'photo')} ·{' '}
						<span className="text-status-success-strong">
							<CountUp value={passed} /> passed
						</span>{' '}
						·{' '}
						<span className="text-status-error-strong">
							<CountUp value={rejected} /> rejected
						</span>
					</p>
					{skippedHint}
				</div>
			);
		default:
			return (
				<div>
					<p className="text-lg font-semibold text-slate-900">{plural(total, 'photo')} selected</p>
					{skippedHint}
				</div>
			);
	}
}

function BatchAction({
	phase,
	total,
	passed,
	uploaded,
	onAnalyze,
	onUpload,
}: {
	phase: Phase;
	total: number;
	passed: number;
	uploaded: number;
	onAnalyze: () => void;
	onUpload: () => void;
}) {
	const button = `${PRIMARY} shrink-0 sm:w-auto`;

	switch (phase) {
		case 'ready':
		case 'analysisError':
			return (
				<button type="button" className={button} onClick={onAnalyze}>
					{phase === 'analysisError' ? 'Try again' : `Analyze ${plural(total, 'photo')}`}
				</button>
			);
		case 'analyzing':
			return (
				<button type="button" className={button} disabled>
					<Spinner className="h-4 w-4" />
					Analyzing…
				</button>
			);
		case 'uploaded':
			return (
				<p className="flex items-center gap-2 font-semibold text-status-success-strong">
					<CheckIcon className="h-5 w-5" />
					{plural(passed, 'photo')} published to Panoramax
				</p>
			);
		default:
			if (passed === 0) return <Hint>No photos passed the check, so there’s nothing to publish.</Hint>;
			return (
				<div className="flex flex-col gap-2 sm:items-end">
					{phase === 'uploadError' && (
						<p role="alert" className="text-sm font-medium text-status-error-strong">
							Upload stopped: {uploaded} of {passed} published. Check your connection and try again.
						</p>
					)}
					<button type="button" className={button} onClick={onUpload} disabled={phase === 'uploading'}>
						{phase === 'uploading' && <Spinner className="h-4 w-4" />}
						{phase === 'uploading'
							? `Uploading ${uploaded} of ${passed}…`
							: phase === 'uploadError'
								? 'Retry upload'
								: `Upload ${passed === 1 ? '1 passed photo' : `${passed} passed photos`} to Panoramax`}
					</button>
				</div>
			);
	}
}

// --- Results grid ----------------------------------------------------------

function PhotoGrid({
	items,
	urls,
	onOpen,
}: {
	items: BatchItem[];
	urls: ReadonlyMap<string, string>;
	onOpen: (id: string) => void;
}) {
	return (
		<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
			{items.map((item, index) => {
				const issues = item.result ? issuesOf(item.result) : [];
				return (
					// Thumbnails rise in one after the other (capped, so big batches don't wait).
					<li
						key={item.id}
						className="motion-safe:animate-rise"
						style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
					>
						<button
							id={`thumb-${item.id}`}
							type="button"
							onClick={() => onOpen(item.id)}
							className="group pnx-hover-border flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white text-left shadow-sm"
						>
							<span className="block aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-slate-900">
								<img
									src={urls.get(item.id)}
									alt=""
									loading="lazy"
									decoding="async"
									className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] group-focus-visible:scale-[1.04] motion-reduce:transition-none"
								/>
							</span>
							<span className="flex flex-1 flex-col gap-1 p-3">
								<span className="block truncate font-mono text-xs font-bold text-pnx-blue" title={pathOf(item.file)}>
									{item.file.name}
								</span>
								{item.result?.passed ? (
									<span className="flex items-center gap-1 text-xs font-semibold text-status-success-strong">
										<CheckIcon className="h-3.5 w-3.5" />
										{item.uploaded ? 'Published' : 'Passed'}
									</span>
								) : (
									<span className="text-xs font-semibold text-status-error-strong">
										{issues.length > 0 ? issues.map((check) => CHECK_INFO[check.type].issue).join(' · ') : 'Rejected'}
									</span>
								)}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

// --- Single photo detail (same blocks as the single photo page) ------------

function PhotoDetail({
	item,
	result,
	url,
	onClose,
}: {
	item: BatchItem;
	result: AnalysisResult;
	url: string | null;
	onClose: () => void;
}) {
	return (
		<>
			<div className="mb-6">
				<button
					type="button"
					onClick={onClose}
					className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-slate-600 transition-colors hover:text-pnx-purple"
				>
					← Back to results
				</button>
				<h1 className="text-center text-2xl font-bold text-pnx-blue sm:text-3xl">Photo details</h1>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Block title="Photo" className="lg:col-span-2">
					<PhotoPreview file={item.file} url={url} result={result} />
				</Block>

				<Block title="Result" className="lg:col-span-3 lg:row-start-2" delay={80}>
					<div className="grid gap-4 md:grid-cols-3">
						<MicroBlock
							label="Analysis status"
							tone="neutral"
							title="Completed"
							icon={<CheckIcon className="h-5 w-5 text-pnx-blue" />}
						>
							<Hint>All checks have been run.</Hint>
						</MicroBlock>
						<IssuesFound result={result} />
						{!result.passed ? (
							<MicroBlock
								label="Publishing permission"
								tone="error"
								title="Not allowed"
								icon={<AlertIcon className="h-5 w-5" />}
							>
								<Hint>Fix the issues and take the photo again.</Hint>
							</MicroBlock>
						) : item.uploaded ? (
							<MicroBlock
								label="Publishing permission"
								tone="success"
								title="Published"
								icon={<CheckIcon className="h-5 w-5" />}
							>
								<Hint>Uploaded to Panoramax.</Hint>
							</MicroBlock>
						) : (
							<MicroBlock label="Publishing permission" tone="success" title={<PerfectPhotoBadge />}>
								<Hint>Allowed: it’s included when you upload the passed photos.</Hint>
							</MicroBlock>
						)}
					</div>
				</Block>

				<Block title="Analysis details" className="lg:col-start-3 lg:row-start-1" delay={160}>
					<AnalysisDetails result={result} />
				</Block>
			</div>
		</>
	);
}
