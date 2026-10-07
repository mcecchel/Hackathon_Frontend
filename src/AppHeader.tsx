export type View = 'home' | 'single-image' | 'batch-folder';

const TOOLS = [
	{ view: 'single-image', label: 'Single photo', short: 'Single' },
	{ view: 'batch-folder', label: 'Batch', short: 'Batch' },
] as const;

// Shared top bar: the name always sits in the same place and leads home,
// every tool is one click away and the current one is highlighted.
export default function AppHeader({
	current,
	onNavigate,
	locked = false,
}: {
	current: View;
	onNavigate: (view: View) => void;
	/** Disables navigation while an analysis or upload is running. */
	locked?: boolean;
}) {
	return (
		<header className="sticky top-0 z-20 bg-pnx-blue text-white shadow-sm">
			<div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
				<button
					type="button"
					onClick={() => onNavigate('home')}
					disabled={locked}
					aria-current={current === 'home' ? 'page' : undefined}
					// The default purple focus ring is barely visible on the blue bar.
					className="-ml-1 inline-flex min-h-11 items-center rounded-md px-1 text-xl font-bold tracking-tight focus-visible:outline-white enabled:hover:underline enabled:hover:decoration-2 enabled:hover:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
				>
					Panoramoche
				</button>

				<nav aria-label="Tools" className="ml-auto flex items-center gap-1">
					{TOOLS.map((tool) => {
						const active = current === tool.view;
						return (
							<button
								key={tool.view}
								type="button"
								onClick={() => onNavigate(tool.view)}
								disabled={locked}
								aria-current={active ? 'page' : undefined}
								className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 ${
									active ? 'bg-white text-pnx-blue' : 'text-white/80 enabled:hover:bg-white/10 enabled:hover:text-white'
								}`}
							>
								<span className="sm:hidden">{tool.short}</span>
								<span className="hidden sm:inline">{tool.label}</span>
							</button>
						);
					})}
					{/* Not available yet: shown switched off, like its card on the home page. */}
					<span className="hidden items-center gap-1.5 px-3 text-sm font-semibold text-white/55 sm:inline-flex">
						AI Detector
						<span className="rounded-full border border-white/35 px-1.5 text-[10px] font-bold uppercase tracking-wide">
							Soon
						</span>
					</span>
				</nav>
			</div>
			{/* Horizon line: the brand gradient as a thin accent. */}
			<div aria-hidden="true" className="h-[3px] bg-pnx-line" />
		</header>
	);
}
