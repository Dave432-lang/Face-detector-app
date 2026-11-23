import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import type { PhotoResult } from '../services/camera';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: PhotoResult) => void;
}

export const WebcamModal: FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    startCamera();

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support webcam access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Webcam error:', err);
      let message = 'Could not access webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No webcam was detected on this device.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setLoading(false);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    // If facing user (front camera/webcam), mirror horizontally for natural feel if desired,
    // or draw as-is:
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        stopStream();
        onCapture({ blob, dataUrl });
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white text-base">Webcam Capture</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview Container */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-slate-950/80">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-300">Starting webcam…</span>
            </div>
          )}

          {error ? (
            <div className="p-6 text-center max-w-md flex flex-col items-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <h4 className="text-sm font-bold text-rose-300">Camera Unavailable</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Subtle Viewfinder Overlay */}
              <div className="absolute inset-8 pointer-events-none border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400/50 animate-ping"></div>
              </div>
            </>
          )}
        </div>

        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          <button
            type="button"
            onClick={toggleCamera}
            disabled={loading || !!error}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>

          {/* Shutter Button */}
          <button
            type="button"
            disabled={loading || !!error}
            onClick={handleCapture}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="w-full h-full rounded-full border-2 border-slate-950 flex items-center justify-center bg-white/20">
              <Sparkles className="w-6 h-6 text-slate-950" />
            </div>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
