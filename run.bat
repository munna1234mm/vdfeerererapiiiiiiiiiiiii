@echo off
echo Speed Optimization Mode: Using Local Chrome...
echo.
if not exist node_modules (
    echo node_modules not found. Installing...
    npm install
)
echo.
echo Starting Stripe Info API Server...
node index.js
pause
