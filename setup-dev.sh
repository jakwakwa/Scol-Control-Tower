#!/bin/bash

# Development environment startup script
# Starts Inngest Dev Server + Next.js App

cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT

echo "🚀 Starting Local Development Environment..."
echo ""

# 1. Start Inngest Dev Server (Background)
echo "⏳ Starting Inngest Dev Server..."
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest &
INNGEST_PID=$!

# Wait for Inngest to initialize
sleep 3

# 2. Start Next.js App (Background)
echo "💻 Starting Next.js App..."
export INNGEST_BASE_URL=http://127.0.0.1:8288
bun run dev &
NEXT_PID=$!

echo ""
echo "✅ All services started!"
echo ""
echo "   📊 Inngest Dev UI:  http://localhost:8288"
echo "   🌐 Next.js App:     http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services."

wait
