# ARENA — Guided Setup
# Usage: powershell -ExecutionPolicy Bypass -File setup.ps1

$ESC = [char]27

function Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host "                                                                  " -ForegroundColor Cyan
    Write-Host "       /\  |  _ \  ____|  \ \   / /\                             " -ForegroundColor Cyan
    Write-Host "      /  \ | |_) | _|      \ \ / /  \                            " -ForegroundColor Cyan
    Write-Host "     / /\ \|  _ <  |        \ V / /\ \                           " -ForegroundColor Cyan
    Write-Host "    /_/  \_\_| \_\_____|      \_/_/  \_\                          " -ForegroundColor Cyan
    Write-Host "                                                                  " -ForegroundColor Cyan
    Write-Host "       Adversarial Multi-Agent AI Visibility Intelligence         " -ForegroundColor White
    Write-Host "       by Veloxe AI  --  veloxe.ai                               " -ForegroundColor DarkGray
    Write-Host "                                                                  " -ForegroundColor Cyan
    Write-Host "  ================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Step($num, $total, $title) {
    Write-Host ""
    Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  STEP $num of $total  --  $title" -ForegroundColor Yellow
    Write-Host "  ----------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host ""
}

function OK($msg)   { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function INFO($msg) { Write-Host "  [..]  $msg" -ForegroundColor White }
function WARN($msg) { Write-Host "  [!!]  $msg" -ForegroundColor Yellow }
function FAIL($msg) {
    Write-Host ""
    Write-Host "  [ERROR]  $msg" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Setup stopped. Fix the issue above and run setup.ps1 again." -ForegroundColor DarkGray
    Write-Host ""
    pause
    exit 1
}

function Dots($msg) {
    Write-Host -NoNewline "  [..]  $msg"
    for ($i = 0; $i -lt 3; $i++) { Start-Sleep -Milliseconds 350; Write-Host -NoNewline "." }
    Write-Host ""
}

# ── WELCOME ───────────────────────────────────────────────────────────────────

Banner

Write-Host "  Welcome! This script will set up ARENA on your machine in about" -ForegroundColor White
Write-Host "  60 seconds. You only need to do this once." -ForegroundColor White
Write-Host ""
Write-Host "  What we're about to do:" -ForegroundColor DarkGray
Write-Host "    1. Check that Node.js is installed" -ForegroundColor DarkGray
Write-Host "    2. Install all code dependencies (npm install)" -ForegroundColor DarkGray
Write-Host "    3. Set up your API key" -ForegroundColor DarkGray
Write-Host "    4. Build the dashboard" -ForegroundColor DarkGray
Write-Host "    5. Show you how to run ARENA" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press any key to begin..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# ── STEP 1 — Node.js check ────────────────────────────────────────────────────

Banner
Step 1 5 "Checking Node.js"

INFO "Looking for Node.js on your system..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    WARN "Node.js was NOT found on your machine."
    Write-Host ""
    Write-Host "  To install it:" -ForegroundColor White
    Write-Host "  1. Open your browser and go to:  https://nodejs.org" -ForegroundColor Cyan
    Write-Host "  2. Click the big green LTS button to download" -ForegroundColor Cyan
    Write-Host "  3. Run the installer (keep all defaults)" -ForegroundColor Cyan
    Write-Host "  4. Close this window and run setup.ps1 again" -ForegroundColor Cyan
    Write-Host ""
    FAIL "Node.js required. Install it and re-run setup."
}

$nodeVersion = node --version
$npmVersion  = npm --version
OK "Node.js $nodeVersion is installed"
OK "npm $npmVersion is installed"
Write-Host ""
Write-Host "  Great — your machine is ready to run ARENA." -ForegroundColor DarkGray

Start-Sleep -Seconds 1

# ── STEP 2 — npm install ──────────────────────────────────────────────────────

Banner
Step 2 5 "Installing Dependencies"

INFO "Downloading and installing all required packages..."
INFO "This may take 30-60 seconds on first run. Please wait."
Write-Host ""

npm install
if ($LASTEXITCODE -ne 0) { FAIL "npm install failed. Check your internet connection and try again." }

Write-Host ""
OK "All packages installed successfully"

Start-Sleep -Seconds 1

