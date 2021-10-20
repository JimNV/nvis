@echo off
set PORT=80
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
for /D %%D in ("%SCRIPT_DIR%") do (
    set "NVIS_DIR=%%~dpD"
)

rem #PYTHON_VERSION=`python --version`
echo [Nvis]  Starting HTTP server on port %PORT% in %NVIS_DIR%
python -m http.server --bind localhost %PORT% -d %NVIS_DIR%
