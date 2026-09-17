import logging
import os
from typing import Any

from pymongo import MongoClient
from redis import Redis
from rq import Queue, Worker


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [ai-worker] %(message)s",
)
logger = logging.getLogger(__name__)


def store_predictions(predictions: Any) -> None:
    mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017/apivigil")
    with MongoClient(mongo_uri) as client:
        collection = client["apivigil"]["predictions"]
        documents = [
            {"predictedLatency": float(row.yhat), "timestamp": row.ds.to_pydatetime()}
            for row in predictions.itertuples(index=False)
        ]
        if documents:
            collection.insert_many(documents)


def find_similar_logs(predicted_latency: float, error_rate: float) -> list[str]:
    from src.rag import RAGStore

    query = f"latency {predicted_latency:.2f} milliseconds error rate {error_rate:.4f}"
    results = RAGStore().search_logs(query, limit=5)
    return results.get("documents", [[]])[0][:5]


def store_anomalies(predictions: Any, error_rate: float) -> list[dict[str, Any]]:
    latency_threshold = float(os.getenv("PREDICTED_LATENCY_THRESHOLD", "2000"))
    error_rate_threshold = float(os.getenv("ERROR_RATE_THRESHOLD", "0.2"))
    alerts = []
    for row in predictions.itertuples(index=False):
        predicted_latency = float(row.yhat)
        if predicted_latency <= latency_threshold and error_rate <= error_rate_threshold:
            continue
        alerts.append({
            "anomaly": True,
            "predictedLatency": predicted_latency,
            "errorRate": error_rate,
            "timestamp": row.ds.to_pydatetime(),
            "relevantContext": find_similar_logs(predicted_latency, error_rate),
        })
    if not alerts:
        return []

    mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017/apivigil")
    with MongoClient(mongo_uri) as client:
        client["apivigil"]["alerts"].insert_many(alerts)
    logger.info("stored %d anomaly alerts", len(alerts))
    return alerts


def store_insight(alert: dict[str, Any]) -> dict[str, Any]:
    from analysis.root_cause import analyze_root_cause

    analysis = analyze_root_cause(
        {key: value for key, value in alert.items() if key != "relevantContext"},
        alert["relevantContext"],
    )
    insight = {
        **analysis,
        "anomalyData": {key: value for key, value in alert.items() if key != "relevantContext"},
        "retrievedLogs": alert["relevantContext"],
        "timestamp": alert["timestamp"],
    }
    mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017/apivigil")
    with MongoClient(mongo_uri) as client:
        client["apivigil"]["insights"].insert_one(insight)
    return insight


def process_metrics(data: Any) -> None:
    """Log metrics job data until ML processing is introduced."""
    logger.info("received metrics job data: %s", data)
    from models.prophet_model import predict_latency
    from pipeline.preprocess import preprocess

    records = data.get("metrics", data) if isinstance(data, dict) else data
    processed = preprocess(records)
    training_data = processed.rename(columns={"timestamp": "ds", "latency": "y"})
    predictions = predict_latency(training_data[["ds", "y"]])
    store_predictions(predictions)
    error_rate_column = "errorRate" if "errorRate" in processed else "error_rate" if "error_rate" in processed else None
    error_rate = float(processed[error_rate_column].mean() or 0) if error_rate_column else 0.0
    anomalies = store_anomalies(predictions, error_rate)
    insights = [store_insight(alert) for alert in anomalies]
    logger.info("predicted latency: %s", predictions[["ds", "yhat"]].to_dict("records"))
    return {"anomalies": anomalies, "insights": insights, "relevant_context": [context for alert in anomalies for context in alert["relevantContext"]]}


def main() -> None:
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    redis_connection = Redis.from_url(redis_url)
    redis_connection.ping()

    metrics_queue = Queue("metrics", connection=redis_connection)
    logger.info("connected to Redis and listening on queue metrics")
    Worker([metrics_queue], connection=redis_connection).work()


if __name__ == "__main__":
    main()