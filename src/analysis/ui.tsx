// Building blocks shared by the single photo and batch analysis pages.
import { useEffect, useState, type ReactNode } from 'react';
import type { AnalysisResult, Defect, DefectType } from './api';

// --- Checks ----------------------------------------------------------------

export const CHECK_INFO: Record<
	DefectType,
	{ name: string; ok: string; issue: string; description: string; border: string; fill: string }
> = {
	blur: {
		name: 'Sharpness',
		ok: 'Sharp',
		issue: 'Blurred',
		description: 'The photo is out of focus or shaken.',
		border: 'border-bbox-blur',
		fill: 'bg-bbox-blur',
	},
	dark: {
		name: 'Exposure',
		ok: 'Well exposed',
		issue: 'Too dark',
		description: 'Underexposed areas hide details.',
		border: 'border-bbox-dark',
		fill: 'bg-bbox-dark',
	},
	finger: {
		name: 'Lens obstruction',
		ok: 'Clear',
		issue: 'Finger in frame',
		description: 'Something is covering part of the lens.',
		border: 'border-bbox-finger',
		fill: 'bg-bbox-finger',
	},
};

/** Checks shown as placeholders before the engine returns its JSON. */
export const CHECK_ORDER: DefectType[] = ['blur', 'dark', 'finger'];

export const issuesOf = (result: AnalysisResult) => result.checks.filter((check) => check.detected);

// --- Files -----------------------------------------------------------------

