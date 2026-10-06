import { useEffect, useMemo, useRef, useState } from 'react'

type Mode = 'test' | 'upload'

type Defect = {
	id: string
	label: string
	confidence: number
	box: {
		x: number
		y: number
		width: number
		height: number
	}
}

type ImageMetrics = {
	scale: number
	offsetX: number
	offsetY: number
}

// Temporary image used until the backend supplies a real preview source.
const demoImage =
	'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80'

// This shape mirrors the bounding-box contract expected from the C++ analyzer.
const demoDefects: Defect[] = [
	{
		id: 'blur-1',
		label: 'Blur',
		confidence: 0.94,
		box: { x: 62, y: 78, width: 160, height: 108 },
	},
	{
		id: 'finger-1',
		label: 'Finger over lens',
		confidence: 0.89,
		box: { x: 520, y: 64, width: 128, height: 168 },
	},
]

function percent(value: number) {
	return `${Math.round(value * 100)}%`
}

export default function App() {
	// App-level state keeps the test result available to both the test and upload flows.
	const [mode, setMode] = useState<Mode>('test')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [demoProfile, setDemoProfile] = useState<'defect' | 'clean'>('defect')
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [analysisDone, setAnalysisDone] = useState(false)
	const [published, setPublished] = useState(false)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [imageMetrics, setImageMetrics] = useState<ImageMetrics | null>(null)
	const imageFrameRef = useRef<HTMLDivElement>(null)
	const imageRef = useRef<HTMLImageElement>(null)

	// Object URLs are revoked when the selected file changes to avoid browser memory leaks.
	useEffect(() => {
		if (!selectedFile) {
			setPreviewUrl(null)
			return
		}

		const nextPreviewUrl = URL.createObjectURL(selectedFile)
		setPreviewUrl(nextPreviewUrl)

		return () => URL.revokeObjectURL(nextPreviewUrl)
	}, [selectedFile])

	useEffect(() => {
		const imageFrame = imageFrameRef.current

		if (!imageFrame) {
			return
		}

		function updateImageMetrics() {
			const image = imageRef.current

			if (!image?.naturalWidth || !image.naturalHeight) {
				return
			}

			const frame = imageFrameRef.current?.getBoundingClientRect()

			if (!frame) {
				return
			}

			const scale = Math.min(frame.width / image.naturalWidth, frame.height / image.naturalHeight)
			const renderedWidth = image.naturalWidth * scale
			const renderedHeight = image.naturalHeight * scale

			setImageMetrics({
				scale,
				offsetX: (frame.width - renderedWidth) / 2,
				offsetY: (frame.height - renderedHeight) / 2,
			})
		}

		const resizeObserver = new ResizeObserver(updateImageMetrics)
		resizeObserver.observe(imageFrame)
		updateImageMetrics()

		return () => resizeObserver.disconnect()
	}, [previewUrl])

	function handleImageLoad() {
		const image = imageRef.current

		if (!image || !imageFrameRef.current) {
			return
		}

		const frame = imageFrameRef.current.getBoundingClientRect()
		const scale = Math.min(frame.width / image.naturalWidth, frame.height / image.naturalHeight)

		setImageMetrics({
			scale,
			offsetX: (frame.width - image.naturalWidth * scale) / 2,
			offsetY: (frame.height - image.naturalHeight * scale) / 2,
		})
	}

	const defects = useMemo(
		() => (demoProfile === 'clean' ? [] : demoDefects),
		[demoProfile],
	)

	const qualityScore = demoProfile === 'clean' ? 93 : 64
	const isClean = qualityScore >= 80 && defects.length === 0
	const canUpload = Boolean(selectedFile && analysisDone && isClean)
	const visibleDefects = analysisDone ? defects : []

	// These handlers simulate the future POST requests to the analysis and upload endpoints.
	async function analyzePhoto() {
		if (!selectedFile) {
			return
		}

		setIsAnalyzing(true)
		setAnalysisDone(false)
		await new Promise((resolve) => setTimeout(resolve, 900))
		setIsAnalyzing(false)
		setAnalysisDone(true)
	}

	async function publishPhoto() {
		if (!canUpload) {
			return
		}

		setPublished(false)
		await new Promise((resolve) => setTimeout(resolve, 700))
		setPublished(true)
	}

	return (
		<main className="min-h-screen text-slate-50">
			<section className="grid-overlay absolute inset-0 opacity-40" aria-hidden="true" />

			<div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
				{/* Editorial introduction: the task is clear before the tool begins. */}
				<header className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-14">
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#52716a]">Panoramax - Quality Gate</p>
					<h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#173b36] sm:text-5xl">
						Check your photo quality
					</h1>
					<p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#52716a]">
						Make sure every image is ready to contribute to a free and shared map.
					</p>
				</header>

				{/* Main workspace: the image canvas is primary, with one focused quality inspector beside it. */}
				<div className="mt-6 grid min-w-0 flex-1 gap-6">
					<section className="min-w-0 overflow-hidden rounded-[2rem] border border-[#d7e4dc] bg-white shadow-[0_24px_70px_rgba(23,59,54,0.08)]">
						{/* The stepper keeps the test-to-archive journey explicit. */}
						<div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d7e4dc] px-6 py-4">
							<div className="min-w-0">
								<p className="text-xs uppercase tracking-[0.24em] text-[#52716a]">Workflow</p>
								<h2 className="text-lg font-medium text-[#173b36]">
									{mode === 'test' ? 'Check photo quality' : 'Send to the Panoramax archive'}
								</h2>
							</div>

							<div className="flex max-w-full flex-wrap items-center gap-2 text-sm">
								<button
									onClick={() => setMode('test')}
									aria-current={mode === 'test' ? 'step' : undefined}
									className={`flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition ${
										mode === 'test'
											? 'bg-brand text-slate-950'
											: 'text-[#52716a] hover:bg-[#eef4ef] hover:text-[#173b36]'
									}`}
								>
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-xs font-bold">1</span>
									Check
								</button>

								<span className="h-px w-6 bg-[#d7e4dc]" aria-hidden="true" />

								<button
									onClick={() => canUpload && setMode('upload')}
									disabled={!canUpload}
									aria-current={mode === 'upload' ? 'step' : undefined}
									className={`flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition ${
										mode === 'upload'
											? 'bg-brand text-slate-950'
											: 'text-[#52716a] hover:bg-[#eef4ef] hover:text-[#173b36] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[#52716a]'
									}`}
									title={canUpload ? 'Send the photo to the archive' : 'Analyze a clean photo before uploading'}
								>
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">2</span>
									Send
								</button>
							</div>
						</div>

						<div className="grid items-stretch gap-6 p-4 sm:p-6 xl:grid-cols-[1.25fr_0.75fr]">
							<div className="order-2 flex h-full min-w-0 flex-col rounded-3xl border border-[#d7e4dc] bg-[#f3f7f2] p-5 xl:order-2">
								<div>
									<p className="text-xs uppercase tracking-[0.2em] text-[#52716a]">Quality inspector</p>
									<p className="mt-1 text-sm leading-6 text-[#52716a]">Select an image, review its quality, then publish it when approved.</p>
								</div>

								{mode === 'upload' ? (
									<div className="space-y-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
										<div>
											<p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Ready to publish</p>
											<h3 className="mt-2 text-xl font-semibold text-white">Your photo passed the quality check.</h3>
											<p className="mt-2 break-words text-sm leading-6 text-slate-300">
												{selectedFile?.name} is ready to be sent to the Panoramax archive.
											</p>
										</div>

										<div className="space-y-3 text-sm text-slate-300">
											<Row label="Quality score" value={`${qualityScore}/100`} />
											<Row label="Detected issues" value="None" />
											<Row label="Destination" value="Panoramax archive" />
										</div>

										<div className="flex flex-wrap gap-3">
											<button
												onClick={publishPhoto}
												disabled={!canUpload}
												className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
											>
												Publish to archive
											</button>
											<button
												onClick={() => setMode('test')}
												className="rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
											>
												Back to check
											</button>
										</div>
									</div>
								) : (
									<>
								<label className="block rounded-2xl border border-dashed border-[#b9cfc5] bg-white p-5 transition hover:border-[#0c4b43] hover:bg-[#eef4ef]">
									<input
										id="photo-upload"
										type="file"
										accept="image/*"
										className="sr-only"
										aria-describedby="photo-upload-help"
										onChange={(event) => {
											const file = event.target.files?.[0] ?? null
											setSelectedFile(file)
											setAnalysisDone(false)
											setPublished(false)
										}}
									/>

									<div className="min-w-0 space-y-2">
											<p className="text-sm font-medium text-[#173b36]">
											{selectedFile ? 'Photo selected' : 'Select a photo'}
										</p>
											<p id="photo-upload-help" className="break-words text-sm text-[#52716a]">
											{selectedFile
												? `${selectedFile.name} · start the check when you are ready.`
												: 'JPEG, PNG or WebP. Drag a file here or choose one from your computer.'}
										</p>
										<div className="mt-4 inline-flex max-w-full break-all rounded-full bg-brand px-4 py-2 text-left text-sm font-semibold text-slate-950">
											{selectedFile ? selectedFile.name : 'Choose file'}
										</div>
									</div>
								</label>

								<div className="rounded-2xl border border-[#d7e4dc] bg-white p-5">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
												<p className="text-xs uppercase tracking-[0.24em] text-[#52716a]">Result</p>
												<h3 className="text-base font-semibold text-[#173b36]">Quality analysis</h3>
										</div>
										<span role="status" aria-live="polite" className={`max-w-[45%] shrink-0 break-words rounded-full px-3 py-1 text-right text-xs font-medium ${!selectedFile || !analysisDone ? 'bg-white/10 text-slate-300' : isClean ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
											{!selectedFile ? 'Waiting' : !analysisDone ? 'Ready to analyze' : isClean ? 'OK' : 'Needs attention'}
										</span>
									</div>

									{analysisDone ? (
																<div className="mt-4 space-y-3 text-sm text-[#52716a]">
											<Row label="Blur" value={defects.some((defect) => defect.label === 'Blur') ? 'Detected' : 'None'} />
											<Row label="Smudges / occlusions" value={defects.some((defect) => defect.label === 'Finger over lens') ? 'Detected' : 'None'} />
											<Row label="Low light" value={isClean ? 'None' : 'Needs review'} />
										</div>
									) : (
																<div className="mt-4 rounded-xl border border-dashed border-[#b9cfc5] bg-[#f3f7f2] px-4 py-5 text-sm leading-6 text-[#52716a]">
											{selectedFile ? 'Run the check to receive the analysis engine result.' : 'The check result will appear here after you upload a photo.'}
										</div>
									)}

											<details className="mt-4 rounded-xl border border-[#d7e4dc] bg-[#f8fbf8] px-4 py-3">
												<summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.14em] text-[#52716a]">Developer demo</summary>
										<div className="mt-3 flex flex-wrap gap-2">
											<button
												onClick={() => setDemoProfile('defect')}
												className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
													demoProfile === 'defect'
														? 'bg-rose-400 text-slate-950'
																	: 'bg-[#e8f0e9] text-[#52716a] hover:bg-[#dcebe0]'
												}`}
											>
												Defective case
											</button>
											<button
												onClick={() => setDemoProfile('clean')}
												className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
													demoProfile === 'clean'
														? 'bg-emerald-400 text-slate-950'
																	: 'bg-[#e8f0e9] text-[#52716a] hover:bg-[#dcebe0]'
												}`}
											>
												Clean case
											</button>
										</div>
									</details>

									<div className="mt-5 flex flex-wrap gap-3">
										<button
											onClick={analyzePhoto}
											disabled={!selectedFile || isAnalyzing}
																	className="rounded-xl bg-[#0c4b43] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126257] disabled:cursor-not-allowed disabled:opacity-40"
										>
											{isAnalyzing ? 'Analyzing…' : 'Run check'}
										</button>
									</div>
								</div>
									</>
								)}
							</div>

							<div className="order-1 flex h-full min-w-0 flex-col gap-5 rounded-3xl border border-[#d7e4dc] bg-[#f3f7f2] p-5 xl:order-1">
								<div className="flex min-h-[4.25rem] flex-col justify-between">
									<p className="text-xs uppercase tracking-[0.2em] text-[#52716a]">Image canvas</p>
									<p className="text-sm leading-6 text-[#52716a]">Detected issues appear directly over the photo.</p>
								</div>
								<div ref={imageFrameRef} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
									<div className="relative aspect-[16/10] w-full">
										<img
											ref={imageRef}
											src={previewUrl ?? demoImage}
											alt="Panoramax photo preview"
											onLoad={handleImageLoad}
											className="h-full w-full object-contain"
										/>

										<div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />

										{/* Backend coordinates are rendered as an overlay on top of the image. */}
										{imageMetrics && visibleDefects.map((defect) => (
											<div
												key={defect.id}
												className="absolute rounded-2xl border-2 border-rose-400 bg-rose-400/12 shadow-[0_0_0_1px_rgba(248,113,113,0.15)]"
												style={{
													left: `${imageMetrics.offsetX + defect.box.x * imageMetrics.scale}px`,
													top: `${imageMetrics.offsetY + defect.box.y * imageMetrics.scale}px`,
													width: `${defect.box.width * imageMetrics.scale}px`,
													height: `${defect.box.height * imageMetrics.scale}px`,
												}}
											>
												<div className="-translate-y-full max-w-48 break-words rounded-t-xl bg-rose-400 px-2 py-1 text-[11px] font-semibold leading-tight text-slate-950">
													{defect.label} · {percent(defect.confidence)}
												</div>
											</div>
										))}

										<div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] break-words rounded-full bg-slate-950/80 px-3 py-1 text-xs text-slate-200 backdrop-blur">
											{!selectedFile ? 'Example preview' : !analysisDone ? 'Run the check to see detected issues' : demoProfile === 'clean' ? 'Clean photo ready to upload' : 'Detected issues overlay'}
										</div>
									</div>
								</div>

								</div>
							</div>

						<div className="grid min-w-0 gap-3 border-t border-[#d7e4dc] bg-[#f8fbf8] px-6 py-4 sm:grid-cols-3">
							<Card title="Bounding boxes" value={`${visibleDefects.length}`} hint="C++ detections" />
							<Card title="Decision" value={!selectedFile || !analysisDone ? 'WAITING' : isClean ? 'UPLOAD' : 'BLOCKED'} hint={!selectedFile || !analysisDone ? 'Run analysis' : isClean ? 'Photo approved' : 'Photo rejected'} />
							<Card title="Publishing" value={published ? 'OK' : 'Waiting'} hint="Archive status" />
						</div>
					</section>

				</div>
			</div>
		</main>
	)
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-3">
			<span className="min-w-0 break-words">{label}</span>
			<span className="max-w-[60%] break-words text-right font-medium text-white">{value}</span>
		</div>
	)
}

function Card({ title, value, hint }: { title: string; value: string; hint: string }) {
	return (
			<div className="min-w-0 rounded-xl border border-[#d7e4dc] bg-white p-4">
			<p className="break-words text-[11px] uppercase tracking-[0.12em] text-[#52716a]">{title}</p>
			<p className="mt-2 break-words text-xl font-semibold text-[#173b36] sm:text-2xl">{value}</p>
			<p className="mt-1 break-words text-xs text-[#52716a]">{hint}</p>
		</div>
	)
}
