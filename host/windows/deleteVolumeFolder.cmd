@echo off
setlocal

set "containerDirectory=%1"

if exist "%containerDirectory%" (
    rmdir /s /q "%containerDirectory%"
)