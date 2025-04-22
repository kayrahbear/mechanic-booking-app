# Use Python 3.11 distroless as a base image
FROM python:3.11-slim as builder

WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the worker code
COPY main.py .

# Configure the container
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Set the entrypoint
CMD ["python", "main.py"] 