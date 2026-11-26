import { useEffect, useRef } from 'react';
import type { FC, MouseEvent } from 'react';
import type { DetectionItem } from '../types';
import { normalizeFaceBox } from '../utils/detection';

interface DetectionCanvasProps {
  imageUrl: string;
  detections: DetectionItem[];
  selectedDetectionId?: string | null;
  onSelectDetection?: (id: string | null) => void;
}

export const DetectionCanvas: FC<DetectionCanvasProps> = ({
  imageUrl,
  detections,
  selectedDetectionId,
  onSelectDetection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
  }, [imageUrl, detections, selectedDetectionId]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution matching natural image dimensions for zero blurriness
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw background image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Compute responsive drawing scale based on natural image size
    const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
    const scaleFactor = Math.max(1, maxDim / 1000);

    const baseLineWidth = Math.max(2, Math.round(3.5 * scaleFactor));
    const fontSize = Math.max(12, Math.round(15 * scaleFactor));
    const badgePaddingX = Math.round(8 * scaleFactor);
    const badgePaddingY = Math.round(5 * scaleFactor);
    const cornerRadius = Math.round(6 * scaleFactor);

    detections.forEach((det) => {
      const isSelected = selectedDetectionId === det.id;
      
      // Normalize and adapt face bounding box to guarantee full portrait framing (forehead down to chin)
      const adjustedBox = normalizeFaceBox(det.box, det.name, canvas.width, canvas.height);
      det.box = adjustedBox; // Keep in sync for click handling and summary

      const { x1, y1, x2, y2 } = adjustedBox;
      const width = x2 - x1;
      const height = y2 - y1;

      if (width <= 0 || height <= 0) return;

      const mainColor = det.color || '#10B981';

      // 1. Draw bounding box with semi-transparent tinted backdrop
      ctx.save();
      ctx.fillStyle = isSelected ? `${mainColor}40` : `${mainColor}18`;
      ctx.fillRect(x1, y1, width, height);

      // Box stroke
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = isSelected ? baseLineWidth + 2 : baseLineWidth;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur = isSelected ? 16 * scaleFactor : 6 * scaleFactor;
      ctx.strokeRect(x1, y1, width, height);
      ctx.restore();

      // 2. Prepare Label text using real model class name
      const percentText = `${Math.round(det.confidence * 100)}%`;
      const labelText = `${det.name} ${percentText}`;

      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      const textMetrics = ctx.measureText(labelText);
      const badgeWidth = textMetrics.width + badgePaddingX * 2;
      const badgeHeight = fontSize + badgePaddingY * 2;

      // Position badge: prefer above top-left of box, fallback inside if too close to image top
      let badgeX = x1;
      let badgeY = y1 - badgeHeight - (2 * scaleFactor);
      if (badgeY < 0) {
        badgeY = y1 + (4 * scaleFactor);
      }
      if (badgeX + badgeWidth > canvas.width) {
        badgeX = Math.max(0, canvas.width - badgeWidth - 4);
      }

      // Draw Badge background pill with rounded corners
      ctx.save();
      ctx.fillStyle = mainColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4 * scaleFactor;
      ctx.shadowOffsetY = 2 * scaleFactor;

      // Rounded rectangle
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, cornerRadius);
      ctx.fill();
      ctx.restore();

      // Draw Badge Text (dark contrast text on vibrant badge)
      ctx.save();
      ctx.fillStyle = '#020617'; // slate-950
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, badgeX + badgePaddingX, badgeY + badgeHeight / 2 + 1);
      ctx.restore();
    });
  };

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectDetection || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked detection
    const clicked = detections.find(
      (d) =>
        clickX >= d.box.x1 &&
        clickX <= d.box.x2 &&
        clickY >= d.box.y1 &&
        clickY <= d.box.y2
    );

    onSelectDetection(clicked ? clicked.id : null);
  };

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950/70 border border-slate-800 shadow-2xl p-2 sm:p-3">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="max-w-full max-h-[36vh] sm:max-h-[50vh] w-auto h-auto object-contain rounded-xl cursor-pointer transition-transform"
      />
    </div>
  );
};
