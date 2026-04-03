#!/bin/bash
# CaseLink MVP HTML - 서버 중지
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/.server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "서버 중지됨 (PID: $PID)"
  else
    echo "서버가 이미 종료된 상태입니다"
  fi
  rm -f "$PID_FILE"
else
  echo "실행 중인 서버가 없습니다"
fi
