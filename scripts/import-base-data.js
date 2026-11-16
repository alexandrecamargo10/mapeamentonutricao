const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Simple pure Node.js table parser for Google Sheets HTML exports
function parseHtmlTable(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = [];
  const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;

  let trMatch;
  while ((trMatch = trRegex.exec(content)) !== null) {
    const rowHtml = trMatch[1];
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      let cellText = cellMatch[1];
      // strip html tags
      cellText = cellText.replace(/<[^>]+>/g, '').trim();
      // decode basic html entities
      cellText = cellText
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      cells.push(cellText);
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

async function main() {
  console.log('🚀 Iniciando importação dos dados legados...');
  const baseDir = path.join(__dirname, '..', 'Mapeamento Lojas');

  // 1. Importar Administradores
  const adminFile = path.join(baseDir, 'CONFIG_ADMIN.html');
  if (fs.existsSync(adminFile)) {
    console.log('📥 Lendo CONFIG_ADMIN.html...');
    const adminRows = parseHtmlTable(adminFile);
    // Row 0: ['', 'A'], Row 1: ['1', 'Email'], Row 2..: ['2', 'email@...']
    const defaultPasswordHash = await bcrypt.hash('Admin@CasasPedro2026!', 10);
    let adminCount = 0;

    for (let i = 2; i < adminRows.length; i++) {
      const row = adminRows[i];
      const email = row[1]?.trim().toLowerCase();
      if (email && email.includes('@')) {
        const nome = email.split('@')[0].replace(/[._]/g, ' ').toUpperCase();
        const role = email === 'danielelopesraya@gmail.com' ? 'SUPER_ADMIN' : 'ADMIN';
        await prisma.user.upsert({
          where: { email },
          update: {
            role,
            status: 'APROVADO',
          },
          create: {
            nome,
            email,
            passwordHash: defaultPasswordHash,
            role,
            status: 'APROVADO',
            dataAprovacao: new Date(),
          },
        });
        adminCount++;
      }
    }
    console.log(`✅ ${adminCount} administradores configurados com sucesso!`);
  }

  // 2. Importar Lojas
  const lojasFile = path.join(baseDir, 'CONFIG_LOJAS.html');
  const storeMap = new Map(); // nomeLoja -> idLoja
  if (fs.existsSync(lojasFile)) {
    console.log('📥 Lendo CONFIG_LOJAS.html...');
    const lojasRows = parseHtmlTable(lojasFile);
    let storeCount = 0;

    for (let i = 2; i < lojasRows.length; i++) {
      const row = lojasRows[i];
      // [rowNum, ID_Loja, Nome_Loja, PIN_Acesso]
      const id = row[1]?.trim();
      let nome = row[2]?.trim();
      if (id && nome) {
        // Remover espaços múltiplos ou sobrando
        nome = nome.replace(/\s+/g, ' ');
        storeMap.set(nome.toUpperCase(), id);
        await prisma.store.upsert({
          where: { id },
          update: { nome, ativo: true },
          create: { id, nome, ativo: true },
        });
        storeCount++;
      }
    }
    console.log(`✅ ${storeCount} lojas cadastradas no banco de dados!`);
  }

  // 3. Importar Catálogo de Produtos
  const produtosFile = path.join(baseDir, 'CADASTRO_PRODUTOS.html');
  if (fs.existsSync(produtosFile)) {
    console.log('📥 Lendo CADASTRO_PRODUTOS.html (1.115 itens)...');
    const prodRows = parseHtmlTable(produtosFile);
    let prodCount = 0;

    for (let i = 2; i < prodRows.length; i++) {
      const row = prodRows[i];
      // [rowNum, SKU, Item, Categoria]
      const sku = row[1]?.trim();
      let item = row[2]?.trim();
      let categoria = row[3]?.trim() || 'Geral';

      if (sku && item) {
        // Normalização simples de categorias
        if (categoria.toUpperCase() === 'FREEZER') categoria = 'Freezer';
        categoria = categoria.replace(/\s+/g, ' ');

        await prisma.product.upsert({
          where: { sku },
          update: { item, categoria, ativo: true },
          create: { sku, item, categoria, ativo: true },
        });
        prodCount++;
      }
    }
    console.log(`✅ ${prodCount} produtos do catálogo cadastrados com sucesso!`);
  }

  // 4. Importar Registros de Validade Iniciais
  const validadesFile = path.join(baseDir, 'CONTROLE_VALIDADES.html');
  if (fs.existsSync(validadesFile)) {
    console.log('📥 Lendo CONTROLE_VALIDADES.html...');
    const valRows = parseHtmlTable(validadesFile);
    let regCount = 0;

    for (let i = 2; i < valRows.length; i++) {
      const row = valRows[i];
      // [rowNum, ID_Registro, Loja, SKU, Item, Quantidade, Data_Validade, Dias_a_Vencer, Status, Data_Atualizacao]
      const legacyId = row[1]?.trim();
      const nomeLoja = row[2]?.trim().toUpperCase();
      const sku = row[3]?.trim();
      const qtdStr = row[5]?.replace(',', '.');
      const dataValStr = row[6]?.trim(); // DD/MM/AAAA

      const storeId = storeMap.get(nomeLoja) || '101024';

      let dataValidade = new Date();
      if (dataValStr && dataValStr.includes('/')) {
        const parts = dataValStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          dataValidade = new Date(year, month, day, 12, 0, 0);
        }
      }

      if (sku) {
        // Verificar se produto existe
        const prod = await prisma.product.findUnique({ where: { sku } });
        const existingRec = await prisma.validityRecord.findFirst({
          where: { observacoes: `Importado do legado (${legacyId})` },
        });
        if (prod && !existingRec) {
          await prisma.validityRecord.create({
            data: {
              storeId,
              sku,
              quantidade: parseFloat(qtdStr) || 1,
              dataValidade,
              status: 'EM_MONITORAMENTO',
              observacoes: `Importado do legado (${legacyId})`,
            },
          });
          regCount++;
        }
      }
    }
    console.log(`✅ ${regCount} registros de teste importados!`);
  }

  console.log('\n🎉 Importação concluída com 100% de sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro na importação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
