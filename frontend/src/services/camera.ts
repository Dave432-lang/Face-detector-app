import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface PhotoResult {
  blob: Blob;
  dataUrl: string;
}

/**
 * Capture photo using Capacitor native camera on Android/iOS,
 * or fall back gracefully to browser file picker or web input.
 */
export async function getPhoto(mode: 'camera' | 'photos'): Promise<PhotoResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: mode === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        correctOrientation: true, // Fix orientation for iPhone selfies & portraits
        width: 1600,              // Downscale massive photos for faster, reliable detection
        height: 1600,
      });

      if (!photo.webPath) {
        throw new Error('No image captured from device.');
      }

      // Fetch the file and guarantee a clean image/jpeg blob
      const response = await fetch(photo.webPath);
      const rawBlob = await response.blob();
      const jpegBlob = new Blob([await rawBlob.arrayBuffer()], { type: 'image/jpeg' });

      return {
        blob: jpegBlob,
        dataUrl: photo.webPath,
      };
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('user cancelled')) {
        throw new Error('Photo capture cancelled');
      }
      throw err;
    }
  }

  // Web Browser Fallback: using HTML File Input
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (mode === 'camera') {
      input.capture = 'environment';
    }

    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            blob: file,
            dataUrl: reader.result as string,
          });
        };
        reader.onerror = () => reject(new Error('Failed to read selected image file.'));
        reader.readAsDataURL(file);
      } else {
        reject(new Error('No image selected.'));
      }
    };

    input.oncancel = () => {
      reject(new Error('Photo capture cancelled'));
    };

    input.click();
  });
}
