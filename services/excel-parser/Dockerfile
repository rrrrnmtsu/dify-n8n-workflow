FROM python:3.11-slim

WORKDIR /app

# Install required packages including curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir \
    flask==3.0.0 \
    openpyxl==3.1.2 \
    gunicorn==21.2.0

# Copy application
COPY app.py /app/

# Expose port
EXPOSE 5000

# Run with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]
