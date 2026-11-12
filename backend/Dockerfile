FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The full 180-tree model needs ~415 MB to deserialize, which exceeds the
# 512 MB free compute tier once Python and the web server are running. A
# 90-tree subset is still a valid forest and keeps ~93% prediction agreement.
RUN python -m app.ml.trim_model --trees 90

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
