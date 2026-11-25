$ErrorActionPreference = "Stop"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$workerDir = Join-Path $scriptPath "worker"
$config = Join-Path $workerDir "wrangler.dev.toml"

node (Join-Path $scriptPath "scripts\validate-environment-config.mjs") $config dev
if ($LASTEXITCODE -ne 0) { throw "Development configuration validation failed." }

$configText = Get-Content -Raw -LiteralPath $config
$bucketMatch = [regex]::Match($configText, '(?m)^bucket_name\s*=\s*"([^"]+)"')
if (-not $bucketMatch.Success -or -not $bucketMatch.Groups[1].Value.Contains("dev")) {
    throw "Refusing deployment: isolated dev R2 bucket was not found."
}
$r2Bucket = $bucketMatch.Groups[1].Value

function Publish-Directory {
    param([string]$Source, [string]$Prefix)
    Get-ChildItem -LiteralPath $Source -File | ForEach-Object {
        $contentType = switch -Wildcard ($_.Name.ToLowerInvariant()) {
            "*.html" { "text/html"; break }
            "*.css" { "text/css"; break }
            "*.js" { "application/javascript"; break }
            "*.json" { "application/json"; break }
            "*.png" { "image/png"; break }
            "*.jpg" { "image/jpeg"; break }
            "*.jpeg" { "image/jpeg"; break }
            "*.svg" { "image/svg+xml"; break }
            "*.ico" { "image/x-icon"; break }
            default { "application/octet-stream" }
        }
        npx wrangler r2 object put "$r2Bucket/$Prefix/$($_.Name)" --file $_.FullName --content-type $contentType --remote
        if ($LASTEXITCODE -ne 0) { throw "Asset upload failed: $($_.Name)" }
    }
}

Push-Location $workerDir
try {
    Publish-Directory -Source (Join-Path $scriptPath "static") -Prefix "static"
    Publish-Directory -Source (Join-Path $scriptPath "admin-preview") -Prefix "admin-preview"
    npx wrangler deploy --config $config
    if ($LASTEXITCODE -ne 0) { throw "Development Worker deployment failed." }
} finally {
    Pop-Location
}

Write-Host "Isolated development deployment completed."
