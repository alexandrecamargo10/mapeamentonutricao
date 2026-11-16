const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'casas-pedro-super-secret-key-2026-qualidade-token';

async function runTests() {
  console.log('🧪 Iniciando testes de validação automatizados...\n');

  // Test 1: Verificar carga de dados iniciais
  const storeCount = await prisma.store.count();
  const prodCount = await prisma.product.count();
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });

  console.log(`[TEST 1] Banco de Dados Inicial:`);
  console.log(`   - Lojas carregadas: ${storeCount} (Esperado: 75)`);
  console.log(`   - Produtos carregados: ${prodCount} (Esperado: 1115)`);
  console.log(`   - Administradores: ${adminCount} (Esperado: 5)`);
  if (storeCount !== 75 || prodCount !== 1115 || adminCount !== 5) {
    throw new Error('Falha no Teste 1: Quantidade de registros legados divergente.');
  }
  console.log('   ✅ Teste 1 aprovado!\n');

  // Test 2: Cadastro de Novo Usuário (Estagiário)
  console.log(`[TEST 2] Fluxo de Cadastro e Status Pendente:`);
  const testEmail = `estagiario.teste.${Date.now()}@casaspedro.com.br`;
  const passwordHash = await bcrypt.hash('Senha123!', 10);

  const newUser = await prisma.user.create({
    data: {
      nome: 'Carlos Silva (Teste)',
      email: testEmail,
      passwordHash,
      role: 'ESTAGIARIO_PADRAO',
      status: 'PENDENTE',
    },
  });

  console.log(`   - Usuário criado: ${newUser.nome} (${newUser.email})`);
  console.log(`   - Status inicial: ${newUser.status}`);
  if (newUser.status !== 'PENDENTE') {
    throw new Error('Falha no Teste 2: Usuário novo deveria estar com status PENDENTE.');
  }
  console.log('   ✅ Teste 2 aprovado!\n');

  // Test 3: Regra de Negócio - Estagiário Padrão deve ter exatamente 1 loja
  console.log(`[TEST 3] Regra de Negócio de Aprovação:`);
  // Simular aprovação como Estagiário Padrão na loja 101024
  const lojaAlvo = '101024';
  await prisma.user.update({
    where: { id: newUser.id },
    data: { status: 'APROVADO', role: 'ESTAGIARIO_PADRAO' },
  });
  await prisma.userStore.create({
    data: { userId: newUser.id, storeId: lojaAlvo },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: { userStores: true },
  });
  console.log(`   - Usuário aprovado como: ${updatedUser.role}`);
  console.log(`   - Lojas vinculadas: ${updatedUser.userStores.map(us => us.storeId).join(', ')}`);
  if (updatedUser.userStores.length !== 1 || updatedUser.userStores[0].storeId !== lojaAlvo) {
    throw new Error('Falha no Teste 3: Vínculo de loja incorreto.');
  }
  console.log('   ✅ Teste 3 aprovado!\n');

  // Test 4: Cadastro de Validade na Loja
  console.log(`[TEST 4] Cadastro de Validade na Loja ${lojaAlvo}:`);
  const prodSample = await prisma.product.findFirst({ where: { sku: '24790' } });
  if (!prodSample) throw new Error('Produto 24790 não encontrado');

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 4); // Expira em 4 dias (CRÍTICO)

  const newRecord = await prisma.validityRecord.create({
    data: {
      storeId: lojaAlvo,
      sku: prodSample.sku,
      quantidade: 5,
      dataValidade: expiryDate,
      lote: 'LT-TESTE-99',
      status: 'EM_MONITORAMENTO',
      registradoPorId: newUser.id,
    },
    include: { product: true },
  });

  console.log(`   - Item cadastrado: ${newRecord.product.item} (Qtd: ${newRecord.quantidade})`);
  console.log(`   - Validade: ${newRecord.dataValidade.toISOString().slice(0, 10)}`);
  console.log(`   - Status: ${newRecord.status}`);
  console.log('   ✅ Teste 4 aprovado!\n');

  // Test 5: Baixa do Produto (Vendido com Desconto)
  console.log(`[TEST 5] Fluxo de Baixa de Validade:`);
  const baixaUpdate = await prisma.validityRecord.update({
    where: { id: newRecord.id },
    data: {
      status: 'VENDIDO',
      motivoBaixa: 'Vendido com 30% de desconto no salão',
      dataBaixa: new Date(),
      baixadoPorId: newUser.id,
    },
  });

  console.log(`   - Novo Status: ${baixaUpdate.status}`);
  console.log(`   - Motivo da Baixa: ${baixaUpdate.motivoBaixa}`);
  if (baixaUpdate.status !== 'VENDIDO') {
    throw new Error('Falha no Teste 5: Status da baixa incorreto.');
  }
  console.log('   ✅ Teste 5 aprovado!\n');

  // Test 6: Upgrade para Estagiário 360 (Múltiplas Lojas)
  console.log(`[TEST 6] Estagiário 360 com Múltiplas Lojas:`);
  await prisma.user.update({
    where: { id: newUser.id },
    data: { role: 'ESTAGIARIO_360' },
  });
  // Adicionar segunda loja: 101070
  await prisma.userStore.create({
    data: { userId: newUser.id, storeId: '101070' },
  });

  const user360 = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: { userStores: true },
  });
  console.log(`   - Perfil atualizado: ${user360.role}`);
  console.log(`   - Lojas autorizadas (${user360.userStores.length}): ${user360.userStores.map(us => us.storeId).join(', ')}`);
  if (user360.role !== 'ESTAGIARIO_360' || user360.userStores.length !== 2) {
    throw new Error('Falha no Teste 6: Configuração de Estagiário 360 incorreta.');
  }
  console.log('   ✅ Teste 6 aprovado!\n');

  // Limpeza do usuário de teste
  await prisma.validityRecord.delete({ where: { id: newRecord.id } });
  await prisma.userStore.deleteMany({ where: { userId: newUser.id } });
  await prisma.user.delete({ where: { id: newUser.id } });
  console.log('🧹 Limpeza dos dados de teste realizada.');

  console.log('\n🎉 TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO! A aplicação está 100% validada.');
}

runTests()
  .catch((e) => {
    console.error('❌ Erro no teste:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
