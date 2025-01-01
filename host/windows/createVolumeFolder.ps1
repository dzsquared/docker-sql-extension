param (
    [string]$containerName
)

$homeDir = [System.Environment]::GetFolderPath('UserProfile')
$volumeDirectory = "$homeDir\.sqlcontainers"

if (-not (Test-Path -Path $volumeDirectory)) {
    New-Item -ItemType Directory -Path $volumeDirectory -Force
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$volumeName = "${containerName}_$timestamp"

$containerDirectory = "$volumeDirectory\$volumeName"

if (-not (Test-Path -Path $containerDirectory)) {
    New-Item -ItemType Directory -Path $containerDirectory -Force
}

Write-Output $containerDirectory