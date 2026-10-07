param(
  [switch]$Once,
  [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI (gh) is not installed. Install it, then run gh auth login."
}

if (-not $env:OPENAI_API_KEY) {
  throw "OPENAI_API_KEY is not set. Set it in this PowerShell window before starting the agent."
}

if ($AutoApprove) {
  $env:AGENT_AUTO_APPROVE = "true"
} elseif (-not $env:AGENT_AUTO_APPROVE) {
  $env:AGENT_AUTO_APPROVE = "false"
}

if ($Once) {
  pnpm agent:local -- --once
} else {
  pnpm agent:local
}
