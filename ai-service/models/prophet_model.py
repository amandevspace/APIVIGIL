from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import pandas as pd
from prophet import Prophet


def predict_latency(
    data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]],
    periods: int = 10,
) -> pd.DataFrame:
    """Train a latency forecast and return the next time-step predictions."""
    if periods != 10:
        raise ValueError("periods must be 10")

    if isinstance(data, pd.DataFrame):
        training_data = data.copy()
    elif isinstance(data, Mapping):
        training_data = pd.DataFrame([data])
    else:
        training_data = pd.DataFrame(data)

    required_columns = {"ds", "y"}
    missing_columns = required_columns.difference(training_data.columns)
    if missing_columns:
        raise ValueError(f"missing required columns: {', '.join(sorted(missing_columns))}")

    training_data = training_data[["ds", "y"]].copy()
    training_data["ds"] = pd.to_datetime(training_data["ds"], errors="coerce", utc=True)
    training_data["y"] = pd.to_numeric(training_data["y"], errors="coerce")
    training_data = training_data.dropna().sort_values("ds")

    if training_data.empty:
        raise ValueError("training data must contain valid ds and y values")

    model = Prophet()
    model.fit(training_data)

    frequency = pd.infer_freq(training_data["ds"]) or "h"
    future = model.make_future_dataframe(periods=periods, freq=frequency, include_history=False)
    forecast = model.predict(future)
    return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(periods).reset_index(drop=True)