import React, { useState, useMemo } from 'react';
import { VideoStyle, ProductDetails, Script } from './types';
import * as geminiService from './services/geminiService';
import { UploadIcon, SparklesIcon, DownloadIcon, LightbulbIcon, GoogleIcon, Bars3Icon, ChevronDownIcon, XMarkIcon, DevicePhoneMobileIcon, UserGroupIcon } from './components/icons';

// --- Helper Functions & Constants ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const GENERATION_MESSAGES = [
    "Analyzing market data...", "Writing a high-conversion script...", "Generating engaging scenes...", "Optimizing for social media...", "Rendering final video..."
];

// --- Sub-Components ---

const MultiImageUploader: React.FC<{ onFilesSelect: (files: File[]) => void; files: File[] }> = ({ onFilesSelect, files }) => {
    const previews = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onFilesSelect(Array.from(e.target.files));
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">1. Upload Product Images</label>
            <div className="relative flex flex-col justify-center items-center w-full min-h-[12rem] bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 hover:border-cyan-500 transition-colors duration-300 p-4">
                {previews.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {previews.map((src, index) => (
                            <img key={index} src={src} alt={`Preview ${index}`} className="w-full h-20 object-cover rounded-md" />
                        ))}
                    </div>
                ) : (
                    <div className="text-center">
                        <UploadIcon className="mx-auto h-12 w-12 text-slate-500" />
                        <p className="mt-2 text-sm text-slate-400"><span className="font-semibold text-cyan-400">Click to upload</span></p>
                        <p className="text-xs text-slate-500">All image formats supported</p>
                    </div>
                )}
                 <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
            </div>
        </div>
    );
};

const InputField: React.FC<{ label: string, value: string, onChange: (val: string) => void, placeholder: string, isTextarea?: boolean }> = ({ label, value, onChange, placeholder, isTextarea }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        {isTextarea ? (
             <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
        ) : (
             <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 outline-none transition-all" />
        )}
    </div>
);

