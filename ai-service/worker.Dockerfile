FROM python:3.12-slim

WORKDIR /app
COPY ai-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY ai-service/worker.py ./worker.py
COPY ai-service/rq_queue.py ./rq_queue.py
COPY ai-service/models ./models
COPY ai-service/pipeline ./pipeline
COPY ai-service/src ./src
COPY ai-service/analysis ./analysis

CMD ["python", "worker.py"]