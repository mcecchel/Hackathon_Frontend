import React, { useState } from 'react';
import './styles.css';

// Icons components
const SingleImageIcon = () => (
  <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const AiIcon = () => (
  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    color: 'bg-blue-100',
  },
  {
    id: 'batch-folder',
    title: 'Batch Image Analysis',
    description: 'Upload a group of images for a quick batch analysis before final upload.',
    icon: <FolderIcon />,
    color: 'bg-green-100',
  },
  {
    id: 'ai-detect',
    title: 'AI Detector',
    description: 'Use advanced AI models to identify complex patterns and subtle image defects.',
    icon: <AiIcon />,
    color: 'bg-red-100',
  },
];

// Mock data to simulate the Panoramax Database / Local Queue
const MOCK_QUEUE = [
  { id: '1', name: 'IMG_20261006_001.jpg', status: 'pending' },
  { id: '2', name: 'IMG_20261006_002.jpg', status: 'pending' },
  { id: '3', name: 'IMG_20261006_003.jpg', status: 'pending' },
];

// Mock defects returned from the C++ Backend
const MOCK_DEFECTS = [
  { id: 'd1', type: 'blur', confidence: 0.92, x: 15, y: 20, w: 25, h: 30 },
  { id: 'd2', type: 'dark', confidence: 0.87, x: 55, y: 60, w: 15, h: 20 },
];

// --- COMPONENTS ---

