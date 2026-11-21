import type { BackendHealthResponse, DetectionItem, SpeedMetrics } from '../types';
import { parseUltralyticsResponse } from '../utils/detection';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed (HTTP ${response.status})`);
  }

  return response.json();
}

export async function detectPeopleInImage(
  imageBlob: Blob,
  confidence: number
): Promise<{ detections: DetectionItem[]; speed?: SpeedMetrics; raw: any }> {
  const formData = new FormData();
  formData.append('file', imageBlob, 'capture.jpg');
  formData.append('conf', confidence.toFixed(2));

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/detect`, {
      method: 'POST',
      body: formData,
    });
  } catch (err: any) {
    throw new Error(`Cannot reach backend at ${API_BASE_URL}. Ensure the backend server is running.`);
  }

  const responseText = await response.text();
  let jsonResponse: any;
  try {
    jsonResponse = JSON.parse(responseText);
  } catch {
    throw new Error(`Server returned unexpected non-JSON response: ${responseText.slice(0, 150)}`);
  }

  if (!response.ok) {
    const errorDetail = jsonResponse.detail || jsonResponse.message || `Detection failed (HTTP ${response.status})`;
    throw new Error(errorDetail);
  }

  const { detections, speed } = parseUltralyticsResponse(jsonResponse);
  return { detections, speed, raw: jsonResponse };
}
