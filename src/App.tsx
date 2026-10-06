import { useEffect, useMemo, useState } from 'react'

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

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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
    if (!selectedFile || !isClean) {
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
        {/* Action-first introduction: the technical status stays secondary below it. */}
        <header className="glass overflow-hidden rounded-3xl shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-brand">
                <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_12px_rgba(142,230,178,0.75)]" />
                Panoramax • Quality Gate
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Check your photo quality.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Make sure every image is ready to contribute to a free and shared map.
              </p>
            </div>

            <label
              htmlFor="photo-upload"
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              Inizia il controllo
            </label>
          </div>

          <div className="grid gap-4 border-t border-white/8 bg-slate-950/20 px-6 py-4 text-sm text-slate-300 sm:grid-cols-3 lg:px-8">
            <Metric label="Backend" value={apiBaseUrl} />
            <Metric label="Analysis status" value={!selectedFile ? 'Waiting for a photo' : !analysisDone ? isAnalyzing ? 'Analysis in progress' : 'Ready to analyze' : 'Analysis complete'} />
            <Metric label="Quality score" value={analysisDone ? `${qualityScore}/100` : 'Waiting'} accent />
          </div>
        </header>

        {/* Main workspace: image testing on the left, pipeline context on the right. */}
        <div className="mt-6 grid min-w-0 flex-1 gap-6">
          <section className="glass min-w-0 overflow-hidden rounded-3xl">
            {/* The stepper keeps the test-to-archive journey explicit. */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 px-6 py-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workflow</p>
                <h2 className="text-lg font-medium text-white">
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
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-xs font-bold">1</span>
                  Check
                </button>

                <span className="h-px w-6 bg-white/15" aria-hidden="true" />

                <button
                  onClick={() => canUpload && setMode('upload')}
                  disabled={!canUpload}
                  aria-current={mode === 'upload' ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition ${
                    mode === 'upload'
                      ? 'bg-brand text-slate-950'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-slate-300'
                  }`}
                  title={canUpload ? 'Send the photo to the archive' : 'Analyze a clean photo before uploading'}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold">2</span>
                  Send
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="order-2 min-w-0 space-y-5 xl:order-1">
                <label className="block rounded-2xl border border-dashed border-white/15 bg-slate-950/30 p-5 transition hover:border-brand/60 hover:bg-white/5">
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setSelectedFile(file)
                      setAnalysisDone(false)
                      setPublished(false)
                    }}
                  />

                  <div className="min-w-0 space-y-2">
                    <p className="text-sm font-medium text-white">
                      {selectedFile ? 'Photo ready for analysis' : 'Upload a photo'}
                    </p>
                    <p className="break-words text-sm text-slate-400">
                      {selectedFile
                        ? `${selectedFile.name} · start the check when you are ready.`
                        : 'JPEG, PNG or WebP. Drag a file here or choose one from your computer.'}
                    </p>
                    <div className="mt-4 inline-flex max-w-full break-all rounded-full bg-brand px-4 py-2 text-left text-sm font-semibold text-slate-950">
                      {selectedFile ? selectedFile.name : 'Choose file'}
                    </div>
                  </div>
                </label>

                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Result</p>
                      <h3 className="text-base font-semibold text-white">Quality analysis</h3>
                    </div>
                    <span className={`max-w-[45%] shrink-0 break-words rounded-full px-3 py-1 text-right text-xs font-medium ${!selectedFile || !analysisDone ? 'bg-white/10 text-slate-300' : isClean ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                      {!selectedFile ? 'Waiting' : !analysisDone ? 'Ready to analyze' : isClean ? 'OK' : 'Needs attention'}
                    </span>
                  </div>

                  {analysisDone ? (
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <Row label="Blur" value={defects.some((defect) => defect.label === 'Blur') ? 'Detected' : 'None'} />
                      <Row label="Smudges / occlusions" value={defects.some((defect) => defect.label === 'Finger over lens') ? 'Detected' : 'None'} />
                      <Row label="Low light" value={isClean ? 'None' : 'Needs review'} />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-400">
                      {selectedFile ? 'Run the check to receive the analysis engine result.' : 'The check result will appear here after you upload a photo.'}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setDemoProfile('defect')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        demoProfile === 'defect'
                          ? 'bg-rose-400 text-slate-950'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      Defective case
                    </button>
                    <button
                      onClick={() => setDemoProfile('clean')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        demoProfile === 'clean'
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      Clean case
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={analyzePhoto}
                      disabled={!selectedFile || isAnalyzing}
                      className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isAnalyzing ? 'Analyzing…' : 'Run check'}
                    </button>
                    <button
                      onClick={publishPhoto}
                      disabled={!canUpload}
                      className="rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Publish to archive
                    </button>
                  </div>
                </div>
              </div>

              <div className="order-1 min-w-0 space-y-4 xl:order-2">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
                  <div className="relative aspect-[16/10] w-full">
                    <img src={previewUrl ?? demoImage} alt="Panoramax photo preview" className="h-full w-full object-cover" />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />

                    {/* Backend coordinates are rendered as an overlay on top of the image. */}
                    {visibleDefects.map((defect) => (
                      <div
                        key={defect.id}
                        className="absolute rounded-2xl border-2 border-rose-400 bg-rose-400/12 shadow-[0_0_0_1px_rgba(248,113,113,0.15)]"
                        style={{
                          left: `${defect.box.x}px`,
                          top: `${defect.box.y}px`,
                          width: `${defect.box.width}px`,
                          height: `${defect.box.height}px`,
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

                <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                  <Card title="Bounding boxes" value={`${visibleDefects.length}`} hint="C++ detections" />
                  <Card title="Decision" value={!selectedFile || !analysisDone ? 'WAITING' : isClean ? 'UPLOAD' : 'BLOCKED'} hint={!selectedFile || !analysisDone ? 'Run analysis' : isClean ? 'Photo approved' : 'Photo rejected'} />
                  <div className="min-w-0 xl:col-span-2">
                    <Card title="Publishing" value={published ? 'OK' : 'Waiting'} hint="Archive status" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="glass min-w-0 rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pipeline</p>
            <h2 className="mt-2 text-xl font-semibold text-white">End-to-end workflow</h2>

            <div className="mt-5 space-y-4">
              <Step
                index="01"
                title="Upload to backend"
                text="The frontend sends the file to the Express/FastAPI bridge using multipart/form-data."
              />
              <Step
                index="02"
                title="C++ analysis"
                text="The OpenCV engine returns JSON with the issue type, confidence and bounding box."
              />
              <Step
                index="03"
                title="Overlay + decision"
                text="The UI draws the boxes and decides whether to block or publish the photo."
              />
              <Step
                index="04"
                title="Final upload"
                text="If the photo is clean, it is sent to the final Panoramax archive."
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">Ready for integration</p>
              <p className="mt-2 leading-6">
                The project is ready to connect to the backend:
                replace the demo data with the real JSON response from the C++ service.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Metric({ label, value, accent, wide = false }: { label: string; value: string; accent?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-medium ${accent ? 'text-brand' : 'text-white'}`}>{value}</p>
    </div>
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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <p className="break-words text-[11px] uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <p className="mt-2 break-words text-xl font-semibold text-white sm:text-2xl">{value}</p>
      <p className="mt-1 break-words text-xs text-slate-400">{hint}</p>
    </div>
  )
}

function Step({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-bold text-slate-950">
        {index}
      </div>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
      </div>
    </div>
  )
}