const SuggestionList: React.FC<{ suggestions: string[], onSelect: (suggestion: string) => void, selected: string | null }> = ({ suggestions, onSelect, selected }) => (
    <div className="space-y-3">
         <h3 className="text-sm font-medium text-slate-300 mb-2">3. Choose a Video Type (AI Suggestions)</h3>
        {suggestions.map((s, i) => (
            <button key={i} onClick={() => onSelect(s)} className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${selected === s ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-slate-800/50 border-slate-600 hover:border-slate-500 text-slate-300'}`}>
                <div className="flex items-center gap-3">
                    <LightbulbIcon className={`w-5 h-5 ${selected === s ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{s}</span>
                </div>
            </button>
        ))}
    </div>
);

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 min-h-[400px]">
        <SparklesIcon className="h-16 w-16 text-cyan-300 animate-pulse" />
        <p className="mt-6 text-lg font-semibold text-white">{message}</p>
        <p className="mt-2 text-sm text-slate-400">This may take a few minutes for video generation.</p>
    </div>
);

const VideoPreview: React.FC<{ src: string; onRestart: () => void }> = ({ src, onRestart }) => (
    <div className="w-full h-full flex flex-col gap-6 items-center">
        <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-cyan-400">Your Video is Ready!</h2>
        <div className="relative aspect-video w-full max-w-2xl bg-black rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/10">
            <video src={src} className="w-full h-full" controls autoPlay loop muted />
        </div>
        <div className="flex gap-4 w-full max-w-2xl">
            <a href={src} download="ecommerce-video.mp4" className="flex-1 text-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-transform duration-200 hover:scale-105 flex items-center">
                <DownloadIcon className="w-5 h-5" /> Download
            </a>
            <button onClick={onRestart} className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-transform duration-200 hover:scale-105">
                Create Another
            </button>
        </div>
    </div>
);

// --- Core App Components ---

const VideoGenerator: React.FC = () => {
    const [step, setStep] = useState(1);
    const [productImages, setProductImages] = useState<File[]>([]);
    const [productName, setProductName] = useState("");
    const [videoIdea, setVideoIdea] = useState("");
    const [suggestedAdTypes, setSuggestedAdTypes] = useState<string[]>([]);
    const [selectedAdType, setSelectedAdType] = useState<string | null>(null);
    const [videoStyle, setVideoStyle] = useState<VideoStyle>(VideoStyle.MODERN);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (productImages.length === 0 || !productName) {
            setError("Please upload images and provide a product name.");
            return;
        }
        setError(null);
        setIsProcessing(true);
        setLoadingMessage("Analyzing your product...");
        try {
            const suggestions = await geminiService.analyzeAndSuggest(productImages, productName);
            setSuggestedAdTypes(suggestions);
            if (suggestions.length > 0) setSelectedAdType(suggestions[0]);
            setStep(2);
        } catch (e: any) {
            setError(`Analysis failed: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedAdType) {
            setError("Please select a video type.");
            return;
        }
        setError(null);
        setIsProcessing(true);
        setStep(3);
        const details: ProductDetails = { productName, videoIdea, selectedAdType, videoStyle };
        try {
            setLoadingMessage(GENERATION_MESSAGES[0]);
            const script: Script = await geminiService.generateScript(productImages, details);
            setLoadingMessage(GENERATION_MESSAGES[1]);
            let operation: any = await geminiService.generateVideo(productImages[0], script, details);
            let msgIndex = 2;
            const interval = setInterval(() => {
                setLoadingMessage(GENERATION_MESSAGES[msgIndex % GENERATION_MESSAGES.length]);
                msgIndex++;
            }, 7000);
            while (!operation.done) {
                await delay(10000);
                operation = await geminiService.checkVideoStatus(operation);
            }
            clearInterval(interval);
            setLoadingMessage(GENERATION_MESSAGES[GENERATION_MESSAGES.length - 1]);
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink && process.env.API_KEY) {
                const fullUrl = `${downloadLink}&key=${process.env.API_KEY}`;
                const response = await fetch(fullUrl);
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setGeneratedVideoUrl(objectUrl);
                setStep(4);
            } else {
                throw new Error("Video generation failed to return a valid link.");
            }
        } catch (e: any) {
            setError(`Generation failed: ${e.message}`);
            setStep(2);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const resetForNewVideo = () => {
        setProductImages([]);
        setProductName("");
        setVideoIdea("");
        setSuggestedAdTypes([]);
        setSelectedAdType(null);
        setGeneratedVideoUrl(null);
        setError(null);
        setStep(1);
    };

    return (
        <div className="max-w-3xl mx-auto">
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">
                    E-commerce Video Visionary
                </h1>
                <p className="mt-2 text-lg text-slate-400">Generate data-driven marketing videos in minutes.</p>
            </header>
            <main className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-700">
                {step === 1 && (
                    <div className="space-y-6">
                        <MultiImageUploader files={productImages} onFilesSelect={setProductImages} />
                        <InputField label="2. Product Name" value={productName} onChange={setProductName} placeholder="e.g., Apex Adventure Backpack" />
                        <InputField label="3. Video Idea Prompt" value={videoIdea} onChange={setVideoIdea} placeholder="e.g., Show it on a rainy hike, emphasize it's tough and waterproof." isTextarea />
                        <button onClick={handleAnalyze} disabled={isProcessing || productImages.length === 0 || !productName} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 transform hover:scale-105 disabled:scale-100">
                            {isProcessing ? loadingMessage : "Analyze & Suggest Video Types"}
                        </button>
                    </div>
                )}
                {step === 2 && (
                     <div className="space-y-6">
                        <SuggestionList suggestions={suggestedAdTypes} selected={selectedAdType} onSelect={setSelectedAdType} />
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">4. Choose a Video Style</label>
                            <select value={videoStyle} onChange={e => setVideoStyle(e.target.value as VideoStyle)} className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none">
                                {Object.values(VideoStyle).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <button onClick={handleGenerate} disabled={isProcessing || !selectedAdType} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 transform hover:scale-105 disabled:scale-100">
                            <SparklesIcon className="w-5 h-5"/> Generate Video
                        </button>
                     </div>
                )}
                {step === 3 && <LoadingScreen message={loadingMessage} />}
                {step === 4 && generatedVideoUrl && <VideoPreview src={generatedVideoUrl} onRestart={resetForNewVideo}/>}
                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
            </main>
        </div>
    );
};

const HistoryPage: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Your Video History</h1>
            <p className="text-slate-400 mb-8">All your previously generated videos will appear here.</p>
            <div className="flex flex-col items-center justify-center bg-slate-800/50 border border-slate-700 rounded-2xl min-h-[300px] p-8">
                <SparklesIcon className="w-12 h-12 text-slate-500 mb-4" />
                <h3 className="text-xl font-semibold text-white">No videos yet</h3>
                <p className="text-slate-400 mt-1">Start creating to see your history.</p>
            </div>
        </div>
    );
};

const Header: React.FC<{ onBackToLanding: () => void; isAppView?: boolean; appView?: string; setAppView?: (view: 'generator' | 'history') => void }> = ({ onBackToLanding, isAppView, appView, setAppView }) => {
    const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const HelpMenu = () => (
        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
            <div className="p-2">
                <strong className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Support</strong>
                <a href="#" className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md">Contact support</a>
                <a href="#" className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md">Email us</a>
            </div>
            <div className="p-2 border-t border-slate-700">
                <strong className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Learn</strong>
                <a href="#" className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md">Tutorials</a>
            </div>
            <div className="p-2 border-t border-slate-700">
                <strong className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Community</strong>
                <a href="#" className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md">Youtube Channel</a>
                <a href="#" className="block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded-md">Instagram Inspiration</a>
            </div>
        </div>
    );
    
    return (
        <header className="sticky top-0 z-30 bg-slate-900/70 backdrop-blur-lg border-b border-slate-800">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4 cursor-pointer" onClick={onBackToLanding}>
                       <SparklesIcon className="h-7 w-7 text-cyan-400"/>
                       <span className="text-xl font-bold text-white">Video Visionary</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-6">
                        {isAppView && setAppView && (
                            <>
                            <button onClick={() => setAppView('generator')} className={`text-sm font-medium transition-colors ${appView === 'generator' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>Generator</button>
                            <button onClick={() => setAppView('history')} className={`text-sm font-medium transition-colors ${appView === 'history' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>History</button>
                            </>
                        )}
                        <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</a>
                        <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Blog</a>
                        <div className="relative">
                            <button onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)} className="flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                Help <ChevronDownIcon className="w-4 h-4 ml-1" />
                            </button>
                            {isHelpMenuOpen && <HelpMenu />}
                        </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                       <button onClick={onBackToLanding} className="px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 rounded-md">Back to Landing</button>
                    </div>
                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Bars3Icon className="w-6 h-6"/></button>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-2">
                        {isAppView && setAppView && (
                           <>
                           <button onClick={() => setAppView('generator')} className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md ${appView === 'generator' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>Generator</button>
                           <button onClick={() => setAppView('history')} className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md ${appView === 'history' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>History</button>
                           </>
                        )}
                       <a href="#" className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md">Pricing</a>
                       <a href="#" className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md">Blog</a>
                       <a href="#" className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md">Help</a>
                       <div className="pt-4 border-t border-slate-800">
                           <button onClick={onBackToLanding} className="w-full px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 rounded-md">Back to Landing</button>
                       </div>
                    </div>
                )}
            </nav>
        </header>
    )
};

const Footer = () => (
    <footer className="border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-500 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
                &copy; {new Date().getFullYear()} Video Visionary. All rights reserved.
            </div>
            <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
        </div>
    </footer>
);

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    return (
        <div className="bg-slate-900 text-white font-sans antialiased">
            <header className="sticky top-0 z-30 bg-slate-900/70 backdrop-blur-lg border-b border-slate-800">
                 <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                           <SparklesIcon className="h-7 w-7 text-cyan-400"/>
                           <span className="text-xl font-bold text-white">Video Visionary</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-6">
                            <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</a>
                            <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Blog</a>
                        </div>
                        <div className="hidden md:flex items-center space-x-2">
                           <button onClick={onGetStarted} className="px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 rounded-md">Login</button>
                           <button onClick={onGetStarted} className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 rounded-md">Sign Up</button>
                        </div>
                        <div className="md:hidden">
                            <button onClick={onGetStarted}><Bars3Icon className="w-6 h-6"/></button>
                        </div>
                    </div>
                </nav>
            </header>

            <main>
                <section className="relative pt-24 pb-32 text-center">
                    <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(to_bottom,white_0%,transparent_100%)]"></div>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500 tracking-tight">
                           Transform Product Shots into Viral Videos with AI.
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-400">
                           Go from static images to dynamic, scroll-stopping social media ads and e-commerce videos in minutes. No editing skills required.
                        </p>
                        <button onClick={onGetStarted} className="mt-10 px-8 py-3 font-bold text-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 rounded-full transition-transform duration-300 hover:scale-110">
                           Get Started for Free
                        </button>
                    </div>
                </section>
                
                <section className="py-20 sm:py-24">
                     <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="text-center mb-16">
                             <h2 className="text-3xl font-bold text-white">Create in 3 Simple Steps</h2>
                             <p className="mt-2 text-slate-400">From idea to viral video, faster than ever.</p>
                         </div>
                         <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 text-center">
                                <div className="flex justify-center items-center h-16 w-16 bg-slate-700 rounded-full mx-auto mb-6"><UploadIcon className="h-8 w-8 text-cyan-400"/></div>
                                <h3 className="text-xl font-bold text-white">1. Upload Images</h3>
                                <p className="mt-2 text-slate-400">Drag and drop your product photos. Our AI analyzes every pixel.</p>
                            </div>
                            <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 text-center">
                                <div className="flex justify-center items-center h-16 w-16 bg-slate-700 rounded-full mx-auto mb-6"><SparklesIcon className="h-8 w-8 text-violet-400"/></div>
                                <h3 className="text-xl font-bold text-white">2. Describe Your Vision</h3>
                                <p className="mt-2 text-slate-400">Tell our AI your video idea and desired style. Get smart suggestions.</p>
                            </div>
                            <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 text-center">
                                <div className="flex justify-center items-center h-16 w-16 bg-slate-700 rounded-full mx-auto mb-6"><DownloadIcon className="h-8 w-8 text-green-400"/></div>
                                <h3 className="text-xl font-bold text-white">3. Generate & Download</h3>
                                <p className="mt-2 text-slate-400">Receive a professional-grade video in minutes, ready for any platform.</p>
                            </div>
                         </div>
                     </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

const AuthenticationModal: React.FC<{ onLogin: () => void, onClose: () => void }> = ({ onLogin, onClose }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                    <p className="mt-2 text-slate-400">Sign in to continue your video creation journey.</p>
                </div>
                <div className="mt-8 space-y-4">
                     <button onClick={onLogin} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-lg transition-transform duration-200 hover:scale-105">
                        <GoogleIcon /> Sign In with Google
                    </button>
                    <button className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-transform duration-200 hover:scale-105 opacity-50 cursor-not-allowed">
                        <UserGroupIcon /> Sign In with Social
                    </button>
                     <button className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-transform duration-200 hover:scale-105 opacity-50 cursor-not-allowed">
                        <DevicePhoneMobileIcon /> Sign In with Phone
                    </button>
                </div>
            </div>
        </div>
    );
};

const AppShell: React.FC<{ onBackToLanding: () => void }> = ({ onBackToLanding }) => {
    const [appView, setAppView] = useState<'generator' | 'history'>('generator');

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
            <Header onBackToLanding={onBackToLanding} isAppView={true} appView={appView} setAppView={setAppView} />
            <main className="flex-grow p-4 sm:p-6 lg:p-8">
                {appView === 'generator' && <VideoGenerator />}
                {appView === 'history' && <HistoryPage />}
            </main>
            <Footer />
        </div>
    )
}

export default function App() {
    const [page, setPage] = useState<'landing' | 'app'>('landing');
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleLogin = () => {
        setIsAuthenticating(false);
        setPage('app');
    }

    if (page === 'landing') {
        return (
            <>
                <LandingPage onGetStarted={() => setIsAuthenticating(true)} />
                {isAuthenticating && <AuthenticationModal onLogin={handleLogin} onClose={() => setIsAuthenticating(false)} />}
            </>
        );
    }

    return <AppShell onBackToLanding={() => setPage('landing')} />;
}