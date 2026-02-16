import React from 'react';
import { AuthButtons } from './AuthButtons';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-white/20">

            {/* Background Ambience - Monochrome */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px] animate-pulse-slower"></div>
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-white/[0.02] rounded-full blur-[100px]"></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik00MCAwTDTAIDQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4=')] opacity-20"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex flex-col">

                {/* Header / Nav */}
                <header className="py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {/* Logo - Inverted to white for black background */}
                        <img
                            src="/nebula-logo.png"
                            alt="Nebula Logix"
                            className="h-8 w-auto brightness-0 invert opacity-90"
                        />
                        <div className="w-px h-6 bg-white/20"></div>
                        <span className="font-medium text-lg tracking-tight text-white/90">
                            RFP Discovery
                        </span>
                    </div>
                    {/* Top Auth Button */}
                    <div className="hidden sm:block">
                        <AuthButtons />
                    </div>
                </header>

                {/* Main Content Split */}
                <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 py-12">

                    {/* Left Column: Hero Text */}
                    <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            AI-Powered Pursuit System
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                            <span className="block text-white">Win More</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500 pb-2">
                                Public Contracts
                            </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0 font-light">
                            Transform RFP discovery into a science. Automate ingestion, eligibility gating, and scoring to focus only on what you can win.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <div className="scale-110 origin-left">
                                <AuthButtons />
                            </div>
                        </div>

                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500">
                            <div className="group hover:text-white transition-colors cursor-default">
                                <span className="block text-xl font-bold text-white group-hover:scale-105 transition-transform">500+</span>
                                <span>Live RFPs</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="group hover:text-white transition-colors cursor-default">
                                <span className="block text-xl font-bold text-white group-hover:scale-105 transition-transform">6-Dim</span>
                                <span>Scoring</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="group hover:text-white transition-colors cursor-default">
                                <span className="block text-xl font-bold text-white group-hover:scale-105 transition-transform">100%</span>
                                <span>Automated</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Feature Cards (Monochrome Glass) */}
                    <div className="flex-1 w-full max-w-md lg:max-w-xl">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Card 1 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white/10 transition-all">
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-medium mb-2">Smart Discovery</h3>
                                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                                    Auto-ingest from SAM.gov & RFPMart. Find the needle in the haystack.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black mt-8">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white/10 transition-all">
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-medium mb-2">Eligibility Gate</h3>
                                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                                    Instantly disqualify bad fits with 7 hard filters before you even read them.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white/10 transition-all">
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-medium mb-2">AI Scoring</h3>
                                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                                    6-dimensional scoring analysis to find your perfect project match.
                                </p>
                            </div>

                            {/* Card 4 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black mt-8">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white/10 transition-all">
                                    <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-medium mb-2">Auto-Briefs</h3>
                                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                                    Generate comprehensive pursuit briefs in one click to kickstart your proposal.
                                </p>
                            </div>

                        </div>
                    </div>

                </main>

                <footer className="py-6 text-center text-xs text-gray-600">
                    &copy; {new Date().getFullYear()} Nebula Logix. All rights reserved. System V3.0
                </footer>

            </div>

            {/* Global CSS style for custom animations */}
            <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.1); }
        }
        @keyframes pulse-slower {
            0%, 100% { opacity: 0.05; transform: scale(1) translate(0, 0); }
            50% { opacity: 0.15; transform: scale(1.2) translate(-20px, 20px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        .animate-pulse-slower {
            animation: pulse-slower 12s infinite ease-in-out;
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
