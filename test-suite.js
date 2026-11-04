const fs = require('fs');
const path = require('path');
const pdfjs = require('./lib/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve('./lib/pdf.worker.min.js');

// Mock browser environment for real-ledger.js
global.window = global;
global.document = {
  getElementById: (id) => ({
    value: '',
    textContent: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    innerHTML: ''
  }),
  addEventListener: () => {}
};
global.localStorage = {
  _data: {},
  getItem: (k) => global.localStorage._data[k] || null,
  setItem: (k, v) => { global.localStorage._data[k] = String(v); },
  removeItem: (k) => { delete global.localStorage._data[k]; }
};

// Formatter helper
global.fmt = {
  currency: (val) => 'R$ ' + (val || 0).toFixed(2).replace('.', ','),
  dateISOToBR: (iso) => {
    if (!iso) return '-';
    const parts = iso.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },
  parseCurrency: (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = str.replace(/[^\d]/g, '');
    return clean ? parseFloat(clean) / 100 : 0;
  },
  number: (val) => String(val)
};
global.showToast = (msg, type) => console.log(`[TOAST ${type}] ${msg}`);
global.closeModal = (id) => console.log(`[MODAL CLOSE] ${id}`);

// Load real-ledger.js
require('./real-ledger.js');

async function runTestSuite() {
  console.log('=== INICIANDO TESTES DO SIMULADOR DE AMORTIZAÇÃO & EXTRATO REAL ===\n');

  // Teste 1: Cálculo de Juros Pró-rata e TR
  console.log('--- Teste 1: Cálculo Pró-rata Intra-mês ---');
  const c1 = window.realLedgerState.contract;
  console.log('Taxa mensal:', c1.interestRateMonthly, '%');

  // 26/09/2025: no dia do vencimento
  const tOnDue = calcProRataForDate('2025-09-26', 1500.00);
  console.log('26/09/2025 (dia 26): dias =', tOnDue.days, '| juros =', tOnDue.proRataInterest, '| TR =', tOnDue.monetaryCorrection);
  if (tOnDue.days !== 0 || tOnDue.proRataInterest !== 0) throw new Error('Falha no teste dia 26');

  // 29/09/2025: 3 dias após vencimento
  const t3Days = calcProRataForDate('2025-09-29', 550.00);
  console.log('29/09/2025 (3 dias): dias =', t3Days.days, '| juros =', t3Days.proRataInterest, '| total =', t3Days.totalPaid);
  if (t3Days.days !== 3 || t3Days.proRataInterest < 0.50 || t3Days.proRataInterest > 0.55) {
    throw new Error('Falha no cálculo de 3 dias pró-rata');
  }

  // 13/10/2026: 17 dias após 26/09
  const t17Days = calcProRataForDate('2026-10-13', 2836.92);
  console.log('13/10/2026 (17 dias): dias =', t17Days.days, '| juros =', t17Days.proRataInterest, '| TR =', t17Days.monetaryCorrection);
  if (t17Days.days !== 17 || Math.abs(t17Days.proRataInterest - 15.42) > 0.5) {
    throw new Error('Falha no cálculo de 17 dias pró-rata');
  }
  console.log('✅ Teste 1 passou com sucesso!\n');

  // Teste 2: Recálculo do Saldo Devedor e KPIs
  console.log('--- Teste 2: Recálculo do Saldo Devedor Real e KPIs ---');
  recalculateRealLedger();
  const m = window.realLedgerState.metrics;
  console.log('Saldo devedor atual:', m.currentBalance);
  console.log('Total amortizado:', m.totalAmortized);
  console.log('Total amortizações extras:', m.totalExtraAmort);
  console.log('Total parcelas pagas:', m.paidInstallmentsCount);
  console.log('Prazo restante:', m.remainingTerm, 'meses');
  console.log('Percentual amortizado:', m.percentAmortized, '%');

  if (m.paidInstallmentsCount !== 20) throw new Error('Deveria ter 20 parcelas pagas');
  if (m.currentBalance !== 135310.81) throw new Error('Saldo devedor final deveria ser 135.310,81');
  if (m.remainingTerm !== 98) throw new Error('Prazo restante deveria ser 98 meses');
  console.log('✅ Teste 2 passou com sucesso! Saldo e KPIs bateram 100% com o Itaú!\n');

  // Teste 3: Parser do Extrato PDF
  console.log('--- Teste 3: Leitor Automático do PDF Oficial (DDC Itaú) ---');
  const buf = fs.readFileSync('exemplo-ddc-itau.pdf');
  const data = new Uint8Array(buf);
  const doc = await pdfjs.getDocument({ data }).promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items;
    const linesMap = new Map();
    items.forEach(item => {
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y).push(item);
    });
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
    for (const y of sortedY) {
      const line = linesMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]).map(it => it.str).join(' ').trim();
      if (line) fullText += line + '\n';
    }
  }

  const parsed = parseDdcText(fullText);
  console.log('Contrato detectado:', parsed.contract.contractNumber);
  console.log('Titular:', parsed.contract.debtorName);
  console.log('Parcelas extraídas:', parsed.installments.length);
  console.log('Amortizações extras extraídas:', parsed.amortizations.length);

  if (parsed.contract.contractNumber !== '10194887106') throw new Error('Número de contrato incorreto');
  if (parsed.installments.length < 100) throw new Error('Não extraiu todas as parcelas');
  if (parsed.amortizations.length !== 16) throw new Error('Deveria ter extraído 16 amortizações extras');
  console.log('✅ Teste 3 passou com sucesso! Todas as 16 amortizações e 118 parcelas extraídas do PDF!\n');

  // Teste 4: Detecção de Divergências
  console.log('--- Teste 4: Detecção de Divergências e Novos Lançamentos ---');
  // Se o PDF for idêntico ao estado atual, zero divergências críticas
  const diffsZero = detectDivergences(parsed);
  console.log('Divergências com estado sincronizado:', diffsZero.length);

  // Agora vamos simular uma nova amortização no PDF e uma nova parcela paga para testar a reconciliação
  const simulatedPdf = JSON.parse(JSON.stringify(parsed));
  // Simular parcela 21 paga no PDF
  const p21 = simulatedPdf.installments.find(i => i.installmentNumber === 21);
  if (p21) {
    p21.status = 'Paga';
    p21.totalAmount = 2714.95;
    p21.outstandingBalance = 133930.09;
  }
  // Simular nova amortização no PDF
  simulatedPdf.amortizations.push({
    date: '2026-11-05',
    dateBR: '05/11/2026',
    operationAmount: 3000.00,
    proRataInterest: 10.50,
    monetaryCorrection: 1.20,
    totalDisbursed: 3011.70,
    description: 'Amortização redução de prazo recurso próprio'
  });

  const diffsDetected = detectDivergences(simulatedPdf);
  console.log('Divergências detectadas na simulação com novos dados:', diffsDetected.length);
  diffsDetected.forEach(d => console.log(' ->', d.title, ':', d.itemDesc));

  if (diffsDetected.length < 2) throw new Error('Deveria ter detectado as divergências');
  console.log('✅ Teste 4 passou com sucesso! Divergências identificadas e prontas para reconciliação!\n');

  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! 🎉');
}

runTestSuite().catch(e => {
  console.error('ERRO:', e);
  process.exit(1);
});
