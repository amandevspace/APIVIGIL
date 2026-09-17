from __future__ import annotations

import json
import os
import hashlib
from collections.abc import Iterable, Sequence
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer


class SentenceTransformerEmbeddingFunction:
    """Adapt SentenceTransformer to Chroma's embedding function contract."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def __call__(self, input: Sequence[str]) -> list[list[float]]:
        embeddings = self.model.encode(list(input), normalize_embeddings=True)
        return embeddings.tolist()


class RAGStore:
    """Persistent Chroma collections for log and metric retrieval."""

    def __init__(
        self,
        persist_directory: str | None = None,
        model_name: str = "all-MiniLM-L6-v2",
    ) -> None:
        directory = persist_directory or os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
        self.client = chromadb.PersistentClient(path=directory)
        embedding_function = SentenceTransformerEmbeddingFunction(model_name)
        self.logs = self.client.get_or_create_collection("logs", embedding_function=embedding_function)
        self.metrics = self.client.get_or_create_collection("metrics", embedding_function=embedding_function)

    def add_logs(self, records: Iterable[dict[str, Any]]) -> None:
        self._add(self.logs, records, "log")

    def add_metrics(self, records: Iterable[dict[str, Any]]) -> None:
        self._add(self.metrics, records, "metric")

    def search_logs(self, query: str, limit: int = 5) -> dict[str, Any]:
        return self.logs.query(query_texts=[query], n_results=limit)

    def search_metrics(self, query: str, limit: int = 5) -> dict[str, Any]:
        return self.metrics.query(query_texts=[query], n_results=limit)

    @staticmethod
    def _add(collection: Any, records: Iterable[dict[str, Any]], prefix: str) -> None:
        items = list(records)
        if not items:
            return

        documents = [json.dumps(record, default=str, sort_keys=True) for record in items]
        ids = [
            f"{prefix}-{hashlib.sha256(document.encode('utf-8')).hexdigest()}"
            for document in documents
        ]
        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=[{"type": prefix} for _ in documents],
        )