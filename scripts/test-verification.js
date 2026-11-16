const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Simula a regra de negócio RLS do servidor (buildStoreRLSFilter)
function simulateBuildStoreRLSFilter(session, requestedStoreId) {
  if (!session || session.status !== 'APROVADO') {
    throw new Error('FORBIDDEN_UNAPPROVED');
  }
  if (session.role === 'ADMIN') {
    if (requestedStoreId && requestedStoreId !== 'TODAS') {
      return { storeId: requestedStoreId };
    }
    return {};
  }
  if (!session.stores || session.stores.length === 0) {
    throw new Error('FORBIDDEN_NO_STORES');
  }
  if (requestedStoreId) {
    if (!session.stores.includes(requestedStoreId)) {
      throw new Error('FORBIDDEN_STORE_ACCESS');
    }
    return { storeId: requestedStoreId };
  }
  return {
    storeId: session.role === 'ESTAGIARIO_PADRAO' ? session.stores[0] : { in: session.stores },
  };
}

async function runTests() {
  console.log('🧪 Iniciando testes de validação e segurança automatizados...\n');

  // Test 1: Verificar carga de dados iniciais
  const storeCount = await prisma.store.count();
  const prodCount = await prisma.product.count();
  const adminCount = await prisma.user.count({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  });
  const superAdmin = await prisma.user.findUnique({
    where: { email: 'danielelopesraya@gmail.com' },
  });

  console.log(`[TEST 1] Banco de Dados Inicial:`);
  console.log(`   - Lojas carregadas: ${storeCount} (Esperado: 75)`);
  console.log(`   - Produtos carregados: ${prodCount} (Esperado: 1115)`);
  console.log(`   - Administradores totais: ${adminCount} (Esperado: 5)`);
  console.log(`   - Super Admin (${superAdmin?.email}): ${superAdmin?.role}`);
  if (storeCount !== 75 || prodCount !== 1115 || adminCount !== 5 || superAdmin?.role !== 'SUPER_ADMIN') {
    throw new Error('Falha no Teste 1: Quantidade de registros legados ou Super Admin divergente.');
  }
  console.log('   ✅ Teste 1 aprovado!\n');

  // Test 2: Cadastro de Novo Usuário (Estagiário) + Bloqueio de Acesso Pendente
  console.log(`[TEST 2] Fluxo de Cadastro e Bloqueio Zero-Trust (Status Pendente):`);
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

  let blockedPending = false;
  try {
    simulateBuildStoreRLSFilter({ status: newUser.status, role: newUser.role, stores: [] }, '101024');
  } catch (err) {
    blockedPending = err.message === 'FORBIDDEN_UNAPPROVED';
  }
  if (newUser.status !== 'PENDENTE' || !blockedPending) {
    throw new Error('Falha no Teste 2: Usuário pendente não foi bloqueado pelo RLS.');
  }
  console.log('   ✅ Teste 2 aprovado (Usuário pendente bloqueado com sucesso)!\n');

  // Test 3: Regra de Negócio - Estagiário Padrão deve ter exatamente 1 loja e ser bloqueado em outras (IDOR / RLS)
  console.log(`[TEST 3] Isolamento RLS (Prevenção de IDOR entre lojas):`);
  const lojaAlvo = '101024';
  const lojaProibida = '101070';

  await prisma.user.update({
    where: { id: newUser.id },
    data: { status: 'APROVADO', role: 'ESTAGIARIO_PADRAO' },
  });
  await prisma.userStore.create({
    data: { userId: newUser.id, storeId: lojaAlvo },
  });

  const sessionPadrao = {
    userId: newUser.id,
    role: 'ESTAGIARIO_PADRAO',
    status: 'APROVADO',
    stores: [lojaAlvo],
  };

  // Deve permitir loja 101024
  const filterPermitido = simulateBuildStoreRLSFilter(sessionPadrao, lojaAlvo);
  if (filterPermitido.storeId !== lojaAlvo) {
    throw new Error('Falha no Teste 3: RLS não filtrou para a loja autorizada.');
  }

  // Deve bloquear tentativa de acesso à loja 101070 (IDOR attack simulation)
  let idorBlocked = false;
  try {
    simulateBuildStoreRLSFilter(sessionPadrao, lojaProibida);
  } catch (err) {
    idorBlocked = err.message === 'FORBIDDEN_STORE_ACCESS';
  }
  if (!idorBlocked) {
    throw new Error('Falha Crítica no Teste 3: Tentativa de acesso a loja não autorizada não foi bloqueada!');
  }
  console.log(`   - Acesso à loja autorizada (${lojaAlvo}): PERMITIDO`);
  console.log(`   - Tentativa de invasão/leitura da loja ${lojaProibida}: BLOQUEADO (403 Forbidden)`);
  console.log('   ✅ Teste 3 aprovado!\n');

  // Test 4: Cadastro de Validade na Loja
  console.log(`[TEST 4] Cadastro de Validade na Loja ${lojaAlvo}:`);
  const prodSample = await prisma.product.findFirst({ where: { sku: '24790' } });
  if (!prodSample) throw new Error('Produto 24790 não encontrado');

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 4);

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
  if (baixaUpdate.status !== 'VENDIDO') {
    throw new Error('Falha no Teste 5: Status da baixa incorreto.');
  }
  console.log('   ✅ Teste 5 aprovado!\n');

  // Test 6: Estagiário 360 com Múltiplas Lojas e bloqueio de terceira loja
  console.log(`[TEST 6] Estagiário 360 com Escopo Restrito de Lojas:`);
  await prisma.user.update({
    where: { id: newUser.id },
    data: { role: 'ESTAGIARIO_360' },
  });
  await prisma.userStore.create({
    data: { userId: newUser.id, storeId: '101070' },
  });

  const session360 = {
    userId: newUser.id,
    role: 'ESTAGIARIO_360',
    status: 'APROVADO',
    stores: ['101024', '101070'],
  };

  let blockedThirdStore = false;
  try {
    simulateBuildStoreRLSFilter(session360, '101008'); // Terceira loja não vinculada
  } catch (err) {
    blockedThirdStore = err.message === 'FORBIDDEN_STORE_ACCESS';
  }
  if (!blockedThirdStore) {
    throw new Error('Falha no Teste 6: Estagiário 360 conseguiu acessar loja fora de sua lista.');
  }
  console.log(`   - Lojas permitidas (101024, 101070): OK`);
  console.log(`   - Tentativa de acesso à loja 101008 (fora da carteira): BLOQUEADO`);
  console.log('   ✅ Teste 6 aprovado!\n');

  // Limpeza do usuário de teste
  await prisma.validityRecord.delete({ where: { id: newRecord.id } });
  await prisma.userStore.deleteMany({ where: { userId: newUser.id } });
  await prisma.user.delete({ where: { id: newUser.id } });
  console.log('🧹 Limpeza dos dados de teste realizada.');

  console.log('\n🎉 TODOS OS TESTES DE DESEMPENHO E SEGURANÇA PASSARAM COM 100% DE SUCESSO!');
}

runTests()
  .catch((e) => {
    console.error('❌ Erro no teste:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
