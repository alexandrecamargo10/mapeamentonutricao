@echo off
title Controle de Validades - Casas Pedro
cd /d "%~dp0"

echo ===================================================
echo   Iniciando Controle de Validades - Casas Pedro
echo ===================================================
echo.
echo Aguarde alguns instantes enquanto o servidor e inicializado...
echo O navegador abrira automaticamente em: http://localhost:3000
echo.
echo Para encerrar o sistema, basta fechar esta janela.
echo ===================================================
echo.

:: Abre o navegador com um breve delay para dar tempo do Next.js subir
start /b "" cmd /c "timeout /t 4 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 5 >nul & start http://localhost:3000"

:: Inicia o servidor Next.js
call npm run dev

pause
