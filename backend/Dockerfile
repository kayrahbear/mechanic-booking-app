FROM python:3.11-slim

# envs for faster, cleaner Python containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# 1. install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. copy application code
COPY . .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
