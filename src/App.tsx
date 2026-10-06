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

function App() {
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

export default App;