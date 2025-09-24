import React, { useState, useCallback, useMemo } from 'react';
import { VideosOperation } from "@google/genai";
import { VideoStyle, ProductDetails, Script } from './types';
import * as geminiService from './services/geminiService';
import { UploadIcon, SparklesIcon, DownloadIcon, LightbulbIcon } from './components/icons';

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
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
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


export default function App() {
    const [step, setStep] = useState(1);
    const [productImages, setProductImages] = useState<File[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);
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
            if (suggestions.length > 0) {
              setSelectedAdType(suggestions[0]);
            }
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
            let operation: VideosOperation = await geminiService.generateVideo(productImages[0], script, details);

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
            setStep(2); // Go back to selection step on failure
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleRestart = () => {
        setStep(1);
        setProductImages([]);
        setProductName("");
        setVideoIdea("");
        setSuggestedAdTypes([]);
        setSelectedAdType(null);
        setGeneratedVideoUrl(null);
        setError(null);
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8 font-sans">
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

                    {(step === 3) && <LoadingScreen message={loadingMessage} />}
                    
                    {step === 4 && generatedVideoUrl && <VideoPreview src={generatedVideoUrl} onRestart={handleRestart}/>}

                    {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
                </main>
            </div>
        </div>
    );
}