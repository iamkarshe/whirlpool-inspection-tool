#!/bin/bash

APP_NAME="whirlpool-app"   # Unique app identifier
FASTAPI_PORT=8210          # Unique FastAPI port
FASTAPI_LOG="fastapi.log"

# Activate virtual environment
. .venv/bin/activate

# Stop FastAPI instance running on the specific port
echo "Stopping FastAPI instance for $APP_NAME on port $FASTAPI_PORT..."
pkill -f "whirlpool.scoptanalytics.in/.venv/bin/fastapi"
kill -9 $(lsof -t -i :$FASTAPI_PORT)

# Remove old logs
rm -f "$FASTAPI_LOG"

# Start FastAPI with a unique port
echo "Starting FastAPI server for $APP_NAME..."
nohup fastapi run --workers 4 --port $FASTAPI_PORT main.py > "$FASTAPI_LOG" 2>&1 &

echo "FastAPI restarted for $APP_NAME."
