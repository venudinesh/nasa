<#
PowerShell script to download GLB models into public/models/ and update manifest.json

Usage (PowerShell):
  .\scripts\download-models.ps1

Notes:
- This script downloads placeholder GLB files from the Khronos glTF Sample Models repo. These are permissively licensed sample models intended for demos.
- Replace or extend the $modelMap entries with URLs to the real planet GLBs you want and re-run the script.
- After running, the script writes `public/models/manifest.json` with mapping slug -> /models/<filename>.glb
#>

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$publicModelsDir = Join-Path $projectRoot '..\public\models' | Resolve-Path -Relative
$publicModelsDir = (Resolve-Path -Path (Join-Path $projectRoot '..\public\models')).ProviderPath

if (-not (Test-Path $publicModelsDir)) {
    Write-Host "Creating directory $publicModelsDir"
    New-Item -ItemType Directory -Path $publicModelsDir | Out-Null
}

# Map of planet slug -> remote GLB URL (example placeholders)
$modelMap = @{
    # Example replacements: these are Khronos sample models (suitable as placeholders)
    "k2-18b" = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb"
    "kepler-186f" = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb"
    # Add your own planet-specific model URLs below, e.g.
    # "trappist-1e" = "https://example.com/models/trappist-1e.glb"
}

$results = @{}

foreach ($slug in $modelMap.Keys) {
    try {
        $url = $modelMap[$slug]
        $fileName = [System.IO.Path]::GetFileName($url)
        if (-not $fileName) { $fileName = "$slug.glb" }
        $outPath = Join-Path $publicModelsDir $fileName
        Write-Host "Downloading $slug from $url -> $outPath"
        Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing
        if (Test-Path $outPath) {
            $results[$slug] = "/models/$fileName"
            Write-Host "Saved $slug -> $fileName"
        } else {
            Write-Warning "Download succeeded but file not found: $outPath"
        }
    } catch {
        # Safely extract error message without complex interpolation
        $errMsg = if ($_.Exception) { $_.Exception.Message } elseif ($_) { $_.ToString() } else { 'Unknown error' }
        # Build message without interpolation to avoid parser edge-cases
        $msg = 'Failed to download ' + $slug + ' from ' + $url + ': ' + $errMsg
        Write-Warning -Message $msg
    }
}

# Write manifest.json
$manifestPath = Join-Path (Join-Path $projectRoot '..\public') 'models\manifest.json'
$manifestObj = @{ models = $results }
$manifestJson = $manifestObj | ConvertTo-Json -Depth 5
Write-Host "Writing manifest to $manifestPath"
Set-Content -Path $manifestPath -Value $manifestJson -Encoding UTF8

Write-Host "Done. Review $publicModelsDir and $manifestPath."
Write-Host "Tip: replace placeholder URLs in scripts/download-models.ps1 with your desired planet GLB URLs and re-run."