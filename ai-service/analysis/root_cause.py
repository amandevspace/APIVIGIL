from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    with urlopen(request, timeout=float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))) as response:
        return json.loads(response.read().decode("utf-8"))


def _prompt(anomaly_data: dict[str, Any], retrieved_logs: list[str]) -> str:
    return (
        "Analyze this API monitoring anomaly. Return JSON only with exactly two string keys: "
        "rootCause and suggestedFix. Do not invent facts.\n\n"
        f"Anomaly data:\n{json.dumps(anomaly_data, default=str)}\n\n"
        f"Retrieved logs:\n{json.dumps(retrieved_logs, default=str)}"
    )


def _extract_json(text: str) -> dict[str, str]:
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            return {"rootCause": text.strip(), "suggestedFix": "Review the retrieved logs and monitor the service."}
        result = json.loads(text[start : end + 1])
    return {
        "rootCause": str(result.get("rootCause", "Unknown root cause")),
        "suggestedFix": str(result.get("suggestedFix", "Review the retrieved logs and monitor the service.")),
    }


def analyze_root_cause(anomaly_data: dict[str, Any], retrieved_logs: list[str]) -> dict[str, str]:
    provider = os.getenv("LLM_PROVIDER", "ollama").lower()
    prompt = _prompt(anomaly_data, retrieved_logs)

    try:
        if provider == "ollama":
            response = _post_json(
                f'{os.getenv("OLLAMA_URL", "http://ollama:11434")}/api/generate',
                {"model": os.getenv("OLLAMA_MODEL", "llama3.2"), "prompt": prompt, "format": "json", "stream": False},
            )
            return _extract_json(response.get("response", ""))

        if provider == "openrouter":
            response = _post_json(
                f'{os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1")}/chat/completions',
                {"model": os.environ["OPENROUTER_MODEL"], "messages": [{"role": "user", "content": prompt}]},
                {"Authorization": f'Bearer {os.environ["OPENROUTER_API_KEY"]}'},
            )
            return _extract_json(response["choices"][0]["message"]["content"])

        if provider == "gemini":
            response = _post_json(
                f'https://generativelanguage.googleapis.com/v1beta/models/{os.getenv("GEMINI_MODEL", "gemini-2.0-flash")}:generateContent?key={os.environ["GEMINI_API_KEY"]}',
                {"contents": [{"parts": [{"text": prompt}]}]},
            )
            return _extract_json(response["candidates"][0]["content"]["parts"][0]["text"])

        raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")
    except (HTTPError, URLError, KeyError, ValueError, TimeoutError, json.JSONDecodeError) as error:
        return {"rootCause": f"LLM analysis unavailable: {error}", "suggestedFix": "Review the retrieved logs manually."}