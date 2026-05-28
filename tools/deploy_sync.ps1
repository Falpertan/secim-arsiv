param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Dest
)

$ErrorActionPreference = 'Stop'
$Source = $Source.TrimEnd('\')
$Dest = $Dest.TrimEnd('\')

function Sync-Dir {
    param([string]$Name)
    $srcPath = Join-Path $Source $Name
    if (-not (Test-Path $srcPath)) { return }
    $destPath = Join-Path $Dest $Name
    if (-not (Test-Path $destPath)) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    }
    Copy-Item -Path (Join-Path $srcPath '*') -Destination $destPath -Recurse -Force
}

foreach ($dir in @('assets', 'modules', 'data', 'tools', 'promo', 'docs', 'favicons', '.github')) {
    Sync-Dir $dir
}

foreach ($file in @(
    'index.html', 'site.webmanifest', 'SUNUCU.bat', 'YAYIN.bat',
    'parties.json', 'LICENSE', 'DATA_LICENSE', 'README.md'
)) {
    $srcFile = Join-Path $Source $file
    if (Test-Path $srcFile) {
        Copy-Item $srcFile (Join-Path $Dest $file) -Force
    }
}

Write-Host "Kopyalandi: $Source -> $Dest"
