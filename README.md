# YOLO Face & Person Detector App

A complete, production-ready full-stack web application and identical Android mobile app clone for custom YOLO person and face detection, powered by a **FastAPI** backend, a **React + Vite + Tailwind CSS** frontend, and a native **Capacitor** Android integration targeting deployed **Ultralytics YOLO** models.

---

## 🏗️ Architecture Overview

```
Face detector app/
├── backend/                       # Python FastAPI Backend
│   ├── main.py                    # API Server & Ultralytics Proxy
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment configuration
│   └── .env.example               # Template environment configuration
├── frontend/                      # React + Vite + Capacitor Frontend
│   ├── src/
│   │   ├── components/            # UI Components (Canvas, Header, Slider, Summary)
│   │   ├── services/              # API and Native/Web Camera handlers
│   │   ├── utils/                 # Ultralytics response parser & bounding box math
│   │   ├── App.tsx                # Main screen with mobile-first layout
│   │   └── main.tsx               # Entry point
│   ├── android/                   # Native Android Project (Capacitor)
│   ├── ios/                       # Native iOS Project (Xcode / Capacitor)
│   ├── capacitor.config.ts        # Capacitor configuration (com.david.yolodetector)
│   ├── package.json               # Frontend dependencies
│   ├── .env                       # Frontend environment configuration
│   └── .env.example               # Template frontend environment
└── README.md                      # Documentation & instructions
```

---

## 🚀 Quick Start Guide

### 1. Configure Ultralytics Credentials in `/backend/.env`

Open [`backend/.env`](file:///backend/.env) (copied from [`.env.example`](file:///backend/.env.example)) and supply your deployed Ultralytics endpoint and API key:

```env
ULTRALYTICS_ENDPOINT=https://platform.ultralytics.com/api/deployments/david-dagbanja/exp-paris/predict
ULTRALYTICS_API_KEY=ul_your_actual_api_key_here
PORT=8000
HOST=0.0.0.0
```

> **Note:** If you want to test the UI immediately before adding your live Ultralytics credentials, keep `ENABLE_DEMO_MODE=true` to preview realistic detections. Once you add your live endpoint and API key, live cloud inference runs automatically.

---

### 2. Run the Backend & Web App Locally

#### Terminal 1 — Backend (FastAPI)
```powershell
cd backend
# Activate virtual environment
.\venv\Scripts\activate

# Start the server (runs on http://localhost:8000)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- Health Check: `http://localhost:8000/health`
- Interactive API Docs (Swagger): `http://localhost:8000/docs`

#### Terminal 2 — Frontend (React Web App)
```powershell
cd frontend
# Install dependencies (already installed)
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser to interact with the app.

---

## 📱 Building & Running Mobile Apps (Android & iOS)

The frontend is fully configured with Capacitor (`@capacitor/camera`, `@capacitor/android`, `@capacitor/ios`). The app automatically uses the native Camera and Photo Gallery on Android and iOS devices, and falls back to standard HTML file pickers in the web browser.

### Step 1: Set the Backend URL in `/frontend/.env`
For an Android device, iOS device, or simulator to reach your backend:
- **Android Emulator:** Set `VITE_API_URL=http://10.0.2.2:8000` (Android emulator's special alias for host machine `localhost`).
- **iOS Simulator:** Set `VITE_API_URL=http://localhost:8000` (iOS simulator shares network with host macOS).
- **Physical Device (Android or iPhone):** Set `VITE_API_URL=http://YOUR_LOCAL_IP:8000` (e.g. `http://192.168.1.50:8000` on the same Wi-Fi) or your production hosted backend URL (e.g. `https://your-api.railway.app`).

### Step 2: Build & Sync Capacitor Assets
```powershell
cd frontend
# 1. Build the web distribution bundle
npm run build

# 2. Sync web assets and plugins to native platforms
npx cap sync
# Or sync individually:
# npx cap sync android
# npx cap sync ios
```

---

### 🤖 Android Setup (Android Studio)

```powershell
cd frontend
npx cap open android
```

Inside Android Studio:
1. Allow Gradle to sync and finish indexing dependencies.
2. Connect an Android device (via USB with USB debugging enabled) or start an Android Virtual Device (AVD).
3. Click the green **Run (▶)** button to deploy and launch the app directly.
4. **Generate APK:**
   - Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The compiled `.apk` will be output to: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

> **Note on Permissions:** `CAMERA`, `INTERNET`, `READ_MEDIA_IMAGES`, and cleartext HTTP traffic are already configured in `frontend/android/app/src/main/AndroidManifest.xml`.

---

### 🍏 iOS Setup (Apple Xcode)

*(Requires macOS with Xcode installed)*

```bash
cd frontend
npx cap open ios
```

Inside Xcode:
1. Select the **App** project in the left project navigator.
2. Under **Signing & Capabilities**, select your Apple Developer Team and verify the Bundle Identifier (`com.david.yolodetector`).
3. Select your target simulator (e.g., *iPhone 16 Pro*) or connected physical iPhone.
4. Click **Run (▶)** to build and launch the app.
5. **Archive & Distribution:**
   - Select **Any iOS Device (arm64)** as target.
   - Go to **Product** > **Archive** to create an App Store / TestFlight build.

> **Note on Privacy Permissions:** The required privacy keys have already been added to `frontend/ios/App/App/Info.plist`:
> - `NSCameraUsageDescription`: *"This app requires access to your camera to capture photos for face and person detection using the YOLO model."*
> - `NSPhotoLibraryUsageDescription`: *"This app requires access to your photo library to select photos for face and person detection using the YOLO model."*
> - `NSPhotoLibraryAddUsageDescription`: *"This app requires permission to save photos to your photo library."*

---

## ⚙️ Key Technical Features

- **FastAPI Proxy:** Prevents leaking your private `ULTRALYTICS_API_KEY` to client devices, enforces a 90-second timeout to handle Ultralytics model cold starts, and converts upstream errors into actionable client notices.
- **Crisp Canvas Bounding Boxes:** Calculates true coordinate scaling using natural image dimensions vs screen viewport, rendering sharp colored boxes, tinted overlays, and class/confidence label pills.
- **Mobile-First Dark UI:** Tailored with Tailwind CSS for single-screen responsive experience on phones, tablets, and desktops.
- **Platform-Aware Camera Integration:** Seamlessly switches between Capacitor Camera plugin (native permission handling for Android/iOS) and web standard file inputs.
- **Adjustable Confidence Slider:** Filter detections dynamically between 10% and 90% threshold.
