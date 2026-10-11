$ErrorActionPreference = 'Stop'
$scannerVersion = '8.30.1'
$scannerArchiveChecksum = 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e'
$scannerRoot = Split-Path -Parent $PSScriptRoot
$scannerDirectory = Join-Path $scannerRoot '.tools/gitleaks'
$scannerArchive = "gitleaks_${scannerVersion}_windows_x64.zip"
New-Item -ItemType Directory -Force -Path $scannerDirectory | Out-Null
$scannerArchivePath = Join-Path $scannerDirectory $scannerArchive
Invoke-WebRequest -Uri "https://github.com/gitleaks/gitleaks/releases/download/v$scannerVersion/$scannerArchive" -OutFile $scannerArchivePath
if ((Get-FileHash -LiteralPath $scannerArchivePath -Algorithm SHA256).Hash -ne $scannerArchiveChecksum) {
    throw 'Gitleaks checksum verification failed. Installation stopped.'
}
Expand-Archive -LiteralPath $scannerArchivePath -DestinationPath $scannerDirectory -Force
Write-Output "Gitleaks $scannerVersion installed in the ignored .tools directory."
