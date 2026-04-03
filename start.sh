#!/bin/bash
# CaseLink MVP HTML - 로컬 개발 서버
PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/.server.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "서버가 이미 실행 중입니다 (PID: $(cat "$PID_FILE"))"
  echo "http://localhost:$PORT"
  exit 0
fi

echo "서버 시작 중... (포트: $PORT)"
python3 -m http.server "$PORT" --directory "$DIR" &
echo $! > "$PID_FILE"
sleep 0.5

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo ""
  echo "================================================"
  echo "  CaseLink MVP HTML Server"
  echo "  http://localhost:$PORT"
  echo "================================================"
  echo ""
  echo "  메인 페이지:   http://localhost:$PORT/index.html"
  echo "  퇴원예방:      http://localhost:$PORT/Phase0/260331_퇴원예방서비스.html"
  echo "  강사용UI:      http://localhost:$PORT/Phase1/260403_강사용UI.html"
  echo "  LLM 테스트:    http://localhost:$PORT/shared/llm-test.html"
  echo ""
  echo "  중지: ./stop.sh"
  echo "================================================"
else
  echo "서버 시작 실패"
  rm -f "$PID_FILE"
  exit 1
fi
