export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectionItem {
  id: string;
  name: string;
  classId?: number;
  confidence: number;
  box: BoundingBox;
  color: string;
}

export interface SpeedMetrics {
  preprocess?: number;
  inference?: number;
  postprocess?: number;
}

export interface BackendHealthResponse {
  status: string;
}
