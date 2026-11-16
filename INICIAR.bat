@echo off
title Controle de Validades - Casas Pedro
cd /d "%~dp0"

echo ===================================================
echo   Controle de Validades - Casas Pedro
echo ===================================================
echo.

:: 1. Verifica se o Node.js esta instalado no computador
where node >nul 2>&1
if %errorlevel% neq 0 goto SEM_NODE

:: 2. Cria o arquivo .env automaticamente caso nao exista
if not exist ".env" (
    if exist ".env.example" (
        echo [CONFIGURACAO] Criando arquivo .env padrao...
        copy /Y ".env.example" ".env" >nul
    )
)

:: 3. Instala as dependencias automaticamente na primeira vez neste computador
if not exist "node_modules" (
    echo [PRIMEIRA EXECUCAO] Instalando pacotes do sistema... Aguarde de 1 a 2 minutos...
    call npm install
    echo.
)

:: 4. Cria o banco de dados e importa as 75 lojas e 1.115 produtos se ainda nao existir
if not exist "prisma\dev.db" (
    echo [BANCO DE DADOS] Criando estrutura e importando as 75 lojas e 1.115 produtos...
    call npx prisma db push
    call node scripts/import-base-data.js
    echo.
)

echo Aguarde alguns instantes enquanto o servidor e inicializado...
echo O navegador abrira automaticamente em: http://localhost:3000
echo.
echo Para encerrar o sistema, basta fechar esta janela.
echo ===================================================
echo.

:: Abre o navegador com um breve delay para dar tempo do Next.js subir
start /b "" cmd /c "ping 127.0.0.1 -n 5 >nul & start http://localhost:3000"

:: Inicia o servidor Next.js
call npm run dev
pause
exit /b 0

:SEM_NODE
echo [ATENCAO] O Node.js nao foi encontrado neste computador!
echo.
echo Para rodar o sistema em um computador novo, instale apenas o Node.js:
echo 1. O site oficial https://nodejs.org sera aberto agora no seu navegador.
echo 2. Clique no botao verde para baixar o Node.js LTS e instale normalmente.
echo 3. Depois de instalar, feche e abra novamente este arquivo INICIAR.bat.
echo.
start https://nodejs.org/pt-br
pause
exit /b 1
