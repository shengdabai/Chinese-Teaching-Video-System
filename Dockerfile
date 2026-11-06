FROM python:3.12-slim

# Install FFmpeg and fonts
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install Python test dependencies
RUN pip install --no-cache-dir pytest

# Default: run quality check
CMD ["python", "scripts/quality_check.py"]
