import logging
import os
from typing import Any

from fastapi import FastAPI


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("ai-service")

app = FastAPI(title="APIVIGIL AI Service")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@app.post("/analyze")
async def analyze(data: dict[str, Any]) -> dict[str, Any]:
    logger.info("analyze request received")
    return {"result": "ok", "analyzed": False, "requestId": data.get("requestId")}