param (
    [string]$containerDirectory
)

if (Test-Path -Path $containerDirectory -PathType Container) {
    Remove-Item -Path $containerDirectory -Recurse -Force
}