export function isJpeg(file: File): boolean {
	return file.type === 'image/jpeg' || (file.type === '' && /\.jpe?g$/i.test(file.name));
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Object URL for a local file, revoked when the file changes or the component unmounts. */
export function useObjectUrl(file: File | null): string | null {
	const [entry, setEntry] = useState<{ file: File; url: string } | null>(null);

	useEffect(() => {
		if (!file) return;
		const url = URL.createObjectURL(file);
		setEntry({ file, url });
		return () => URL.revokeObjectURL(url);
	}, [file]);

	return entry && entry.file === file ? entry.url : null;
}

// --- Layout ----------------------------------------------------------------

const BUTTON =
	'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';
export const PRIMARY = `${BUTTON} w-full px-4 py-3 text-sm bg-pnx-blue text-white shadow-pnx-glow enabled:hover:bg-pnx-blue-hover`;
export const SMALL_SECONDARY = `${BUTTON} px-3 py-1.5 text-sm border border-slate-300 bg-white text-slate-700 enabled:hover:border-pnx-blue/40 enabled:hover:bg-pnx-blue-light enabled:hover:text-pnx-blue`;

/** Card section with a small uppercase title. It rises in when it appears, after `delay` ms. */
export function Block({
	title,
	action,
	className = '',
	delay = 0,
	children,
}: {
	title: string;
	action?: ReactNode;
	className?: string;
	delay?: number;
	children: ReactNode;
}) {
	return (
		<section
			style={{ animationDelay: `${delay}ms` }}
			className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-pnx-soft motion-safe:animate-rise ${className}`}
		>
			<header className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
				<h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h2>
				{action}
			</header>
			<div className="flex-1 p-4">{children}</div>
		</section>
	);
}

// --- Photo -----------------------------------------------------------------

export function PhotoPreview({
	file,
	url,
	analyzing = false,
	result = null,
}: {
	file: File;
	url: string | null;
	analyzing?: boolean;
	result?: AnalysisResult | null;
}) {
	const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
	const issueTypes = result ? issuesOf(result).map((check) => check.type) : [];

	return (
		<figure>
			<div className="relative overflow-hidden rounded-xl bg-slate-900">
				<div className="flex min-h-64 items-center justify-center p-2 sm:p-4">
					{url && brokenUrl !== url ? (
						<div className="relative max-w-full">
							<img
								src={url}
								alt={`Preview of ${file.name}`}
								onError={() => setBrokenUrl(url)}
								className={`block h-auto max-h-[45vh] w-auto max-w-full transition duration-300 sm:max-h-[55vh] lg:max-h-[60vh] ${
									analyzing ? 'scale-[1.01] opacity-50 blur-sm' : ''
								}`}
							/>
							{result &&
								!result.passed &&
								result.defects.map((defect) => (
									<DefectBox key={defect.id} defect={defect} number={issueTypes.indexOf(defect.type) + 1} />
								))}
						</div>
					) : url ? (
						<p className="px-6 py-16 text-center text-sm text-slate-300">
							Preview not available for this file. You can still run the analysis.
						</p>
					) : (
						<div className="h-64 w-full animate-pulse rounded-lg bg-slate-800" />
					)}
				</div>

				{analyzing && (
					<div
						aria-hidden="true"
						className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/30"
					>
						<Spinner className="h-10 w-10 text-pnx-purple" />
						<span className="rounded-md bg-white/90 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-pnx-blue shadow-sm">
							Analyzing…
						</span>
					</div>
				)}
			</div>

			<figcaption className="mt-3 flex items-center gap-2 text-sm">
				<PhotoIcon className="h-4 w-4 shrink-0 text-pnx-blue" />
				<span className="truncate font-mono font-bold text-pnx-blue" title={file.webkitRelativePath || file.name}>
					{file.name}
				</span>
				<span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
			</figcaption>
		</figure>
	);
}

function DefectBox({ defect, number }: { defect: Defect; number: number }) {
	const info = CHECK_INFO[defect.type];
	return (
		<div
			className={`absolute border-2 ${info.border} bg-black/10`}
			style={{ left: `${defect.box.x}%`, top: `${defect.box.y}%`, width: `${defect.box.w}%`, height: `${defect.box.h}%` }}
		>
			<span
				className={`absolute left-0 top-0 whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-900 ${info.fill}`}
			>
				{number}
				{/* On narrow screens the number alone matches the issue list; full labels would overflow small boxes. */}
				<span className="hidden sm:inline"> · {info.issue}</span>
			</span>
		</div>
	);
}

// --- Analysis details (specs from the engine JSON) -------------------------

export function AnalysisDetails({
	result,
	analyzing = false,
	unavailable = false,
}: {
	result: AnalysisResult | null;
	analyzing?: boolean;
	unavailable?: boolean;
}) {
	const types = result ? result.checks.map((check) => check.type) : CHECK_ORDER;

	return (
		<dl className="-my-3 divide-y divide-slate-100">
			{types.map((type) => {
				const info = CHECK_INFO[type];
				const check = result?.checks.find((c) => c.type === type);
				return (
					<div key={type} className="flex items-center justify-between gap-4 py-3">
						<dt className="text-sm text-slate-600">{info.name}</dt>
						<dd className="text-right text-sm">
							{check ? (
								check.detected ? (
									<>
										<span className="block font-semibold text-status-error-strong">{info.issue}</span>
										<span className="block text-xs text-slate-500">
											{Math.round(check.score * 100)}% confidence
										</span>
									</>
								) : (
									<span className="flex items-center justify-end gap-1 font-semibold text-status-success-strong">
										<CheckIcon className="h-4 w-4" />
										{info.ok}
									</span>
								)
							) : analyzing ? (
								<span className="animate-pulse text-slate-400">Analyzing…</span>
							) : (
								<span className="text-slate-400">{unavailable ? 'Unavailable' : '—'}</span>
							)}
						</dd>
					</div>
				);
			})}
		</dl>
	);
}

// --- Result micro-blocks ---------------------------------------------------

const TONES = {
	neutral: { box: 'border-slate-200 bg-slate-50', title: 'text-slate-900' },
	success: { box: 'border-status-success/40 bg-status-success/10', title: 'text-status-success-strong' },
	error: { box: 'border-status-error/40 bg-status-error/10', title: 'text-status-error-strong' },
	warning: { box: 'border-status-warning/50 bg-status-warning/10', title: 'text-status-warning-strong' },
} as const;

export function MicroBlock({
	label,
	tone,
	title,
	icon,
	children,
}: {
	label: string;
	tone: keyof typeof TONES;
	title: ReactNode;
	icon?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div className={`flex flex-col gap-2 rounded-xl border p-4 ${TONES[tone].box}`}>
			<h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</h3>
			<p className={`flex items-center gap-2 text-lg font-bold ${TONES[tone].title}`}>
				{icon}
				{title}
			</p>
			{children}
		</div>
	);
}

export const Hint = ({ children }: { children: ReactNode }) => <p className="text-sm text-slate-600">{children}</p>;

export function IssuesFound({ result }: { result: AnalysisResult | null }) {
	const label = 'Issues found';

	if (!result) {
		return (
			<MicroBlock label={label} tone="neutral" title="—">
				<Hint>Shown after the analysis.</Hint>
			</MicroBlock>
		);
	}

	if (result.passed) {
		return (
			<MicroBlock label={label} tone="success" title="No issues found" icon={<CheckIcon className="h-5 w-5" />}>
				<Hint>Sharpness, exposure and framing look good.</Hint>
			</MicroBlock>
		);
	}

	const issues = issuesOf(result);
	return (
		<MicroBlock
			label={label}
			tone="error"
			title={issues.length === 1 ? '1 issue found' : `${issues.length} issues found`}
			icon={<AlertIcon className="h-5 w-5" />}
		>
			{issues.length === 0 ? (
				<Hint>The photo didn’t pass the quality check.</Hint>
			) : (
				<ol className="space-y-2">
					{issues.map((check, index) => {
						const info = CHECK_INFO[check.type];
						return (
							<li key={check.type} className="flex gap-2 text-sm">
								<span
									className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold text-slate-900 ${info.fill}`}
								>
									{index + 1}
								</span>
								<span>
									<span className="font-semibold text-slate-900">{info.issue}</span>
									<span className="text-slate-600"> — {info.description}</span>
								</span>
							</li>
						);
					})}
				</ol>
			)}
		</MicroBlock>
	);
}

export function PerfectPhotoBadge() {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-strong px-3 py-1 text-sm font-semibold text-white motion-safe:animate-pop">
			<CheckIcon className="h-4 w-4" />
			Perfect photo
		</span>
	);
}

/** Counts up to `value` when it appears (shows the final value right away with reduced motion). */
export function CountUp({ value }: { value: number }) {
	const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));

	useEffect(() => {
		if (prefersReducedMotion()) {
			setShown(value);
			return;
		}
		const start = performance.now();
		let frame = 0;
		const step = (now: number) => {
			const progress = Math.min(1, (now - start) / 900);
			setShown(Math.round(value * (1 - (1 - progress) ** 3)));
			if (progress < 1) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	}, [value]);

	return <>{shown}</>;
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Icons -----------------------------------------------------------------

export function Spinner({ className = '' }: { className?: string }) {
	return (
		<svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
			<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	);
}

export function PhotoIcon({ className = '' }: { className?: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
	);
}

export function FolderIcon({ className = '' }: { className?: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
			/>
		</svg>
	);
}

export function CheckIcon({ className = '' }: { className?: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	);
}

export function AlertIcon({ className = '' }: { className?: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
		</svg>
	);
}
