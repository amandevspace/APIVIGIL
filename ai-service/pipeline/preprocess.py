from collections.abc import Mapping, Sequence
from typing import Any

import pandas as pd


def preprocess(data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]]) -> pd.DataFrame:
    """Normalize metric records and derive timestamp features."""
    if isinstance(data, pd.DataFrame):
        frame = data.copy()
    elif isinstance(data, Mapping):
        frame = pd.DataFrame([data])
    else:
        frame = pd.DataFrame(data)

    if "timestamp" not in frame.columns:
        raise ValueError("timestamp column is required")

    frame["timestamp"] = pd.to_datetime(frame["timestamp"], errors="coerce", utc=True)
    if frame["timestamp"].isna().any():
        raise ValueError("timestamp contains invalid values")

    frame["hour"] = frame["timestamp"].dt.hour
    frame["day_of_week"] = frame["timestamp"].dt.dayofweek
    return frame