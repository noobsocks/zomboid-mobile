@echo off
setlocal
rem ============================================================
rem  DEAD TOWN - upload to GitHub (double-click to run)
rem  First run: asks for your GitHub repository URL once.
rem  Then: checks changes, bumps sw.js VERSION, commit, push.
rem  Optional: upload_to_github.bat "your commit message"
rem ============================================================
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 goto :nogit

if not exist ".git" goto :setup

:start
rem git needs a name for commits (only set for this folder, if missing)
git config user.name >nul 2>nul || git config user.name "deadtown"
git config user.email >nul 2>nul || git config user.email "deadtown@users.noreply.github.com"

rem stop tracking raw sound files and local notes (they stay on this PC)
git rm -r -q --cached --ignore-unmatch sfx_raw "Claude outputs" >nul 2>nul

set "CHG="
for /f "delims=" %%c in ('git status --porcelain 2^>nul') do set "CHG=1"
if not defined CHG goto :nochange
echo [1/4] Changes found.

rem bump cache version in sw.js so phones get the new files
if exist sw.js powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=(Resolve-Path 'sw.js').Path; $t=[IO.File]::ReadAllText($p); $m=[regex]::Match($t,'deadtown-v(\d+)'); if($m.Success){ $n=[int]$m.Groups[1].Value+1; $t=$t.Replace($m.Value,'deadtown-v'+$n); [IO.File]::WriteAllText($p,$t,(New-Object Text.UTF8Encoding $false)) }"
set "VER=?"
for /f "tokens=2 delims='" %%v in ('findstr /c:"const VERSION" sw.js 2^>nul') do set "VER=%%v"
echo [2/4] Version: %VER%

set "NOW="
for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "NOW=%%d"
set "MSG=update %NOW% (%VER%)"
if not "%~1"=="" set "MSG=%~1 (%VER%)"

git add -A
git commit -q -m "%MSG%"
if errorlevel 1 goto :commitfail
echo [3/4] Commit: %MSG%

git push -q
if not errorlevel 1 goto :done
git push -u origin HEAD -q
if not errorlevel 1 goto :done
echo Push failed. Syncing with GitHub first...
git pull --rebase --autostash -q
if errorlevel 1 goto :pullfail
git push -u origin HEAD -q
if errorlevel 1 goto :pushfail

:done
echo [4/4] Uploaded to GitHub.
echo GitHub Pages usually updates in 1-2 minutes.
goto :end

rem ------------------------------------------------------------
:setup
echo This folder is not connected to GitHub yet. One-time setup.
echo Open your repository page on github.com, press the green "Code" button,
echo copy the HTTPS address, and paste it here (right-click to paste).
echo.
set "URL="
set /p "URL=Repository URL: "
if not defined URL goto :end
git init -q
git remote add origin "%URL%"
echo Connecting to GitHub (a login window may appear)...
git fetch -q origin
if errorlevel 1 goto :fetchfail

set "BR="
for /f "tokens=2" %%b in ('git ls-remote --symref origin HEAD 2^>nul ^| findstr /b "ref:"') do set "BR=%%b"
if not defined BR set "BR=refs/heads/main"
set "BR=%BR:refs/heads/=%"
git checkout -q -b %BR%

git rev-parse -q --verify "origin/%BR%" >nul 2>nul
if errorlevel 1 goto :setupdone
rem safety: the repository must have the game files at its top level
git cat-file -e "origin/%BR%:index.html" 2>nul
if errorlevel 1 goto :layout
rem keep the files on this PC, take history from GitHub
git reset -q "origin/%BR%"
git branch -q --set-upstream-to="origin/%BR%"

:setupdone
echo Connected: %URL% (branch %BR%)
echo.
goto :start

rem ------------------------------------------------------------
:nogit
echo [ERROR] Git is not installed or not in PATH.
echo Install from https://git-scm.com and run again.
goto :end
:fetchfail
echo [ERROR] Could not reach that repository. Check the URL and your GitHub login.
rmdir /s /q .git
goto :end
:layout
echo [ERROR] On GitHub, index.html is not at the top of the repository.
echo The repository seems to use a different folder layout. Nothing was uploaded.
rmdir /s /q .git
goto :end
:nochange
echo Nothing changed. Nothing to upload.
goto :end
:commitfail
echo [ERROR] Commit failed. Check the messages above.
goto :end
:pullfail
echo [ERROR] Could not sync with GitHub (conflict?). Nothing was lost on this PC.
goto :end
:pushfail
echo [ERROR] Push failed. Check your internet or GitHub login.
goto :end

:end
echo.
pause
endlocal
