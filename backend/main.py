from pathlib import Path
import os
import io
import logging
from typing import Optional
from dotenv import load_dotenv
import requests
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Resolve absolute path to backend/.env so it loads regardless of terminal working directory
ENV_PATH = Path(__file__).resolve().parent / ".env"


def reload_env():
    """Reloads the .env file using its absolute path."""
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH, override=True)
    else:
        load_dotenv(override=True)


# Initial load on startup
reload_env()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("face-detector-backend")

app = FastAPI(
    title="YOLO Face & Person Detector Backend",
    description="FastAPI service proxying image detection requests to Ultralytics YOLO inference endpoint.",
    version="1.0.0"
)

# Enable CORS for web browser and mobile app clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_normalized_endpoint(raw: Optional[str]) -> str:
    """
    Cleans and normalizes the Ultralytics endpoint URL:
    - Strips leading/trailing whitespace
    - Ensures valid URL scheme (https:// or http://)
    - Ensures it ends cleanly with /predict (without duplicating /predict/predict)
    """
    if not raw:
        return ""
    endpoint = raw.strip()

    # Prepend scheme if omitted
    if not endpoint.startswith("http://") and not endpoint.startswith("https://"):
        if endpoint.startswith("localhost") or endpoint.startswith("127.0.0.1"):
            endpoint = f"http://{endpoint}"
        else:
            endpoint = f"https://{endpoint}"

    # Strip any trailing slashes
    endpoint = endpoint.rstrip("/")

    # Ensure it ends cleanly with /predict without duplicating /predict/predict
    if endpoint.endswith("/predict/predict"):
        endpoint = endpoint[:-8]
    elif not endpoint.endswith("/predict"):
        endpoint = f"{endpoint}/predict"

    return endpoint


def is_credentials_configured(endpoint: str, api_key: str) -> bool:
    """
    Validates whether the endpoint and API key are present and non-empty.
    """
    if not endpoint or not api_key:
        return False
    if "YOUR_ENDPOINT_URL" in endpoint or api_key == "ul_your_api_key_here":
        return False
    return True


@app.get("/health", summary="Health check endpoint")
def health_check():
    """
    Reports health status and whether Ultralytics credentials are configured.
    """
    reload_env()
    raw_endpoint = os.getenv("ULTRALYTICS_ENDPOINT", "")
    endpoint = get_normalized_endpoint(raw_endpoint)
    api_key = os.getenv("ULTRALYTICS_API_KEY", "").strip()

    configured = is_credentials_configured(endpoint, api_key)

    return {
        "status": "ok",
        "configured": configured,
        "endpoint": endpoint if configured else "unconfigured",
        "api_key_set": bool(api_key and api_key != "ul_your_api_key_here")
    }


@app.post("/detect", summary="Detect objects using Ultralytics YOLO model")
async def detect(
    file: UploadFile = File(..., description="Image file to detect"),
    conf: float = Form(0.25, description="Confidence threshold between 0.05 and 1.0", ge=0.05, le=1.0)
):
    # Validate uploaded file format
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Rejected non-image file with content-type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file must be an image (received '{file.content_type}')."
        )

    # Read uploaded image bytes
    try:
        image_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading uploaded file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded image file."
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Load and clean credentials
    reload_env()
    raw_endpoint = os.getenv("ULTRALYTICS_ENDPOINT", "")
    current_endpoint = get_normalized_endpoint(raw_endpoint)
    current_api_key = os.getenv("ULTRALYTICS_API_KEY", "").strip()

    if not is_credentials_configured(current_endpoint, current_api_key):
        msg = (
            "Ultralytics endpoint or API key has not been configured yet. "
            "Please update ULTRALYTICS_ENDPOINT and ULTRALYTICS_API_KEY in backend/.env with your valid credentials."
        )
        logger.warning(msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=msg
        )

    # Prepare multipart request to Ultralytics inference endpoint
    headers = {
        "Authorization": f"Bearer {current_api_key}"
    }

    files = {
        "file": (file.filename or "image.jpg", io.BytesIO(image_bytes), file.content_type or "image/jpeg")
    }

    data = {
        "conf": str(conf),
        "iou": "0.5",
        "imgsz": "640"
    }

    # Log outgoing request
    print(f"\n=======================================================", flush=True)
    print(f"[ULTRALYTICS REQUEST] -> Forwarding to: {current_endpoint}", flush=True)
    print(f"[ULTRALYTICS REQUEST] File: {file.filename} ({len(image_bytes)} bytes) | conf: {conf}", flush=True)
    print(f"=======================================================", flush=True)
    logger.info(f"Forwarding image '{file.filename}' to Ultralytics: {current_endpoint} (conf={conf})")

    try:
        response = requests.post(
            current_endpoint,
            headers=headers,
            files=files,
            data=data,
            timeout=90  # 90s timeout to handle model cold starts
        )
    except requests.exceptions.Timeout:
        timeout_msg = f"Ultralytics endpoint '{current_endpoint}' timed out after 90 seconds (cold start or model offline)."
        print(f"[ULTRALYTICS TIMEOUT] {timeout_msg}", flush=True)
        logger.error(timeout_msg)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=timeout_msg
        )
    except requests.exceptions.ConnectionError as e:
        conn_msg = f"Cannot connect to Ultralytics endpoint '{current_endpoint}'. Connection failed: {str(e)}"
        print(f"[ULTRALYTICS CONNECTION ERROR] {conn_msg}", flush=True)
        logger.error(conn_msg)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=conn_msg
        )
    except Exception as e:
        err_msg = f"An unexpected error occurred while contacting Ultralytics endpoint: {str(e)}"
        print(f"[ULTRALYTICS ERROR] {err_msg}", flush=True)
        logger.error(err_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err_msg
        )

    # Log incoming response status and raw body
    print(f"\n=======================================================", flush=True)
    print(f"[ULTRALYTICS RESPONSE] HTTP Status Code: {response.status_code}", flush=True)
    print(f"[ULTRALYTICS RESPONSE] Raw Body:\n{response.text}", flush=True)
    print(f"=======================================================\n", flush=True)
    logger.info(f"Ultralytics HTTP Status: {response.status_code}")
    logger.info(f"Ultralytics Raw Response:\n{response.text}")

    # Handle upstream HTTP error responses
    if not response.ok:
        detail_msg = f"Ultralytics API returned error HTTP {response.status_code}"
        try:
            err_json = response.json()
            if isinstance(err_json, dict):
                detail_msg = err_json.get("message") or err_json.get("error") or err_json.get("detail") or str(err_json)
            else:
                detail_msg = str(err_json)
        except Exception:
            if response.text:
                detail_msg = f"{detail_msg}: {response.text[:300]}"

        raise HTTPException(
            status_code=response.status_code if response.status_code in [400, 401, 403, 404, 422] else status.HTTP_502_BAD_GATEWAY,
            detail=f"Ultralytics API Error ({response.status_code}): {detail_msg}"
        )

    # Parse and return real Ultralytics JSON
    try:
        result_json = response.json()
        return JSONResponse(content=result_json)
    except Exception as e:
        parse_err = f"Failed to parse upstream response as JSON: {response.text[:200]}"
        logger.error(parse_err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=parse_err
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
