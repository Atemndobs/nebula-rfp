import React from 'react';
import { AuthButtons } from './AuthButtons';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-purple-500/30">

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse-slower"></div>
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik00MCAwTDTAIDQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4=')] opacity-20"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex flex-col">

                {/* Header / Nav */}
                <header className="py-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Nebula Logix
                        </span>
                    </div>
                    {/* Top Auth Button (Optional, can just rely on main CTA) */}
                    <div className="hidden sm:block">
                        <AuthButtons />
                    </div>
                </header>

                {/* Main Content Split */}
                <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 py-12">

                    {/* Left Column: Hero Text */}
                    <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            AI-Powered Pursuit System
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                            <span className="block text-white">Win More</span>
                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 animate-gradient-x">
                                Public Contracts
                            </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
                            Transform RFP discovery into a science. Automate ingestion, eligibility gating, and scoring to focus only on what you can win.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <div className="scale-110 origin-left">
                                <AuthButtons />
                            </div>
                        </div>

                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500">
                            <div>
                                <span className="block text-xl font-bold text-white">500+</span>
                                <span>Live RFPs</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div>
                                <span className="block text-xl font-bold text-white">6-Dim</span>
                                <span>Scoring</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div>
                                <span className="block text-xl font-bold text-white">100%</span>
                                <span>Automated</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Feature Cards (Glass) */}
                    <div className="flex-1 w-full max-w-md lg:max-w-xl">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Card 1 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black/50">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-semibold mb-2">Smart Discovery</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Auto-ingest from SAM.gov, eMMA, and RFPMart. We find the needle in the haystack.
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black/50 mt-8">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-semibold mb-2">Eligibility Gate</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Instantly disqualify bad fits with 7 hard filters before you even read them.
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black/50">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-semibold mb-2">AI Scoring</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    6-dimensional scoring analysis to find your perfect project match.
                                </p>
                            </div>

                            {/* Card 4 */}
                            <div className="group p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-1 shadow-2xl shadow-black/50 mt-8">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-semibold mb-2">Auto-Briefs</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
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

            {/* Global CSS style for custom animations if not in tailwind config */}
            <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes pulse-slower {
            0%, 100% { opacity: 0.1; transform: scale(1) translate(0, 0); }
            50% { opacity: 0.2; transform: scale(1.2) translate(-20px, 20px); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        .animate-pulse-slower {
            animation: pulse-slower 12s infinite ease-in-out;
        }
        .animate-gradient-x {
           background-size: 200% 200%;
           animation: gradient-x 6s ease infinite;
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