# ── STEP 3 — API key ──────────────────────────────────────────────────────────

Banner
Step 3 5 "API Key Setup"

if (Test-Path ".env") {
    OK ".env file already exists — skipping key setup"
    INFO "To change your key later, open the .env file in any text editor"
} else {
    Write-Host "  ARENA uses OpenRouter to run its AI agents (Claude, GPT, Grok)." -ForegroundColor White
    Write-Host "  You need a free API key to continue." -ForegroundColor White
    Write-Host ""
    Write-Host "  How to get your key:" -ForegroundColor DarkGray
    Write-Host "    1. Open your browser and go to:  https://openrouter.ai/keys" -ForegroundColor Cyan
    Write-Host "    2. Sign in or create a free account" -ForegroundColor Cyan
    Write-Host "    3. Click 'Create Key'" -ForegroundColor Cyan
    Write-Host "    4. Copy the key that starts with:  sk-or-v1-..." -ForegroundColor Cyan
    Write-Host "    5. Paste it below and press Enter" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  TIP: Add $2-$5 of credit to your OpenRouter account." -ForegroundColor Yellow
    Write-Host "       A full ARENA run costs roughly $0.10-0.20." -ForegroundColor Yellow
    Write-Host ""

    $key = Read-Host "  Paste your OpenRouter API key here"

    if (-not $key -or $key.Trim().Length -lt 10) {
        FAIL "No API key entered. Run setup.ps1 again when you have your key."
    }

    $key = $key.Trim()

    $envContent = @"
# ARENA environment variables
# Keep this file private -- never commit it to git

# Required: your OpenRouter API key (openrouter.ai/keys)
OPENROUTER_API_KEY=$key

# Optional: connect a Supabase project for persistent run history
# Leave blank to run in sample-data mode (fully functional for demo)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Optional: your Peec project ID (app.peec.ai -> Settings)
# Leave blank to run against the sample dataset
PEEC_PROJECT_ID=
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host ""
    OK ".env file created with your API key"
    INFO "Your key is stored locally in the .env file"
    INFO "It is listed in .gitignore and will never be committed to git"
}

Start-Sleep -Seconds 1

# ── STEP 4 — Build dashboard ──────────────────────────────────────────────────

Banner
Step 4 5 "Building the Dashboard"

INFO "Compiling the React dashboard..."
INFO "This takes about 15-30 seconds..."
Write-Host ""

npm run build 2>&1 | ForEach-Object {
    if ($_ -match "error" -and $_ -notmatch "stderr") {
        Write-Host "  $_" -ForegroundColor Red
    } elseif ($_ -match "built in|dist/") {
        Write-Host "  $_" -ForegroundColor Green
    } else {
        Write-Host "  $_" -ForegroundColor DarkGray
    }
}

Write-Host ""
OK "Dashboard built and ready"

Start-Sleep -Seconds 1

# ── STEP 5 — You're ready ─────────────────────────────────────────────────────

Banner
Step 5 5 "You're All Set!"

Write-Host "  ARENA is installed and ready to run. Here's what to do next:" -ForegroundColor White
Write-Host ""

Write-Host "  ── Run an ARENA analysis ────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host '  npx tsx scripts/orchestrate.ts --brand "Your Brand Name"' -ForegroundColor White
Write-Host ""
Write-Host "  Replace 'Your Brand Name' with the brand you want to analyze." -ForegroundColor DarkGray
Write-Host "  ARENA will pull Peec data, run 3 AI agents, and generate a brief." -ForegroundColor DarkGray
Write-Host ""

Write-Host "  ── Open the live dashboard ──────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Then open your browser to:  http://localhost:3010" -ForegroundColor DarkGray
Write-Host "  The dashboard updates live as the orchestrator runs." -ForegroundColor DarkGray
Write-Host ""

Write-Host "  ── Pull live data from Peec (optional) ──────────────────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host '  bash scripts/peec-pull.sh "Your Brand" your-peec-project-id' -ForegroundColor White
Write-Host ""
Write-Host "  Your Peec project ID is in app.peec.ai -> Settings." -ForegroundColor DarkGray
Write-Host ""

Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "  Setup complete. Time to build your AI visibility edge." -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""

pause
