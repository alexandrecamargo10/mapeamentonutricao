import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, canAccessStore } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.status !== 'APROVADO') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, motivoBaixa } = body;

  const validStatuses = ['VENDIDO', 'DESCARTADO', 'RETIRADO', 'DOADO'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Status inválido. Escolha um entre: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  const record = await prisma.validityRecord.findUnique({
    where: { id },
  });

  if (!record) {
    return NextResponse.json(
      { error: 'Registro de validade não encontrado.' },
      { status: 404 }
    );
  }

  if (!canAccessStore(session, record.storeId)) {
    return NextResponse.json(
      { error: 'Acesso negado para modificar registros desta loja.' },
      { status: 403 }
    );
  }

  const updated = await prisma.validityRecord.update({
    where: { id },
    data: {
      status,
      motivoBaixa: motivoBaixa?.trim() || null,
      dataBaixa: new Date(),
      baixadoPorId: session.userId,
    },
    include: {
      product: true,
      store: true,
      baixadoPor: { select: { id: true, nome: true } },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      acao: 'BAIXA_REGISTRO',
      userId: session.userId,
      storeId: record.storeId,
      detalhes: JSON.stringify({
        recordId: record.id,
        statusAnterior: record.status,
        novoStatus: status,
        motivoBaixa: motivoBaixa || null,
      }),
    },
  });

  return NextResponse.json({ success: true, record: updated });
}
