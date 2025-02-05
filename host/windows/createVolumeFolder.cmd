@echo off
setlocal

set "containerName=%1"

set "homeDir=%USERPROFILE%"
set "volumeDirectory=%homeDir%\.sqlcontainers"

if not exist "%volumeDirectory%" (
    mkdir "%volumeDirectory%"
)

for /f "tokens=*" %%i in ('powershell -Command "Get-Date -Format \"yyyyMMddHHmmss\""') do set "timestamp=%%i"
set "volumeName=%containerName%_%timestamp%"

set "containerDirectory=%volumeDirectory%\%volumeName%"

if not exist "%containerDirectory%" (
    mkdir "%containerDirectory%"
)

echo %containerDirectory%
endlocal