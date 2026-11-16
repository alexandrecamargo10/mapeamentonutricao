import * as XLSX from 'xlsx';

export function exportToExcelFile(
  rows: Record<string, any>[],
  sheetName: string,
  filePrefix: string
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filePrefix}_${dateStr}.xlsx`);
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportToPdfReport(options: {
  title: string;
  subtitle: string;
  columns: { header: string; key: string; align?: 'left' | 'center' | 'right' }[];
  rows: Record<string, any>[];
}) {
  const { title, subtitle, columns, rows } = options;
  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) {
    alert('Permita pop-ups no navegador para gerar o PDF.');
    return;
  }

  const emittedAt = new Date().toLocaleString('pt-BR');

  const tableHeadersHtml = columns
    .map(
      (col) =>
        `<th style="text-align:${col.align || 'left'}; padding:8px 10px; border-bottom:2px solid #0f172a; font-size:11px; text-transform:uppercase; color:#334155;">${escapeHtml(
          col.header
        )}</th>`
    )
    .join('');

  const tableRowsHtml = rows
    .map(
      (row, idx) =>
        `<tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          ${columns
            .map(
              (col) =>
                `<td style="text-align:${
                  col.align || 'left'
                }; padding:7px 10px; border-bottom:1px solid #e2e8f0; font-size:11px; color:#1e293b;">${escapeHtml(
                  row[col.key]
                )}</td>`
            )
            .join('')}
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Casas Pedro</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 18px; font-weight: 900; color: #b45309; letter-spacing: -0.5px; }
    .title { font-size: 16px; font-weight: 700; margin-top: 4px; color: #0f172a; }
    .subtitle { font-size: 12px; color: #475569; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#fffbeb; border:1px solid #fde68a; padding:10px 14px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
    <span style="font-size:12px; color:#92400e; font-weight:bold;">Na janela de impressão, selecione o destino "Salvar como PDF" (ou sua impressora).</span>
    <button onclick="window.print()" style="background:#d97706; color:white; border:none; padding:6px 14px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px;">Salvar PDF / Imprimir</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">CASAS PEDRO • NUTRIÇÃO E QUALIDADE</div>
      <div class="title">${escapeHtml(title)}</div>
      <div class="subtitle">${escapeHtml(subtitle)}</div>
    </div>
    <div class="meta">
      <div><strong>Emissão:</strong> ${escapeHtml(emittedAt)}</div>
      <div><strong>Total de Registros:</strong> ${rows.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>${tableHeadersHtml}</tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
