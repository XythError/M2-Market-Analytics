#!/bin/bash
set -e

# Initialize data directory
mkdir -p /app/data/exports

# Start the scheduler in the background, redirect output to docker logs
echo "Starting scheduler..."
python -m backend.scheduler > /proc/1/fd/1 2>/proc/1/fd/2 &
SCHEDULER_PID=$!
echo "Scheduler PID: $SCHEDULER_PID"

# Start uvicorn in the foreground
echo "Starting API server..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000