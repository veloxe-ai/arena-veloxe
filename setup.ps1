# ARENA -- One-click setup
# Usage: Set-ExecutionPolicy Bypass -Scope Process -Force; .\setup.ps1

function Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  =============================================================" -ForegroundColor Cyan
    Write-Host "   ARENA -- Adversarial Multi-Agent AI Visibility Intelligence  " -ForegroundColor Cyan
    Write-Host "   by Veloxe AI  --  veloxe.ai                                 " -ForegroundColor Cyan
    Write-Host "  =============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Step($num, $total, $title) {
    Write-Host ""
    Write-Host "  -------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  STEP $num of $total  --  $title" -ForegroundColor Yellow
    Write-Host "  -------------------------------------------------------------" -ForegroundColor DarkGray
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

# -- WELCOME ------------------------------------------------------------------

Banner

Write-Host "  Welcome! This script sets up ARENA on your machine in ~60 sec." -ForegroundColor White
Write-Host "  You only need to do this once." -ForegroundColor White
Write-Host ""
Write-Host "  Steps:" -ForegroundColor DarkGray
Write-Host "    1. Check Node.js is installed" -ForegroundColor DarkGray
Write-Host "    2. Install all code packages  (npm install)" -ForegroundColor DarkGray
Write-Host "    3. Set up your OpenRouter API key" -ForegroundColor DarkGray
Write-Host "    4. Build the dashboard" -ForegroundColor DarkGray
Write-Host "    5. Show you how to run ARENA" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press any key to begin..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# -- STEP 1 -- Node.js --------------------------------------------------------

Banner
Step 1 5 "Checking Node.js"

INFO "Looking for Node.js on your system..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    WARN "Node.js was NOT found."
    Write-Host ""
    Write-Host "  To install it:" -ForegroundColor White
    Write-Host "    1. Go to:  https://nodejs.org" -ForegroundColor Cyan
    Write-Host "    2. Click the big green LTS button" -ForegroundColor Cyan
    Write-Host "    3. Run the installer (keep all defaults)" -ForegroundColor Cyan
    Write-Host "    4. Close this window and run setup.ps1 again" -ForegroundColor Cyan
    FAIL "Node.js required. Install it and re-run setup."
}

$nodeVersion = node --version
$npmVersion  = npm --version
OK "Node.js $nodeVersion is installed"
OK "npm $npmVersion is installed"
Write-Host ""
INFO "Your machine is ready to run ARENA."
Start-Sleep -Seconds 1

# -- STEP 2 -- npm install ----------------------------------------------------

Banner
Step 2 5 "Installing Dependencies"

INFO "Downloading all required packages..."
INFO "This may take 30-60 seconds on first run. Please wait."
Write-Host ""

npm install
if ($LASTEXITCODE -ne 0) { FAIL "npm install failed. Check your internet connection and try again." }

Write-Host ""
OK "All packages installed successfully."
Start-Sleep -Seconds 1

# -- STEP 3 -- API key --------------------------------------------------------

Banner
Step 3 5 "API Key Setup"

if (Test-Path ".env") {
    OK ".env file already exists -- skipping key setup."
    INFO "To change your key later, open the .env file in any text editor."
} else {
    Write-Host "  ARENA runs 3 AI agents: Claude, GPT, and Grok." -ForegroundColor White
    Write-Host "  They all connect through OpenRouter using one free API key." -ForegroundColor White
    Write-Host ""
    Write-Host "  How to get your key:" -ForegroundColor DarkGray
    Write-Host "    1. Go to:  https://openrouter.ai/keys" -ForegroundColor Cyan
    Write-Host "    2. Sign in or create a free account" -ForegroundColor Cyan
    Write-Host "    3. Click 'Create Key'" -ForegroundColor Cyan
    Write-Host "    4. Copy the key  (starts with sk-or-v1-...)" -ForegroundColor Cyan
    Write-Host "    5. Paste it below and press Enter" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  TIP: Add a few dollars of credit to your OpenRouter account." -ForegroundColor Yellow
    Write-Host "       A full ARENA run costs roughly 10-20 cents." -ForegroundColor Yellow
    Write-Host ""

    $key = Read-Host "  Paste your OpenRouter API key here"

    if (-not $key -or $key.Trim().Length -lt 10) {
        FAIL "No API key entered. Run setup.ps1 again when you have your key."
    }

    $key = $key.Trim()

    $line1  = "# ARENA environment variables"
    $line2  = "# Keep this file private -- never commit it to git"
    $line3  = ""
    $line4  = "# Required: your OpenRouter API key (openrouter.ai/keys)"
    $line5  = "OPENROUTER_API_KEY=" + $key
    $line6  = ""
    $line7  = "# Optional: Supabase for persistent run history (leave blank for demo mode)"
    $line8  = "SUPABASE_URL="
    $line9  = "SUPABASE_SERVICE_ROLE_KEY="
    $line10 = "VITE_SUPABASE_URL="
    $line11 = "VITE_SUPABASE_ANON_KEY="
    $line12 = ""
    $line13 = "# Optional: your Peec project ID (app.peec.ai -> Settings)"
    $line14 = "PEEC_PROJECT_ID="

    $envContent = ($line1, $line2, $line3, $line4, $line5, $line6, $line7,
                   $line8, $line9, $line10, $line11, $line12, $line13, $line14) -join "`r`n"

    Set-Content -Path ".env" -Value $envContent -Encoding utf8

    Write-Host ""
    OK ".env file created with your API key."
    INFO "Your key is stored locally and will never be committed to git."
}

Start-Sleep -Seconds 1

# -- STEP 4 -- Build ----------------------------------------------------------

Banner
Step 4 5 "Building the Dashboard"

INFO "Compiling the React dashboard (~15-30 seconds)..."
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
OK "Dashboard built."
Start-Sleep -Seconds 1

# -- STEP 5 -- Done -----------------------------------------------------------

Banner
Step 5 5 "You Are All Set!"

Write-Host "  ARENA is installed. Here is what to do next:" -ForegroundColor White
Write-Host ""
Write-Host "  -- Run an analysis -------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host '  npx tsx scripts/orchestrate.ts --brand "Your Brand Name"' -ForegroundColor White
Write-Host ""
Write-Host "  Replace 'Your Brand Name' with the brand you want to analyze." -ForegroundColor DarkGray
Write-Host "  ARENA pulls Peec data, runs 3 AI agents, and generates a brief." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  -- Open the live dashboard -----------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Then open:  http://localhost:3010" -ForegroundColor DarkGray
Write-Host "  The dashboard updates live as the orchestrator runs." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  =============================================================" -ForegroundColor Green
Write-Host "  Setup complete. Time to build your AI visibility edge." -ForegroundColor Green
Write-Host "  =============================================================" -ForegroundColor Green
Write-Host ""

pause