// 1. The Home Dashboard (what you had before)
function HomeDashboard({ onSelectService }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Single Analysis', 'Batch Analysis', 'Integrations'];

  const filteredServices = activeCategory === 'All' 
    ? services 
    : services.filter(service => {
        if (activeCategory === 'Single Analysis') return service.id === 'single-image';
        if (activeCategory === 'Batch Analysis') return service.id === 'batch-folder';
        if (activeCategory === 'Integrations') return service.id === 'ai-detect';
        return true;
    });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600 tracking-tight">Panoramoche</span>
          </div>
          <nav className="hidden md:flex space-x-8">
             <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Tools</a>
             <a href="#" className="text-gray-600 hover:text-blue-600 font-medium">Project</a>
          </nav>
          <div className="flex items-center gap-4">
             <button className="text-gray-600 hover:text-blue-600 font-medium">Log in</button>
             <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium transition-colors">Sign up</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Visual Quality Tools for Panoramax
          </h1>
          <p className="text-xl text-gray-600">
            Our goal is to contribute to real open-source projects used by millions of people, creating decentralized alternatives to tech giants (GAFAM). Our team chose to work on OpenStreetMap: Panoramax, the free alternative to Google Street View.
          </p>
        </div>

        {/* Categories / Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === category
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div 
              key={service.id}
              onClick={() => onSelectService(service.id)}
              className="bg-white rounded-xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col items-center text-center group cursor-pointer"
            >
              <div className={`${service.color} p-4 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {service.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{service.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// 2. The Inspector Tool (The new UI)
function InspectorTool({ onBack }) {
  const [activeImageId, setActiveImageId] = React.useState(MOCK_QUEUE[0].id);
  const [isScanning, setIsScanning] = React.useState(false);
  const [defects, setDefects] = React.useState([]);
  const [logs, setLogs] = React.useState([]);

  const triggerAnalysis = (imageId) => {
    setIsScanning(true);
    setDefects([]);
    setLogs([
      `> Initializing C++ engine for ${imageId}...`,
      `> [INFO] Loading image matrix...`,
      `> [WARN] Extracting EXIF data...`
    ]);

    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        `> [SUCCESS] Image loaded. Resolving 4000x3000px`,
        `> Running blur_detector.cpp...`,
        `> Found 1 artifact (blur) - confidence 92%`,
        `> Running exposure_check.cpp...`,
        `> Found 1 artifact (dark) - confidence 87%`,
        `> [DONE] JSON response generated.`
      ]);
      setDefects(MOCK_DEFECTS);
      setIsScanning(false);
    }, 1500);
  };

  React.useEffect(() => {
    triggerAnalysis(activeImageId);
  }, [activeImageId]);

  const getBBoxColorClass = (type) => {
    switch(type) {
      case 'blur': return 'border-[#f43f5e] text-[#f43f5e]';
      case 'dark': return 'border-[#0ea5e9] text-[#0ea5e9]';
      case 'finger': return 'border-[#eab308] text-[#eab308]';
      default: return 'border-[#ef4444] text-[#ef4444]';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1F419B] to-[#A92FB4] text-white shadow-md h-14 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="hover:text-white/80 transition-colors mr-2">
            ← Back
          </button>
          <span className="font-bold text-xl tracking-tight">Panoramoche</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Inspection Tool</span>
        </div>
      </header>

      {/* Split-pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex-1 overflow-y-auto">
            <h2 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest flex justify-between items-center">
              Inspection Queue
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{MOCK_QUEUE.length}</span>
            </h2>
            <div className="space-y-1">
              {MOCK_QUEUE.map(img => (
                <div 
                  key={img.id}
                  onClick={() => setActiveImageId(img.id)}
                  className={`p-2.5 rounded cursor-pointer text-sm font-medium truncate transition-colors ${
                    activeImageId === img.id 
                      ? 'bg-[#fdf4ff] border-l-4 border-[#A92FB4] text-[#1F419B]' 
                      : 'hover:bg-slate-50 text-slate-600 border-l-4 border-transparent'
                  }`}
                >
                  {img.name}
                </div>
              ))}
            </div>
          </div>

          <div className="h-64 bg-slate-900 p-4 overflow-y-auto shrink-0 flex flex-col">
            <div className="text-[10px] text-slate-400 mb-3 uppercase tracking-widest font-sans font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Backend Logs
            </div>
            <div className="text-emerald-400 font-mono text-xs flex-1 space-y-1.5 leading-relaxed">
              {logs.map((log, idx) => (
                 <div key={idx} className="opacity-90">{log}</div>
              ))}
              {isScanning && <div className="animate-pulse">_</div>}
            </div>
          </div>
        </div>

        {/* Right Area */}
        <div className="flex-1 bg-slate-200 flex flex-col overflow-hidden relative">
           
           <div className="h-14 bg-white/90 backdrop-blur-sm border-b border-slate-300 flex items-center justify-between px-6 shrink-0 z-10 absolute top-0 w-full shadow-sm">
              <div className="text-sm text-slate-600 font-medium flex items-center gap-2">
                File: <span className="font-mono text-[#1F419B] font-bold px-2 py-1 bg-slate-100 rounded">IMG_20261006_{activeImageId.padStart(3, '0')}.jpg</span>
              </div>
              <div className="flex items-center gap-3">
                 <button className="bg-white border border-[#ef4444] text-[#ef4444] hover:bg-red-50 transition-colors px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm">
                   Reject <kbd className="bg-slate-100 border border-slate-300 rounded px-1.5 font-mono text-xs text-slate-600 shadow-sm">X</kbd>
                 </button>
                 <button className="bg-[#10b981] hover:bg-emerald-600 transition-colors text-white px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 shadow-sm border border-transparent">
                   Approve <kbd className="bg-white/20 border border-white/30 rounded px-1.5 font-mono text-xs text-white shadow-sm">Space</kbd>
                 </button>
                 <div className="w-px h-6 bg-slate-300 mx-1"></div>
                 <button className="bg-[#1F419B] hover:bg-[#1a3682] transition-colors text-white px-4 py-1.5 rounded-md text-sm font-semibold shadow-sm">
                   Upload to Panoramax
                 </button>
              </div>
           </div>

           <div className="flex-1 flex items-center justify-center p-8 pt-20 overflow-auto relative">
              <div className="relative bg-white shadow-lg ring-1 ring-slate-200 transition-opacity duration-300">
                 <img 
                   src={`https://picsum.photos/seed/${activeImageId}/1200/800`} 
                   alt="Inspection" 
                   className={`max-w-full max-h-[80vh] object-contain ${isScanning ? 'opacity-50 blur-sm' : 'opacity-100'} transition-all duration-300`}
                 />

                 {isScanning && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 z-20">
                      <svg className="animate-spin h-10 w-10 mb-4 text-[#1F419B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-mono font-bold tracking-widest uppercase bg-white/80 px-4 py-2 rounded shadow-sm">Scanning...</span>
                   </div>
                 )}

                 {!isScanning && defects.map(defect => {
                    const colorClass = getBBoxColorClass(defect.type);
                    return (
                      <div 
                        key={defect.id}
                        className={`absolute border-2 ${colorClass.split(' ')[0]} bg-black/5 group cursor-crosshair`}
                        style={{
                          top: `${defect.y}%`,
                          left: `${defect.x}%`,
                          width: `${defect.w}%`,
                          height: `${defect.h}%`,
                        }}
                      >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] uppercase font-bold font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 shadow-lg flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full bg-current ${colorClass.split(' ')[1]}`}></span>
                            {defect.type} ({(defect.confidence * 100).toFixed(0)}%)
                         </div>
                      </div>
                    )
                 })}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}

// 3. Main App wrapper to handle navigation
export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'inspector'

  if (currentView === 'inspector') {
    return <InspectorTool onBack={() => setCurrentView('home')} />;
  }

  return <HomeDashboard onSelectService={(id) => {
    if (id === 'single-image') {
      setCurrentView('inspector');
    }
  }} />;
}