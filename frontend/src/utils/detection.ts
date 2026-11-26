import type { DetectionItem, BoundingBox, SpeedMetrics } from '../types';

// Vibrant high-contrast colors suitable for dark themes and overlay on diverse images
const COLOR_PALETTE = [
  '#10B981', // Emerald 500 (person)
  '#06B6D4', // Cyan 500 (face)
  '#8B5CF6', // Purple 500
  '#F59E0B', // Amber 500
  '#EC4899', // Pink 500
  '#3B82F6', // Blue 500
  '#14B8A6', // Teal 500
  '#F97316', // Orange 500
];

export function getColorForLabel(label: string, index: number): string {
  const lower = label.toLowerCase();
  if (lower.includes('person')) return '#10B981'; // Emerald
  if (lower.includes('face')) return '#06B6D4';   // Cyan
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

/**
 * Normalizes bounding box data from various possible Ultralytics output schemas
 */
function extractBox(rawBox: any): BoundingBox | null {
  if (!rawBox) return null;

  // Format 1: { x1, y1, x2, y2 }
  if (typeof rawBox.x1 === 'number' && typeof rawBox.y1 === 'number' && typeof rawBox.x2 === 'number' && typeof rawBox.y2 === 'number') {
    return {
      x1: Math.min(rawBox.x1, rawBox.x2),
      y1: Math.min(rawBox.y1, rawBox.y2),
      x2: Math.max(rawBox.x1, rawBox.x2),
      y2: Math.max(rawBox.y1, rawBox.y2),
    };
  }

  // Format 2: Array [x1, y1, x2, y2]
  if (Array.isArray(rawBox) && rawBox.length >= 4) {
    const [x1, y1, x2, y2] = rawBox.map(Number);
    return {
      x1: Math.min(x1, x2),
      y1: Math.min(y1, y2),
      x2: Math.max(x1, x2),
      y2: Math.max(y1, y2),
    };
  }

  // Format 3: { xmin, ymin, xmax, ymax }
  if (typeof rawBox.xmin === 'number' && typeof rawBox.ymin === 'number') {
    return {
      x1: rawBox.xmin,
      y1: rawBox.ymin,
      x2: rawBox.xmax,
      y2: rawBox.ymax,
    };
  }

  // Format 4: { x, y, width, height }
  if (typeof rawBox.x === 'number' && typeof rawBox.y === 'number' && typeof rawBox.width === 'number' && typeof rawBox.height === 'number') {
    return {
      x1: rawBox.x,
      y1: rawBox.y,
      x2: rawBox.x + rawBox.width,
      y2: rawBox.y + rawBox.height,
    };
  }

  return null;
}

/**
 * Normalizes and enhances bounding box framing for face and person detections.
 * On close-up selfies, YOLO models often detect upper facial features (forehead down to nose bridge)
 * resulting in a truncated bounding box with height/width < 1.20.
 * This helper extends the box downwards to natural portrait head proportions (1.28:1)
 * to ensure the mouth, jawline, and chin are fully framed.
 */
export function normalizeFaceBox(
  box: BoundingBox,
  name: string,
  imgWidth: number,
  imgHeight: number
): BoundingBox {
  let { x1, y1, x2, y2 } = box;

  // Handle normalized coordinates (0.0 to 1.0) if returned by model
  if (x2 <= 1.01 && y2 <= 1.01 && (x2 > 0 || y2 > 0)) {
    x1 = x1 * imgWidth;
    y1 = y1 * imgHeight;
    x2 = x2 * imgWidth;
    y2 = y2 * imgHeight;
  }

  // Constrain within image boundaries
  x1 = Math.max(0, Math.min(imgWidth, x1));
  y1 = Math.max(0, Math.min(imgHeight, y1));
  x2 = Math.max(0, Math.min(imgWidth, x2));
  y2 = Math.max(0, Math.min(imgHeight, y2));

  let width = x2 - x1;
  let height = y2 - y1;

  if (width <= 0 || height <= 0) {
    return { x1, y1, x2, y2 };
  }

  const lowerName = name.toLowerCase();
  const isFaceOrPerson =
    lowerName.includes('david') ||
    lowerName.includes('face') ||
    lowerName.includes('person');

  // If the detection is a face/person and is truncated vertically (e.g. selfie cutting off at nose),
  // extend y2 downward to encompass the entire jawline and chin (target ratio height:width ≈ 1.28)
  if (isFaceOrPerson && height / width < 1.20) {
    const targetHeight = width * 1.28;
    y2 = Math.min(imgHeight, y1 + targetHeight);
  }

  return { x1, y1, x2, y2 };
}

/**
 * Robustly parses Ultralytics detection response into structured DetectionItem array
 */
export function parseUltralyticsResponse(data: any): { detections: DetectionItem[]; speed?: SpeedMetrics } {
  const detections: DetectionItem[] = [];
  let speed: SpeedMetrics | undefined;

  if (!data) {
    return { detections };
  }

  // Check for images[0] structure (standard Ultralytics Hub / inference API)
  let rawResults: any[] = [];
  if (Array.isArray(data.images) && data.images.length > 0) {
    const firstImage = data.images[0];
    if (Array.isArray(firstImage.results)) {
      rawResults = firstImage.results;
    }
    if (firstImage.speed) {
      speed = firstImage.speed;
    }
  } else if (Array.isArray(data.results)) {
    rawResults = data.results;
  } else if (Array.isArray(data)) {
    rawResults = data;
  }

  rawResults.forEach((item: any, idx: number) => {
    // Detect box
    let box: BoundingBox | null = null;
    if (item.box) {
      box = extractBox(item.box);
    } else if (item.x1 !== undefined && item.y1 !== undefined) {
      box = extractBox(item);
    }

    if (!box) return;

    const name = String(item.name ?? item.class_name ?? (item.class !== undefined ? `class_${item.class}` : 'object'));
    const confidence = typeof item.confidence === 'number' ? item.confidence : (typeof item.conf === 'number' ? item.conf : 1.0);
    const classId = typeof item.class === 'number' ? item.class : undefined;

    detections.push({
      id: `det-${idx}-${Date.now()}`,
      name,
      classId,
      confidence,
      box,
      color: getColorForLabel(name, idx),
    });
  });

  // Sort by confidence descending
  detections.sort((a, b) => b.confidence - a.confidence);

  return { detections, speed };
}
