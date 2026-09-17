from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import numpy as np
from tensorflow.keras import Model, Sequential
from tensorflow.keras.layers import Dense, Input, LSTM, RepeatVector, TimeDistributed


def _to_sequences(data: Any, sequence_length: int) -> np.ndarray:
    values = np.asarray(data, dtype=np.float32)
    if values.ndim == 1:
        values = values.reshape(-1, 1)
    if values.ndim != 2:
        raise ValueError("data must be a 1D or 2D numeric sequence")
    if values.shape[0] < sequence_length:
        raise ValueError("data must contain at least sequence_length rows")

    return np.asarray(
        [values[index : index + sequence_length] for index in range(values.shape[0] - sequence_length + 1)],
        dtype=np.float32,
    )


def train_lstm_autoencoder(
    normal_data: Sequence[float] | Sequence[Sequence[float]],
    sequence_length: int = 10,
    epochs: int = 10,
    batch_size: int = 32,
) -> tuple[Model, np.ndarray]:
    """Train an LSTM autoencoder on normal data and return scores for it."""
    if sequence_length < 1 or epochs < 1 or batch_size < 1:
        raise ValueError("sequence_length, epochs, and batch_size must be positive")

    sequences = _to_sequences(normal_data, sequence_length)
    feature_count = sequences.shape[2]
    model = Sequential(
        [
            Input(shape=(sequence_length, feature_count)),
            LSTM(64, activation="tanh", return_sequences=False),
            RepeatVector(sequence_length),
            LSTM(64, activation="tanh", return_sequences=True),
            TimeDistributed(Dense(feature_count)),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    model.fit(sequences, sequences, epochs=epochs, batch_size=batch_size, verbose=0, shuffle=True)
    reconstructed = model.predict(sequences, verbose=0)
    anomaly_score = np.mean(np.square(sequences - reconstructed), axis=(1, 2))
    return model, anomaly_score


def reconstruction_error(model: Model, data: Sequence[float] | Sequence[Sequence[float]], sequence_length: int = 10) -> np.ndarray:
    """Calculate reconstruction-based anomaly scores for new data."""
    sequences = _to_sequences(data, sequence_length)
    reconstructed = model.predict(sequences, verbose=0)
    return np.mean(np.square(sequences - reconstructed), axis=(1, 2))