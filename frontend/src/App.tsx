import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  Upload,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Header } from './components/Header';
import { SliderControl } from './components/SliderControl';
import { DetectionCanvas } from './components/DetectionCanvas';
import { ResultsSummary } from './components/ResultsSummary';
import { WebcamModal } from './components/WebcamModal';
import { checkBackendHealth, detectPeopleInImage } from './services/api';
import { getPhoto, type PhotoResult } from './services/camera';
import type { BackendHealthResponse, DetectionItem, SpeedMetrics } from './types';

// High quality sample image with people for instant testing
const SAMPLE_IMAGE_URL = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80';

export function App() {
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(true);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [speed, setSpeed] = useState<SpeedMetrics | undefined>(undefined);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);

  const lastProcessedRef = useRef<{ blob: Blob; conf: number } | null>(null);

  // Check backend health on mount
  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await checkBackendHealth();
      setHealth(res);
    } catch {
      setHealth(null);
    } finally {
      setCheckingHealth(false);
    }
  };

  const runDetection = async (blobToDetect: Blob, conf: number) => {
    setLoading(true);
    setError(null);
    setSelectedDetectionId(null);

    try {
      const result = await detectPeopleInImage(blobToDetect, conf);
      setDetections(result.detections);
      setSpeed(result.speed);
      lastProcessedRef.current = { blob: blobToDetect, conf };
    } catch (err: any) {
      console.error('Detection error:', err);
      setError(err.message || 'An error occurred during detection.');
      setDetections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfidenceChange = (newConf: number) => {
    setConfidence(newConf);
    // If we have an existing image, allow quick re-detect on confidence change
    if (imageBlob) {
      runDetection(imageBlob, newConf);
    }
  };

  const handleCapture = async (mode: 'camera' | 'photos') => {
    setError(null);

    // If running in a web browser and "Take Photo" is clicked, open the live webcam modal!
    if (mode === 'camera' && !Capacitor.isNativePlatform()) {
      setIsWebcamOpen(true);
      return;
    }

    try {
      const photo = await getPhoto(mode);
      setImageUrl(photo.dataUrl);
      setImageBlob(photo.blob);
      await runDetection(photo.blob, confidence);
    } catch (err: any) {
      if (err.message && err.message.includes('cancelled')) {
        // User closed camera/picker quietly
        return;
      }
      setError(err.message || 'Failed to capture or select photo.');
    }
  };

  const handleWebcamCapture = (photo: PhotoResult) => {
    setImageUrl(photo.dataUrl);
    setImageBlob(photo.blob);
    runDetection(photo.blob, confidence);
  };

  const handleLoadSample = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(SAMPLE_IMAGE_URL);
      const blob = await response.blob();
      setImageUrl(SAMPLE_IMAGE_URL);
      setImageBlob(blob);
      await runDetection(blob, confidence);
    } catch (err: any) {
      setError('Failed to load sample image: ' + err.message);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImageUrl(null);
    setImageBlob(null);
    setDetections([]);
    setSpeed(undefined);
    setError(null);
    setSelectedDetectionId(null);
    lastProcessedRef.current = null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <Header
        health={health}
        checkingHealth={checkingHealth}
        onRefreshHealth={fetchHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Input Action Controls (Mobile-First Prominent Buttons) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleCapture('photos')}
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Upload className="w-5 h-5 stroke-[2.5]" />
            <span>Upload Photo</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleCapture('camera')}
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-cyan-950/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            <span>Take Photo</span>
          </button>
        </div>

        {/* Confidence Threshold Slider */}
        <SliderControl
          confidence={confidence}
          onChange={handleConfidenceChange}
          disabled={loading}
        />

        {/* Error Alert Display */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-lg shadow-rose-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-300">Detection Notice</h4>
                <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
            {imageBlob && (
              <button
                type="button"
                onClick={() => runDetection(imageBlob, confidence)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 text-xs font-semibold border border-rose-700/50 transition-colors flex-shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Display Canvas or Empty State */}
        <div className="relative min-h-[300px] flex flex-col items-center justify-center">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-slate-800 shadow-2xl">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                <Sparkles className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Detecting People…</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Waking up model… first request may take up to 60 seconds (cold start).
              </p>
            </div>
          )}

          {imageUrl ? (
            <div className="w-full flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-400 font-medium">Detection Preview</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Image</span>
                </button>
              </div>

              {/* Canvas with crisp bounding box overlays */}
              <DetectionCanvas
                imageUrl={imageUrl}
                detections={detections}
                selectedDetectionId={selectedDetectionId}
                onSelectDetection={setSelectedDetectionId}
              />

              {/* Results Summary & Breakdown */}
              <ResultsSummary
                detections={detections}
                speed={speed}
                selectedDetectionId={selectedDetectionId}
                onSelectDetection={setSelectedDetectionId}
              />
            </div>
          ) : (
            /* Empty State */
            <div className="w-full border-2 border-dashed border-slate-800 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-slate-900/30">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <Camera className="w-8 h-8 text-slate-500" />
              </div>

              <h2 className="text-lg font-bold text-white mb-1">No Photo Selected</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6">
                Choose a photo from your gallery, snap a fresh picture with your camera, or try our sample image below.
              </p>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs sm:text-sm font-semibold text-slate-200 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Try Sample Photo</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-600">
        YOLO Face & Person Detector • FastAPI Backend • React + Capacitor Mobile
      </footer>

      {/* Live Webcam Modal for Desktop Web Browsers */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={handleWebcamCapture}
      />
    </div>
  );
}

export default App;
