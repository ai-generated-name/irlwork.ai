# Humanwork.ai - MVP Startup Script

# Start the API server
echo "Starting Humanwork.ai API server..."
cd /home/humanwork-ai
node api/server.js &
API_PID=$!

# Wait for API to start
sleep 2

# Start the UI dev server
echo "Starting Humanwork.ai UI..."
cd ui
npm run dev -- --port 3003 --host 0.0.0.0 &
UI_PID=$!

echo "Humanwork.ai is running!"
echo "API: http://localhost:3002"
echo "UI: http://localhost:3003"

# Cleanup on exit
trap "kill $API_PID $UI_PID 2>/dev/null" EXIT
wait
