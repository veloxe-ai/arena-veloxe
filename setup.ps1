# ARENA — One-click setup
# Usage: Right-click -> Run with PowerShell
# Or: powershell -ExecutionPolicy Bypass -File setup.ps1

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   ARENA — Adversarial AI Visibility      ║" -ForegroundColor Cyan
Write-Host "  ║   by Veloxe AI  |  veloxe.ai             ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] Node.js not found. Install from nodejs.org first." -ForegroundColor Red
    pause; exit 1
}
$nodeVersion = node --version
Write-Host "  Node $nodeVersion detected" -ForegroundColor Green

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] npm not found." -ForegroundColor Red
    pause; exit 1
}

# Install dependencies
Write-Host ""
Write-Host "  Installing dependencies..." -ForegroundColor Yellow
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] npm install failed." -ForegroundColor Red
    pause; exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green

# .env setup
if (Test-Path ".env") {
    Write-Host ""
    Write-Host "  .env already exists — skipping key setup." -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "  ── API Key Setup ─────────────────────────────" -ForegroundColor Cyan
    Write-Host "  Get a free key at: openrouter.ai/keys" -ForegroundColor White
    Write-Host ""
    $key = Read-Host "  Paste your OpenRouter API key"

    if (-not $key -or $key.Length -lt 10) {
        Write-Host "  [ERROR] No key entered. Add OPENROUTER_API_KEY to .env manually." -ForegroundColor Red
        pause; exit 1
    }

    $envContent = @"
OPENROUTER_API_KEY=$key

# Optional — connect live Supabase for persistent run history
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Your Peec project ID (from app.peec.ai)
PEEC_PROJECT_ID=
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "  .env created." -ForegroundColor Green
}

# Build frontend
Write-Host ""
Write-Host "  Building dashboard..." -ForegroundColor Yellow
npm run build --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build had warnings (non-fatal — continuing)." -ForegroundColor DarkYellow
} else {
    Write-Host "  Dashboard built." -ForegroundColor Green
}

# Done
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   Setup complete. Ready to run ARENA.    ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Run the orchestrator:" -ForegroundColor White
Write-Host '  npx tsx scripts/orchestrate.ts --brand "Your Brand"' -ForegroundColor Cyan
Write-Host ""
Write-Host "  Then open the dashboard:" -ForegroundColor White
Write-Host "  npm run dev   ->   http://localhost:3010" -ForegroundColor Cyan
Write-Host ""

pause
