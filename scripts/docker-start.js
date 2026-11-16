const { execSync, spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function start() {
  console.log('====================================================');
  console.log('🚀 Inicializando Container - Controle de Validades');
  console.log('====================================================');

  try {
    console.log('📦 Sincronizando estrutura do banco de dados (Prisma)...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

    const prisma = new PrismaClient();
    const storeCount = await prisma.store.count();
    await prisma.$disconnect();

    if (storeCount === 0) {
      console.log('🌱 Banco de dados vazio detectado. Importando carga inicial (75 lojas, 1.115 SKUs, Admins)...');
      execSync('node scripts/import-base-data.js', { stdio: 'inherit' });
    } else {
      console.log(`✅ Banco de dados já populado (${storeCount} lojas ativas).`);
    }
  } catch (err) {
    console.error('⚠️ Aviso durante preparação do banco de dados:', err.message);
  }

  const port = process.env.PORT || '3000';
  console.log(`🌐 Iniciando servidor Next.js na porta ${port}...`);

  const server = spawn('npx', ['next', 'start', '-p', port], {
    stdio: 'inherit',
    shell: true,
  });

  process.on('SIGTERM', () => server.kill('SIGTERM'));
  process.on('SIGINT', () => server.kill('SIGINT'));

  server.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

start();
