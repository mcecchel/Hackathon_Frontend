import { useState } from 'react';
import AppHeader, { type View } from './AppHeader';
import BatchAnalysis from './batch/BatchAnalysis';
import SingleImageAnalysis from './single-image/SingleImageAnalysis';
import './styles.css';

// Icons components
const SingleImageIcon = () => (
  <svg className="w-8 h-8 text-pnx-blue transition-colors duration-300 group-hover:text-pnx-purple group-focus-visible:text-pnx-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-8 h-8 text-pnx-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

// Greyed out: the AI Detector isn't available yet.
const AiIcon = () => (
  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

// Define the services
const services = [
  {
    id: 'single-image',
    title: 'Single Image Analysis',
    description: 'Upload a single photo to detect defects and display error bounding boxes in real-time.',
    icon: <SingleImageIcon />,
    color: 'bg-pnx-blue-light',
    comingSoon: false,
  },
  {
    id: 'batch-folder',
    title: 'Batch Image Analysis',
    description: 'Upload a group of images for a quick batch analysis before final upload.',
    icon: <FolderIcon />,
    color: 'bg-pnx-purple-light',
    comingSoon: false,
  },
  {
    id: 'ai-detect',
    title: 'AI Detector',
    description: 'Use advanced AI models to identify complex patterns and subtle image defects.',
    icon: <AiIcon />,
    color: 'bg-slate-100',
    comingSoon: true,
  },
];

const CARD = 'flex h-full w-full flex-col items-center rounded-xl p-6 text-center';
const ACTIVE_CARD = `${CARD} border border-slate-100 bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]`;
// A reserved slot rather than a card: dashed, no fill, no shadow, greyed out.
const COMING_SOON_CARD = `${CARD} relative border-[1.5px] border-dashed border-slate-300`;

const ClockIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

// --- COMPONENTS ---

// 1. The Home Dashboard
function HomeDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <AppHeader current="home" onNavigate={onNavigate} />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 motion-safe:animate-rise">
          <h1 className="text-4xl md:text-5xl font-extrabold text-pnx-blue mb-6">
            Visual Quality{' '}
            {/* The brand's horizon line draws in under the key word. */}
            <span className="pnx-underline motion-safe:animate-underline">Tools</span>
          </h1>
          <div className="mx-auto max-w-2xl space-y-3 text-base leading-relaxed text-slate-600">
            <p>
              Want to contribute to the world’s largest free and decentralized alternative to Google Street View, but worried your photos might be blurry, dark, or just not good enough?
            </p>
            {/* The key sentence gives the intro a point to land on. */}
            <p className="text-lg font-semibold text-slate-800">Let Panoramoche check them for you.</p>
            <p>
              Panoramoche is your smart quality-control companion for Panoramax. It scans your photos before you upload them, spotting blur, poor lighting, fingers in the frame, and other common issues — so you can fix them before sharing them with the community.
            </p>
            <p>Take better pictures. Contribute better imagery. Help build the open alternative to Street View.</p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ServiceCards
            onSelectService={(id) => {
              if (id === 'single-image' || id === 'batch-folder') onNavigate(id);
            }}
          />
        </div>
      </main>
    </div>
  );
}

function ServiceCards({ onSelectService }: { onSelectService: (id: string) => void }) {
  return services.map((service, index) => {
    const content = (
      <>
        <span className={`${service.color} p-4 rounded-xl mb-4 transition-colors duration-300 ${service.comingSoon ? '' : 'group-hover:bg-pnx-purple-light group-focus-visible:bg-pnx-purple-light'}`}>
          {service.icon}
        </span>
        <span className={`block text-lg font-bold mb-3 ${service.comingSoon ? 'text-slate-500' : 'text-pnx-blue'}`}>
          {service.title}
        </span>
        {service.comingSoon && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <ClockIcon />
            Coming soon
          </span>
        )}
        <span className="block text-sm text-slate-500 leading-relaxed">{service.description}</span>
      </>
    );

    // Cards rise in one after the other, after the hero.
    const entrance = { className: 'motion-safe:animate-rise', style: { animationDelay: `${150 + index * 80}ms` } };

    // Unavailable tools are shown but not interactive, so they don't promise an action.
    return service.comingSoon ? (
      <div key={service.id} className={`${COMING_SOON_CARD} ${entrance.className}`} style={entrance.style}>
        {content}
      </div>
    ) : (
      <button
        key={service.id}
        type="button"
        onClick={() => onSelectService(service.id)}
        style={entrance.style}
        className={`${ACTIVE_CARD} ${entrance.className} group pnx-hover-border cursor-pointer`}
      >
        {content}
      </button>
    );
  });
}

// 2. Main App wrapper to handle navigation
export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  // Each view starts from the top, like a page change.
  const navigate = (view: View) => {
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  if (currentView === 'single-image') {
    return <SingleImageAnalysis onNavigate={navigate} />;
  }

  if (currentView === 'batch-folder') {
    return <BatchAnalysis onNavigate={navigate} />;
  }

  return <HomeDashboard onNavigate={navigate} />;
}
