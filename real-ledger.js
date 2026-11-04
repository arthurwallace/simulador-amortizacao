if (typeof window === 'undefined') {
  global.window = global;
}

// Formatador seguro global/local (garante execução independente de ordem de carregamento)
const fmt = (typeof window !== 'undefined' && window.fmt) ? window.fmt : {
  currency: (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  },
  number: (val, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return '0,00';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
  },
  parseCurrency: (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = String(str).replace(/[^\d]/g, '');
    return clean ? parseFloat(clean) / 100 : 0;
  },
  dateISOToBR: (iso) => {
    if (!iso) return '-';
    const parts = String(iso).split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(iso);
  }
};
if (typeof window !== 'undefined' && !window.fmt) {
  window.fmt = fmt;
}

/**
 * SIMULADOR DE AMORTIZAÇÃO - MÓDULO DE ACOMPANHAMENTO REAL & EXTRATO OFICIAL
 * Controle de parcelas pagas, amortizações extras intra-mês com cálculo de juros pró-rata
 * Leitor automático de extratos bancários em PDF (DDC Itaú/SAC) e Reconciliação de Divergências
 */

// Chave de armazenamento no LocalStorage
const REAL_LEDGER_STORAGE_KEY = 'amort_real_ledger_v2';

// Dados Oficiais extraídos do DDC Itaú (Arthur Wallace Silva Lopes - Contrato 10194887106)
const DEFAULT_REAL_LEDGER_DATA = {
  contract: {
    contractNumber: '10194887106',
    debtorName: 'ARTHUR WALLACE SILVA LOPES',
    cpf: '009.341.701-26',
    agency: '7929',
    account: '25407-1',
    issuedAt: '27.10.2026 ás 10:22:45',
    totalTerm: 118,
    remainingTerm: 98,
    interestRateMonthly: 0.9631393,
    interestRateAnnual: 11.5576716,
    effectiveRateAnnual: 12.19,
    amortizationSystem: 'SAC',
    lastInstallmentValue: 1394.02,
    lastDueDate: '2034-12-26',
    startDate: '2025-02-26',
    loanAmount: 228000.00
  },
  transactions: [
    // Implantação
    {
      id: 'tx_init',
      type: 'contract_init',
      date: '2025-02-26',
      description: 'Implantação de contrato - Esteira',
      operationAmount: 228000.00,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 0,
      balanceAfter: 228000.00,
      status: 'Confirmada'
    },
    // Parcelas 1 a 7
    {
      id: 'inst_1',
      type: 'installment',
      installmentNumber: 1,
      date: '2025-03-26',
      dueDate: '2025-03-26',
      description: 'Parcela Mensal #1',
      amortization: 543.26,
      interest: 2197.60,
      correctionIndex: 1.000750,
      mip: 47.04,
      dfi: 33.04,
      operationAmount: 543.26,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2820.94,
      balanceAfter: 227627.74,
      status: 'Paga'
    },
    {
      id: 'inst_2',
      type: 'installment',
      installmentNumber: 2,
      date: '2025-04-26',
      dueDate: '2025-04-26',
      description: 'Parcela Mensal #2',
      amortization: 544.19,
      interest: 2196.12,
      correctionIndex: 1.001709,
      mip: 23.51,
      dfi: 16.55,
      operationAmount: 544.19,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2780.37,
      balanceAfter: 227472.57,
      status: 'Paga'
    },
    {
      id: 'inst_3',
      type: 'installment',
      installmentNumber: 3,
      date: '2025-05-26',
      dueDate: '2025-05-26',
      description: 'Parcela Mensal #3',
      amortization: 544.99,
      interest: 2194.10,
      correctionIndex: 1.001469,
      mip: 23.49,
      dfi: 16.57,
      operationAmount: 544.99,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2779.15,
      balanceAfter: 227261.74,
      status: 'Paga'
    },
    {
      id: 'inst_4',
      type: 'installment',
      installmentNumber: 4,
      date: '2025-06-26',
      dueDate: '2025-06-26',
      description: 'Parcela Mensal #4',
      amortization: 545.94,
      interest: 2192.65,
      correctionIndex: 1.001736,
      mip: 23.47,
      dfi: 16.60,
      operationAmount: 545.94,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2778.66,
      balanceAfter: 227110.33,
      status: 'Paga'
    },
    {
      id: 'inst_5',
      type: 'installment',
      installmentNumber: 5,
      date: '2025-07-26',
      dueDate: '2025-07-26',
      description: 'Parcela Mensal #5',
      amortization: 546.89,
      interest: 2191.19,
      correctionIndex: 1.001739,
      mip: 23.46,
      dfi: 16.63,
      operationAmount: 546.89,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2778.17,
      balanceAfter: 226958.38,
      status: 'Paga'
    },
    {
      id: 'inst_6',
      type: 'installment',
      installmentNumber: 6,
      date: '2025-08-26',
      dueDate: '2025-08-26',
      description: 'Parcela Mensal #6',
      amortization: 547.83,
      interest: 2189.69,
      correctionIndex: 1.001722,
      mip: 23.44,
      dfi: 16.66,
      operationAmount: 547.83,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2777.62,
      balanceAfter: 226801.37,
      status: 'Paga'
    },
    {
      id: 'inst_7',
      type: 'installment',
      installmentNumber: 7,
      date: '2025-09-26',
      dueDate: '2025-09-26',
      description: 'Parcela Mensal #7',
      amortization: 548.79,
      interest: 2188.26,
      correctionIndex: 1.001760,
      mip: 23.42,
      dfi: 16.69,
      operationAmount: 548.79,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2777.16,
      balanceAfter: 226651.75,
      status: 'Paga'
    },
    // Amortizações do ciclo 7
    {
      id: 'amort_20250926_1500',
      type: 'amortization',
      subType: 'term',
      date: '2025-09-26',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1500.00,
      proRataInterest: 0.00,
      monetaryCorrection: 0.00,
      totalPaid: 1500.00,
      balanceAfter: 225151.75,
      status: 'Paga'
    },
    {
      id: 'amort_20250929_550',
      type: 'amortization',
      subType: 'term',
      date: '2025-09-29',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 550.00,
      proRataInterest: 0.53,
      monetaryCorrection: 0.10,
      totalPaid: 550.63,
      balanceAfter: 224601.75,
      status: 'Paga'
    },
    {
      id: 'amort_20251001_1150',
      type: 'amortization',
      subType: 'term',
      date: '2025-10-01',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1150.00,
      proRataInterest: 1.83,
      monetaryCorrection: 0.33,
      totalPaid: 1152.16,
      balanceAfter: 223451.75,
      status: 'Paga'
    },
    {
      id: 'amort_20251010_1243',
      type: 'amortization',
      subType: 'term',
      date: '2025-10-10',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1243.80,
      proRataInterest: 5.55,
      monetaryCorrection: 0.99,
      totalPaid: 1250.34,
      balanceAfter: 222207.95,
      status: 'Paga'
    },
    // Parcela 8
    {
      id: 'inst_8',
      type: 'installment',
      installmentNumber: 8,
      date: '2025-10-26',
      dueDate: '2025-10-26',
      description: 'Parcela Mensal #8',
      amortization: 593.60,
      interest: 2143.94,
      correctionIndex: 1.001719,
      mip: 22.95,
      dfi: 16.72,
      operationAmount: 593.60,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2777.21,
      balanceAfter: 222005.67,
      status: 'Paga'
    },
    // Amortização ciclo 8
    {
      id: 'amort_20251030_1800',
      type: 'amortization',
      subType: 'term',
      date: '2025-10-30',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1800.00,
      proRataInterest: 2.22,
      monetaryCorrection: 0.40,
      totalPaid: 1802.62,
      balanceAfter: 220205.67,
      status: 'Paga'
    },
    // Parcela 9
    {
      id: 'inst_9',
      type: 'installment',
      installmentNumber: 9,
      date: '2025-11-26',
      dueDate: '2025-11-26',
      description: 'Parcela Mensal #9',
      amortization: 612.74,
      interest: 2124.56,
      correctionIndex: 1.001721,
      mip: 22.74,
      dfi: 16.75,
      operationAmount: 612.74,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2776.79,
      balanceAfter: 219974.53,
      status: 'Paga'
    },
    // Amortizações ciclo 9
    {
      id: 'amort_20251204_1400',
      type: 'amortization',
      subType: 'term',
      date: '2025-12-04',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1400.00,
      proRataInterest: 3.57,
      monetaryCorrection: 0.64,
      totalPaid: 1404.21,
      balanceAfter: 218574.53,
      status: 'Paga'
    },
    {
      id: 'amort_20251205_4400',
      type: 'amortization',
      subType: 'term',
      date: '2025-12-05',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 4400.00,
      proRataInterest: 12.63,
      monetaryCorrection: 2.27,
      totalPaid: 4414.90,
      balanceAfter: 214174.53,
      status: 'Paga'
    },
    {
      id: 'amort_20251219_1348',
      type: 'amortization',
      subType: 'term',
      date: '2025-12-19',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1348.42,
      proRataInterest: 9.88,
      monetaryCorrection: 1.77,
      totalPaid: 1360.07,
      balanceAfter: 212826.11,
      status: 'Paga'
    },
    // Parcela 10
    {
      id: 'inst_10',
      type: 'installment',
      installmentNumber: 10,
      date: '2025-12-26',
      dueDate: '2025-12-26',
      description: 'Parcela Mensal #10',
      amortization: 683.41,
      interest: 2053.64,
      correctionIndex: 1.001723,
      mip: 21.98,
      dfi: 16.78,
      operationAmount: 683.41,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2775.81,
      balanceAfter: 212540.21,
      status: 'Paga'
    },
    // Amortização ciclo 10
    {
      id: 'amort_20251229_4100',
      type: 'amortization',
      subType: 'term',
      date: '2025-12-29',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 4100.00,
      proRataInterest: 3.80,
      monetaryCorrection: 0.68,
      totalPaid: 4104.48,
      balanceAfter: 208440.21,
      status: 'Paga'
    },
    // Parcela 11
    {
      id: 'inst_11',
      type: 'installment',
      installmentNumber: 11,
      date: '2026-01-26',
      dueDate: '2026-01-26',
      description: 'Parcela Mensal #11',
      amortization: 725.00,
      interest: 2011.02,
      correctionIndex: 1.001699,
      mip: 21.53,
      dfi: 16.80,
      operationAmount: 725.00,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2774.35,
      balanceAfter: 208073.84,
      status: 'Paga'
    },
    // Amortização ciclo 11
    {
      id: 'amort_20260206_3550',
      type: 'amortization',
      subType: 'term',
      date: '2026-02-06',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 3550.00,
      proRataInterest: 12.06,
      monetaryCorrection: 2.16,
      totalPaid: 3564.22,
      balanceAfter: 204523.84,
      status: 'Paga'
    },
    // Parcelas 12 a 16
    {
      id: 'inst_12',
      type: 'installment',
      installmentNumber: 12,
      date: '2026-02-26',
      dueDate: '2026-02-26',
      description: 'Parcela Mensal #12',
      amortization: 761.67,
      interest: 1973.37,
      correctionIndex: 1.001717,
      mip: 21.12,
      dfi: 16.83,
      operationAmount: 761.67,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2772.99,
      balanceAfter: 204127.58,
      status: 'Paga'
    },
    {
      id: 'inst_13',
      type: 'installment',
      installmentNumber: 13,
      date: '2026-03-26',
      dueDate: '2026-03-26',
      description: 'Parcela Mensal #13',
      amortization: 762.96,
      interest: 1969.36,
      correctionIndex: 1.001694,
      mip: 21.08,
      dfi: 16.86,
      operationAmount: 762.96,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2770.26,
      balanceAfter: 203710.41,
      status: 'Paga'
    },
    {
      id: 'inst_14',
      type: 'installment',
      installmentNumber: 14,
      date: '2026-04-26',
      dueDate: '2026-04-26',
      description: 'Parcela Mensal #14',
      amortization: 764.25,
      interest: 1965.32,
      correctionIndex: 1.001687,
      mip: 21.04,
      dfi: 16.89,
      operationAmount: 764.25,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2767.50,
      balanceAfter: 203289.82,
      status: 'Paga'
    },
    {
      id: 'inst_15',
      type: 'installment',
      installmentNumber: 15,
      date: '2026-05-26',
      dueDate: '2026-05-26',
      description: 'Parcela Mensal #15',
      amortization: 765.54,
      interest: 1961.27,
      correctionIndex: 1.001688,
      mip: 20.99,
      dfi: 16.92,
      operationAmount: 765.54,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2764.72,
      balanceAfter: 202867.43,
      status: 'Paga'
    },
    {
      id: 'inst_16',
      type: 'installment',
      installmentNumber: 16,
      date: '2026-06-26',
      dueDate: '2026-06-26',
      description: 'Parcela Mensal #16',
      amortization: 766.86,
      interest: 1957.27,
      correctionIndex: 1.001728,
      mip: 20.95,
      dfi: 16.95,
      operationAmount: 766.86,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2762.03,
      balanceAfter: 202451.12,
      status: 'Paga'
    },
    // Mega amortização 50k
    {
      id: 'amort_20260717_50000',
      type: 'amortization',
      subType: 'term',
      date: '2026-07-17',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 50000.00,
      proRataInterest: 334.36,
      monetaryCorrection: 58.88,
      totalPaid: 50393.24,
      balanceAfter: 152451.12,
      status: 'Paga'
    },
    // Parcela 17
    {
      id: 'inst_17',
      type: 'installment',
      installmentNumber: 17,
      date: '2026-07-26',
      dueDate: '2026-07-26',
      description: 'Parcela Mensal #17',
      amortization: 1244.74,
      interest: 1474.60,
      correctionIndex: 1.001696,
      mip: 15.78,
      dfi: 16.98,
      operationAmount: 1244.74,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2752.10,
      balanceAfter: 151858.84,
      status: 'Paga'
    },
    // Amortização 5k
    {
      id: 'amort_20260727_5000',
      type: 'amortization',
      subType: 'term',
      date: '2026-07-27',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 5000.00,
      proRataInterest: 1.54,
      monetaryCorrection: 0.00,
      totalPaid: 5001.54,
      balanceAfter: 146858.84,
      status: 'Paga'
    },
    // Parcela 18
    {
      id: 'inst_18',
      type: 'installment',
      installmentNumber: 18,
      date: '2026-08-26',
      dueDate: '2026-08-26',
      description: 'Parcela Mensal #18',
      amortization: 1290.46,
      interest: 1416.89,
      correctionIndex: 1.001713,
      mip: 15.17,
      dfi: 17.01,
      operationAmount: 1290.46,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2739.53,
      balanceAfter: 145821.49,
      status: 'Paga'
    },
    // Amortizações ciclo 18
    {
      id: 'amort_20260826_1600',
      type: 'amortization',
      subType: 'term',
      date: '2026-08-26',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1600.00,
      proRataInterest: 0.00,
      monetaryCorrection: 0.00,
      totalPaid: 1600.00,
      balanceAfter: 144221.49,
      status: 'Paga'
    },
    {
      id: 'amort_20260827_1705',
      type: 'amortization',
      subType: 'term',
      date: '2026-08-27',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 1705.24,
      proRataInterest: 0.52,
      monetaryCorrection: 0.09,
      totalPaid: 1705.85,
      balanceAfter: 142516.25,
      status: 'Paga'
    },
    {
      id: 'amort_20260901_2036',
      type: 'amortization',
      subType: 'term',
      date: '2026-09-01',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 2036.92,
      proRataInterest: 3.77,
      monetaryCorrection: 0.67,
      totalPaid: 2041.36,
      balanceAfter: 140479.33,
      status: 'Paga'
    },
    // Parcela 19
    {
      id: 'inst_19',
      type: 'installment',
      installmentNumber: 19,
      date: '2026-09-26',
      dueDate: '2026-09-26',
      description: 'Parcela Mensal #19',
      amortization: 1353.12,
      interest: 1355.37,
      correctionIndex: 1.001709,
      mip: 14.51,
      dfi: 17.04,
      operationAmount: 1353.12,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2740.04,
      balanceAfter: 139371.35,
      status: 'Paga'
    },
    // Amortização ciclo 19
    {
      id: 'amort_20261013_2836',
      type: 'amortization',
      subType: 'term',
      date: '2026-10-13',
      description: 'Amortização redução de prazo recurso próprio',
      operationAmount: 2836.92,
      proRataInterest: 15.37,
      monetaryCorrection: 1.63,
      totalPaid: 2853.92,
      balanceAfter: 136534.43,
      status: 'Paga'
    },
    // Parcela 20 (Última Paga no DDC)
    {
      id: 'inst_20',
      type: 'installment',
      installmentNumber: 20,
      date: '2026-10-26',
      dueDate: '2026-10-26',
      description: 'Parcela Mensal #20',
      amortization: 1380.72,
      interest: 1316.53,
      correctionIndex: 1.001026,
      mip: 14.09,
      dfi: 17.05,
      operationAmount: 1380.72,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2728.39,
      balanceAfter: 135310.81,
      status: 'Paga'
    },
    // Parcela 21 (Primeira Projetada)
    {
      id: 'inst_21',
      type: 'installment',
      installmentNumber: 21,
      date: '2026-11-26',
      dueDate: '2026-11-26',
      description: 'Parcela Mensal #21 (Projetada)',
      amortization: 1380.72,
      interest: 1303.23,
      correctionIndex: 1.000000,
      mip: 13.95,
      dfi: 17.05,
      operationAmount: 1380.72,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: 2714.95,
      balanceAfter: 133930.09,
      status: 'Projetada'
    }
  ]
};

// Estado em memória do Acompanhamento Real
window.realLedgerState = {
  contract: { ...DEFAULT_REAL_LEDGER_DATA.contract },
  transactions: JSON.parse(JSON.stringify(DEFAULT_REAL_LEDGER_DATA.transactions)),
  activeFilter: 'all',
  searchTerm: '',
  selectedDivergenceChoices: {},
  pendingExtractedDdc: null
};

// Inicialização do Acompanhamento Real a partir do LocalStorage
function initRealLedger() {
  try {
    const saved = localStorage.getItem(REAL_LEDGER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
        window.realLedgerState.contract = { ...DEFAULT_REAL_LEDGER_DATA.contract, ...(parsed.contract || {}) };
        window.realLedgerState.transactions = parsed.transactions;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar real ledger do localStorage:', e);
  }

  // Recalcular saldos e KPIs
  recalculateRealLedger();
}

function saveRealLedgerToStorage() {
  try {
    const toSave = {
      contract: window.realLedgerState.contract,
      transactions: window.realLedgerState.transactions
    };
    localStorage.setItem(REAL_LEDGER_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Erro ao salvar real ledger no localStorage:', e);
  }
}

/**
 * Recalcula a evolução cronológica do saldo devedor e totais acumulados
 */
function recalculateRealLedger() {
  const contract = window.realLedgerState.contract;
  const txs = window.realLedgerState.transactions;

  // Ordenar cronologicamente por data
  txs.sort((a, b) => {
    if (a.date === b.date) {
      // Se for no mesmo dia, parcela vem antes ou depois da amortização
      if (a.type === 'contract_init') return -1;
      if (b.type === 'contract_init') return 1;
      if (a.type === 'installment' && b.type === 'amortization') return -1;
      if (a.type === 'amortization' && b.type === 'installment') return 1;
    }
    return (a.date || '').localeCompare(b.date || '');
  });

  let balance = contract.loanAmount || 228000.00;
  let totalAmortized = 0;
  let totalRegularAmort = 0;
  let totalExtraAmort = 0;
  let totalInterestPaid = 0;
  let totalProRataPaid = 0;
  let totalFeesPaid = 0;
  let totalDisbursed = 0;
  let paidInstallmentsCount = 0;
  let lastPaidBalance = balance;
  let lastPaidDate = contract.startDate;

  txs.forEach((tx) => {
    if (tx.type === 'contract_init') {
      if (tx.balanceAfter !== undefined && tx.balanceAfter !== null) {
        balance = tx.balanceAfter;
      } else {
        tx.balanceAfter = balance;
      }
      return;
    }

    if (tx.type === 'amortization') {
      const opVal = tx.operationAmount || 0;
      if (tx.balanceAfter !== undefined && tx.balanceAfter !== null) {
        balance = tx.balanceAfter;
      } else {
        balance = Math.max(0, balance - opVal);
        tx.balanceAfter = Math.round(balance * 100) / 100;
      }
      
      const proRata = tx.proRataInterest || 0;
      const tr = tx.monetaryCorrection || 0;
      const totalPaid = Math.round((opVal + proRata + tr) * 100) / 100;
      tx.totalPaid = tx.totalPaid || totalPaid;

      if (tx.status !== 'Cancelada') {
        totalExtraAmort += opVal;
        totalAmortized += opVal;
        totalProRataPaid += (proRata + tr);
        totalDisbursed += (tx.totalPaid || totalPaid);
        lastPaidBalance = tx.balanceAfter;
        lastPaidDate = tx.date;
      }
    } else if (tx.type === 'installment') {
      const amortVal = tx.amortization || 0;
      const interestVal = tx.interest || 0;
      const fees = (tx.mip || 0) + (tx.dfi || 0);

      if (tx.status === 'Paga') {
        if (tx.balanceAfter !== undefined && tx.balanceAfter !== null) {
          balance = tx.balanceAfter;
        } else {
          balance = Math.max(0, balance - amortVal);
          tx.balanceAfter = Math.round(balance * 100) / 100;
        }

        totalRegularAmort += amortVal;
        totalAmortized += amortVal;
        totalInterestPaid += interestVal;
        totalFeesPaid += fees;
        totalDisbursed += (tx.totalPaid || (amortVal + interestVal + fees));
        paidInstallmentsCount++;
        lastPaidBalance = tx.balanceAfter;
        lastPaidDate = tx.date;
      } else {
        // Parcela projetada
        if (tx.balanceAfter !== undefined && tx.balanceAfter !== null) {
          balance = tx.balanceAfter;
        } else {
          balance = Math.max(0, balance - amortVal);
          tx.balanceAfter = Math.round(balance * 100) / 100;
        }
      }
    }
  });

  // Salvar métricas resumidas
  window.realLedgerState.metrics = {
    currentBalance: lastPaidBalance,
    lastPaidDate: lastPaidDate,
    totalAmortized: Math.round(totalAmortized * 100) / 100,
    totalRegularAmort: Math.round(totalRegularAmort * 100) / 100,
    totalExtraAmort: Math.round(totalExtraAmort * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalProRataPaid: Math.round(totalProRataPaid * 100) / 100,
    totalFeesPaid: Math.round(totalFeesPaid * 100) / 100,
    totalDisbursed: Math.round(totalDisbursed * 100) / 100,
    paidInstallmentsCount: paidInstallmentsCount,
    totalTerm: contract.totalTerm || 118,
    remainingTerm: Math.max(0, (contract.totalTerm || 118) - paidInstallmentsCount),
    percentAmortized: ((totalAmortized / (contract.loanAmount || 228000)) * 100).toFixed(1)
  };

  saveRealLedgerToStorage();
}

/**
 * Cálculo inteligente de Juros Pró-rata e TR proporcional intra-mês (Fórmula Oficial Itaú)
 * Delegado ao módulo puro calculation-engine.js
 */
function calcProRataForDate(amortDateStr, amount, customMonthlyRate, customTrRate) {
  const engine = (typeof CalculationEngine !== 'undefined' && CalculationEngine.calcProRataForDate)
    ? CalculationEngine
    : (typeof require === 'function' ? require('./calculation-engine.js') : null);

  if (engine && engine.calcProRataForDate) {
    const contract = window.realLedgerState?.contract || {};
    const monthlyRate = (customMonthlyRate !== undefined && customMonthlyRate !== null)
      ? customMonthlyRate
      : (contract.interestRateMonthly || 0.9631393);
    return engine.calcProRataForDate(amortDateStr, amount, monthlyRate, customTrRate, 26);
  }

  if (!amortDateStr || !amount || amount <= 0) {
    return { days: 0, proRataInterest: 0, monetaryCorrection: 0, totalPaid: 0, baseDateStr: '-' };
  }

  const dAmort = new Date(amortDateStr + 'T00:00:00');
  const contract = window.realLedgerState.contract;
  const monthlyRate = (customMonthlyRate !== undefined && customMonthlyRate !== null)
    ? customMonthlyRate
    : (contract.interestRateMonthly || 0.9631393);

  // Descobrir a data base do ciclo: último vencimento antes de dAmort (dia 26 de cada mês)
  // Se amortizar no próprio dia 26, dias decorridos = 0
  const year = dAmort.getFullYear();
  const month = dAmort.getMonth();
  const day = dAmort.getDate();

  let baseDate = new Date(year, month, 26);
  if (day < 26) {
    // Vencimento base foi no mês anterior
    baseDate = new Date(year, month - 1, 26);
  }

  const diffMs = dAmort.getTime() - baseDate.getTime();
  const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const baseDateStr = baseDate.toISOString().substring(0, 10);

  if (days === 0) {
    return {
      days: 0,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: amount,
      baseDateStr: baseDateStr
    };
  }

  // Juros Pró-rata Exponencial Composto: Valor * ((1 + i_mensal)^(dias / 30) - 1)
  const iMonthly = monthlyRate / 100;
  const proRataInterest = Math.round(amount * (Math.pow(1 + iMonthly, days / 30) - 1) * 100) / 100;

  // TR proporcional intra-mês (utiliza 0.1719% se não informado)
  const trRate = (customTrRate !== undefined && customTrRate !== null) ? customTrRate : 0.1719;
  const trMonthly = trRate / 100;
  const monetaryCorrection = Math.round(amount * (Math.pow(1 + trMonthly, days / 30) - 1) * 100) / 100;

  const totalPaid = Math.round((amount + proRataInterest + monetaryCorrection) * 100) / 100;

  return {
    days,
    proRataInterest,
    monetaryCorrection,
    totalPaid,
    baseDateStr
  };
}

/**
 * Atualização interativa do modal de amortização quando muda data ou valor
 */
window.onRealAmortDateOrAmountChange = function() {
  const dateInput = document.getElementById('modalRealAmortDate');
  const amountInput = document.getElementById('modalRealAmortAmount');
  if (!dateInput || !amountInput) return;

  const dateVal = dateInput.value;
  const amountVal = (window.fmt && window.fmt.parseCurrency) ? window.fmt.parseCurrency(amountInput.value) : parseFloat(amountInput.value || 0);

  const calc = calcProRataForDate(dateVal, amountVal);

  const badge = document.getElementById('realAmortCycleBadge');
  const desc = document.getElementById('realAmortCycleDesc');
  const inpJuros = document.getElementById('modalRealAmortProRata');
  const inpTR = document.getElementById('modalRealAmortTR');

  if (badge) {
    if (calc.days === 0) {
      badge.textContent = 'Dia de Vencimento (0 dias de juros)';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = 'var(--success-700)';
    } else {
      badge.textContent = `${calc.days} dia(s) no ciclo (${window.fmt.dateISOToBR(calc.baseDateStr)})`;
      badge.style.background = 'rgba(245, 158, 11, 0.15)';
      badge.style.color = 'var(--warning-700)';
    }
  }

  if (desc) {
    if (calc.days === 0) {
      desc.textContent = 'Amortização realizada exatamente no dia de vencimento contratual: isenta de encargos pró-rata.';
    } else {
      desc.textContent = `Desde o vencimento anterior (${window.fmt.dateISOToBR(calc.baseDateStr)}), decorreram ${calc.days} dias. O banco cobra juros pró-rata de ${window.fmt.currency(calc.proRataInterest)} sobre o saldo amortizado.`;
    }
  }

  if (inpJuros) inpJuros.value = calc.proRataInterest.toFixed(2);
  if (inpTR) inpTR.value = calc.monetaryCorrection.toFixed(2);

  updateRealAmortTotalPaid();
};

window.updateRealAmortTotalPaid = function() {
  const amountInput = document.getElementById('modalRealAmortAmount');
  const inpJuros = document.getElementById('modalRealAmortProRata');
  const inpTR = document.getElementById('modalRealAmortTR');

  const amount = (window.fmt && window.fmt.parseCurrency) ? window.fmt.parseCurrency(amountInput?.value || 0) : 0;
  const juros = parseFloat(inpJuros?.value || 0) || 0;
  const tr = parseFloat(inpTR?.value || 0) || 0;

  const totalFees = Math.round((juros + tr) * 100) / 100;
  const totalPaid = Math.round((amount + totalFees) * 100) / 100;

  const elPrin = document.getElementById('realAmortSumPrincipal');
  const elFees = document.getElementById('realAmortSumFees');
  const elTotal = document.getElementById('realAmortSumTotal');

  if (elPrin) elPrin.textContent = window.fmt.currency(amount);
  if (elFees) elFees.textContent = window.fmt.currency(totalFees);
  if (elTotal) elTotal.textContent = window.fmt.currency(totalPaid);
};

window.selectRealAmortType = function(type) {
  const rTerm = document.getElementById('modalRealAmortTypeTerm');
  const rInst = document.getElementById('modalRealAmortTypeInst');
  const lTerm = document.getElementById('lblRealAmortTypeTerm');
  const lInst = document.getElementById('lblRealAmortTypeInst');

  if (type === 'term') {
    if (rTerm) rTerm.checked = true;
    if (lTerm) lTerm.classList.add('selected');
    if (lInst) lInst.classList.remove('selected');
  } else {
    if (rInst) rInst.checked = true;
    if (lInst) lInst.classList.add('selected');
    if (lTerm) lTerm.classList.remove('selected');
  }
};

/**
 * Abertura e Salvamento de Amortização Extra Real
 */
window.openRealAmortizationModal = function(editId = null) {
  const title = document.getElementById('modalRealAmortTitle');
  const hiddenId = document.getElementById('modalRealAmortId');
  const dateInput = document.getElementById('modalRealAmortDate');
  const amountInput = document.getElementById('modalRealAmortAmount');
  const notesInput = document.getElementById('modalRealAmortNotes');

  if (editId) {
    const tx = window.realLedgerState.transactions.find(t => t.id === editId);
    if (!tx) return;
    if (title) title.textContent = 'Editar Amortização Extra Real';
    if (hiddenId) hiddenId.value = tx.id;
    if (dateInput) dateInput.value = tx.date;
    if (amountInput) amountInput.value = window.fmt.currency(tx.operationAmount);
    if (notesInput) notesInput.value = tx.description || '';
    window.selectRealAmortType(tx.subType || 'term');
    
    // Configura inputs pró-rata com os valores existentes
    const inpJuros = document.getElementById('modalRealAmortProRata');
    const inpTR = document.getElementById('modalRealAmortTR');
    if (inpJuros) inpJuros.value = (tx.proRataInterest || 0).toFixed(2);
    if (inpTR) inpTR.value = (tx.monetaryCorrection || 0).toFixed(2);
    window.updateRealAmortTotalPaid();
  } else {
    if (title) title.textContent = 'Lançar Amortização Extra Real';
    if (hiddenId) hiddenId.value = '';
    const today = new Date().toISOString().substring(0, 10);
    if (dateInput) dateInput.value = today;
    if (amountInput) amountInput.value = 'R$ 2.800,00';
    if (notesInput) notesInput.value = 'Amortização redução de prazo recurso próprio';
    window.selectRealAmortType('term');
    window.onRealAmortDateOrAmountChange();
  }

  const modal = document.getElementById('modalRealAmortization');
  if (modal) modal.classList.add('active');
};

window.saveRealAmortizationModal = function() {
  const hiddenId = document.getElementById('modalRealAmortId')?.value;
  const dateVal = document.getElementById('modalRealAmortDate')?.value;
  const amountRaw = document.getElementById('modalRealAmortAmount')?.value;
  const amount = window.fmt.parseCurrency(amountRaw);
  const subType = document.querySelector('input[name="modalRealAmortType"]:checked')?.value || 'term';
  const proRata = parseFloat(document.getElementById('modalRealAmortProRata')?.value || 0) || 0;
  const tr = parseFloat(document.getElementById('modalRealAmortTR')?.value || 0) || 0;
  const notes = document.getElementById('modalRealAmortNotes')?.value || 'Amortização redução de prazo recurso próprio';

  if (!dateVal) {
    window.showToast('Informe a data da amortização.', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    window.showToast('Informe um valor de amortização válido.', 'error');
    return;
  }

  if (hiddenId) {
    // Edição
    const tx = window.realLedgerState.transactions.find(t => t.id === hiddenId);
    if (tx) {
      tx.date = dateVal;
      tx.operationAmount = amount;
      tx.subType = subType;
      tx.proRataInterest = proRata;
      tx.monetaryCorrection = tr;
      tx.description = notes;
    }
  } else {
    // Novo lançamento
    const newTx = {
      id: 'amort_' + Date.now(),
      type: 'amortization',
      subType: subType,
      date: dateVal,
      description: notes,
      operationAmount: amount,
      proRataInterest: proRata,
      monetaryCorrection: tr,
      status: 'Paga'
    };
    window.realLedgerState.transactions.push(newTx);
  }

  recalculateRealLedger();
  renderRealLedger();
  window.closeModal('modalRealAmortization');
  window.showToast('Amortização extra registrada e saldo recalculado!', 'success');
};

/**
 * Abertura e Salvamento de Pagamento de Parcela
 */
window.openRealInstallmentModal = function(editId = null) {
  const title = document.getElementById('modalRealInstTitle');
  const hiddenId = document.getElementById('modalRealInstId');
  const numInput = document.getElementById('modalRealInstNum');
  const dueInput = document.getElementById('modalRealInstDueDate');
  const payInput = document.getElementById('modalRealInstPayDate');
  const amortInput = document.getElementById('modalRealInstAmort');
  const interestInput = document.getElementById('modalRealInstInterest');
  const mipInput = document.getElementById('modalRealInstMip');
  const dfiInput = document.getElementById('modalRealInstDfi');
  const trInput = document.getElementById('modalRealInstTR');
  const statusSelect = document.getElementById('modalRealInstStatus');

  if (editId) {
    const tx = window.realLedgerState.transactions.find(t => t.id === editId);
    if (!tx) return;
    if (title) title.textContent = `Editar Pagamento de Parcela #${tx.installmentNumber}`;
    if (hiddenId) hiddenId.value = tx.id;
    if (numInput) numInput.value = tx.installmentNumber;
    if (dueInput) dueInput.value = tx.dueDate || tx.date;
    if (payInput) payInput.value = tx.date;
    if (amortInput) amortInput.value = window.fmt.currency(tx.amortization);
    if (interestInput) interestInput.value = window.fmt.currency(tx.interest);
    if (mipInput) mipInput.value = (tx.mip || 0).toFixed(2);
    if (dfiInput) dfiInput.value = (tx.dfi || 0).toFixed(2);
    if (trInput) trInput.value = (tx.correctionIndex || 1.0).toFixed(6);
    if (statusSelect) statusSelect.value = tx.status || 'Paga';
  } else {
    // Sugerir próxima parcela
    const paidTxs = window.realLedgerState.transactions.filter(t => t.type === 'installment' && t.status === 'Paga');
    const nextNum = paidTxs.length + 1;
    if (title) title.textContent = `Lançar Pagamento da Parcela #${nextNum}`;
    if (hiddenId) hiddenId.value = '';
    if (numInput) numInput.value = nextNum;

    // Estimar data e valores SAC
    const baseDate = new Date(2025, 1 + nextNum, 26);
    const dateStr = baseDate.toISOString().substring(0, 10);
    if (dueInput) dueInput.value = dateStr;
    if (payInput) payInput.value = dateStr;
    if (amortInput) amortInput.value = 'R$ 1.380,72';
    if (interestInput) interestInput.value = 'R$ 1.303,23';
    if (mipInput) mipInput.value = '13.95';
    if (dfiInput) dfiInput.value = '17.05';
    if (trInput) trInput.value = '1.000000';
    if (statusSelect) statusSelect.value = 'Paga';
  }

  window.calcRealInstTotal();
  const modal = document.getElementById('modalRealInstallment');
  if (modal) modal.classList.add('active');
};

window.calcRealInstTotal = function() {
  const amort = window.fmt.parseCurrency(document.getElementById('modalRealInstAmort')?.value || 0);
  const interest = window.fmt.parseCurrency(document.getElementById('modalRealInstInterest')?.value || 0);
  const mip = parseFloat(document.getElementById('modalRealInstMip')?.value || 0) || 0;
  const dfi = parseFloat(document.getElementById('modalRealInstDfi')?.value || 0) || 0;
  const total = Math.round((amort + interest + mip + dfi) * 100) / 100;

  const totalInput = document.getElementById('modalRealInstTotal');
  if (totalInput) totalInput.value = window.fmt.currency(total);
};

window.onRealInstNumChange = function() {
  const numInput = document.getElementById('modalRealInstNum');
  const num = parseInt(numInput?.value || 1, 10);
  // Auto calcula data aproximada do vencimento
  const base = new Date(2025, 1 + num, 26);
  const dueInput = document.getElementById('modalRealInstDueDate');
  const payInput = document.getElementById('modalRealInstPayDate');
  const iso = base.toISOString().substring(0, 10);
  if (dueInput) dueInput.value = iso;
  if (payInput) payInput.value = iso;
};

window.saveRealInstallmentModal = function() {
  const hiddenId = document.getElementById('modalRealInstId')?.value;
  const num = parseInt(document.getElementById('modalRealInstNum')?.value || 1, 10);
  const dueDate = document.getElementById('modalRealInstDueDate')?.value;
  const payDate = document.getElementById('modalRealInstPayDate')?.value || dueDate;
  const amort = window.fmt.parseCurrency(document.getElementById('modalRealInstAmort')?.value || 0);
  const interest = window.fmt.parseCurrency(document.getElementById('modalRealInstInterest')?.value || 0);
  const mip = parseFloat(document.getElementById('modalRealInstMip')?.value || 0) || 0;
  const dfi = parseFloat(document.getElementById('modalRealInstDfi')?.value || 0) || 0;
  const tr = parseFloat(document.getElementById('modalRealInstTR')?.value || 1.0) || 1.0;
  const total = window.fmt.parseCurrency(document.getElementById('modalRealInstTotal')?.value || 0);
  const status = document.getElementById('modalRealInstStatus')?.value || 'Paga';

  if (!dueDate) {
    window.showToast('Informe o vencimento da parcela.', 'error');
    return;
  }

  if (hiddenId) {
    const tx = window.realLedgerState.transactions.find(t => t.id === hiddenId);
    if (tx) {
      tx.installmentNumber = num;
      tx.dueDate = dueDate;
      tx.date = payDate;
      tx.amortization = amort;
      tx.interest = interest;
      tx.mip = mip;
      tx.dfi = dfi;
      tx.correctionIndex = tr;
      tx.operationAmount = amort;
      tx.totalPaid = total;
      tx.status = status;
      tx.description = `Parcela Mensal #${num}`;
    }
  } else {
    const newTx = {
      id: 'inst_' + num + '_' + Date.now(),
      type: 'installment',
      installmentNumber: num,
      dueDate: dueDate,
      date: payDate,
      description: `Parcela Mensal #${num}`,
      amortization: amort,
      interest: interest,
      mip: mip,
      dfi: dfi,
      correctionIndex: tr,
      operationAmount: amort,
      proRataInterest: 0,
      monetaryCorrection: 0,
      totalPaid: total,
      status: status
    };
    window.realLedgerState.transactions.push(newTx);
  }

  recalculateRealLedger();
  renderRealLedger();
  window.closeModal('modalRealInstallment');
  window.showToast(`Parcela #${num} salva com sucesso!`, 'success');
};

/**
 * Exclusão de lançamento
 */
window.deleteRealEntry = function(id) {
  const tx = window.realLedgerState.transactions.find(t => t.id === id);
  if (!tx) return;
  if (tx.type === 'contract_init') {
    window.showToast('A implantação do contrato não pode ser excluída.', 'warning');
    return;
  }

  const desc = tx.type === 'installment' ? `a Parcela #${tx.installmentNumber}` : `a amortização de ${window.fmt.currency(tx.operationAmount)}`;
  if (!confirm(`Tem certeza que deseja excluir ${desc}?`)) return;

  window.realLedgerState.transactions = window.realLedgerState.transactions.filter(t => t.id !== id);
  recalculateRealLedger();
  renderRealLedger();
  window.showToast('Lançamento removido e saldos recalculados!', 'info');
};

/**
 * Filtro e Busca na Lista do Acompanhamento Real
 */
window.setRealLedgerFilter = function(filter) {
  window.realLedgerState.activeFilter = filter;
  ['all', 'amortization', 'paid', 'projected'].forEach(f => {
    const btn = document.getElementById('rf' + (f === 'all' ? 'All' : f === 'amortization' ? 'Amort' : f === 'paid' ? 'Paid' : 'Projected'));
    if (btn) btn.classList.toggle('active', f === filter);
  });
  renderRealLedgerTable();
};

window.onRealSearchInput = function(e) {
  window.realLedgerState.searchTerm = (e.target.value || '').toLowerCase().trim();
  renderRealLedgerTable();
};

/**
 * Renderização Principal do Painel de Acompanhamento Real
 */
window.renderRealLedger = function() {
  const metrics = window.realLedgerState.metrics;
  if (!metrics) {
    recalculateRealLedger();
  }

  // 1. Render KPI Grid
  const kpiGrid = document.getElementById('realMetricsGrid');
  if (kpiGrid) {
    const m = window.realLedgerState.metrics;
    kpiGrid.innerHTML = `
      <!-- Card 1: Saldo Devedor Real Atual -->
      <div class="real-kpi-card highlight">
        <div class="real-kpi-top">
          <span class="real-kpi-title">Saldo Devedor Atual (Real)</span>
          <span class="real-kpi-badge" style="background: rgba(37,99,235,0.12); color: var(--primary-700);">Oficial Itaú</span>
        </div>
        <div class="real-kpi-val" style="color: var(--primary-600);">
          ${window.fmt.currency(m.currentBalance)}
        </div>
        <div class="real-kpi-sub">
          Posição em <b>${window.fmt.dateISOToBR(m.lastPaidDate)}</b> (após Parcela #${m.paidInstallmentsCount})
        </div>
        <div class="real-progress-wrap">
          <div class="real-progress-bar-bg">
            <div class="real-progress-bar-fill" style="width: ${m.percentAmortized}%;"></div>
          </div>
          <div class="real-progress-labels">
            <span>Quitado: ${m.percentAmortized}%</span>
            <span>Resta: ${(100 - m.percentAmortized).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Total Já Amortizado -->
      <div class="real-kpi-card">
        <div class="real-kpi-top">
          <span class="real-kpi-title">Total Já Amortizado</span>
          <span class="real-kpi-badge" style="background: rgba(16,185,129,0.12); color: var(--success-700);">Abatimento Real</span>
        </div>
        <div class="real-kpi-val" style="color: var(--success-600);">
          ${window.fmt.currency(m.totalAmortized)}
        </div>
        <div class="real-kpi-sub" style="display: flex; flex-direction: column; gap: 0.2rem;">
          <div>⚡ <b>Amortizações Extras:</b> ${window.fmt.currency(m.totalExtraAmort)}</div>
          <div>📑 <b>Parcelas Regulares:</b> ${window.fmt.currency(m.totalRegularAmort)}</div>
        </div>
      </div>

      <!-- Card 3: Total Já Desembolsado ao Banco -->
      <div class="real-kpi-card">
        <div class="real-kpi-top">
          <span class="real-kpi-title">Total Desembolsado ao Banco</span>
          <span class="real-kpi-badge">Fluxo de Caixa</span>
        </div>
        <div class="real-kpi-val">
          ${window.fmt.currency(m.totalDisbursed)}
        </div>
        <div class="real-kpi-sub" style="display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.76rem;">
          <div>• Juros Contratuais Pagos: <b>${window.fmt.currency(m.totalInterestPaid)}</b></div>
          <div>• Juros Pró-rata Intra-mês: <b>${window.fmt.currency(m.totalProRataPaid)}</b></div>
          <div>• Seguros MIP/DFI e Taxas: <b>${window.fmt.currency(m.totalFeesPaid)}</b></div>
        </div>
      </div>

      <!-- Card 4: O Que Falta & Prazo Remanescente -->
      <div class="real-kpi-card">
        <div class="real-kpi-top">
          <span class="real-kpi-title">O Que Falta no Contrato</span>
          <span class="real-kpi-badge" style="background: rgba(245,158,11,0.15); color: var(--warning-700);">Prazo Restante</span>
        </div>
        <div class="real-kpi-val" style="color: var(--warning-600);">
          ${m.remainingTerm} parcelas
        </div>
        <div class="real-kpi-sub" style="display: flex; flex-direction: column; gap: 0.2rem;">
          <div>🎯 <b>Próximo Vencimento:</b> 26/11/2026 (#21)</div>
          <div>💰 <b>Valor Próxima Parcela:</b> R$ 2.714,95</div>
          <div>📅 <b>Previsão no Banco:</b> 26/12/2034</div>
        </div>
      </div>
    `;
  }

  // 2. Render Table
  renderRealLedgerTable();
};

function renderRealLedgerTable() {
  const tbody = document.getElementById('realLedgerTableBody');
  const countEl = document.getElementById('realLedgerTotalCount');
  if (!tbody) return;

  const filter = window.realLedgerState.activeFilter;
  const term = window.realLedgerState.searchTerm;
  const txs = window.realLedgerState.transactions;

  let filtered = txs.filter(tx => {
    // Filtro por tipo
    if (filter === 'amortization' && tx.type !== 'amortization') return false;
    if (filter === 'paid' && (tx.type !== 'installment' || tx.status !== 'Paga')) return false;
    if (filter === 'projected' && (tx.type !== 'installment' || tx.status === 'Paga')) return false;

    // Filtro de busca
    if (term) {
      const matchDate = (tx.date || '').includes(term);
      const matchDesc = (tx.description || '').toLowerCase().includes(term);
      const matchVal = (tx.operationAmount || 0).toString().includes(term) || (tx.totalPaid || 0).toString().includes(term);
      if (!matchDate && !matchDesc && !matchVal) return false;
    }
    return true;
  });

  if (countEl) {
    countEl.textContent = `${filtered.length} lançamento(s) exibido(s) de ${txs.length} no histórico`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Nenhum lançamento encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filtered.forEach(tx => {
    const isAmort = tx.type === 'amortization';
    const isInit = tx.type === 'contract_init';
    const isInst = tx.type === 'installment';

    let opBadge = '';
    if (isInit) {
      opBadge = `<span class="real-badge-op init">🏦 Implantação</span>`;
    } else if (isAmort) {
      opBadge = `<span class="real-badge-op amort">⚡ Amortização Extra</span>`;
    } else {
      opBadge = `<span class="real-badge-op installment">📑 Parcela #${tx.installmentNumber}</span>`;
    }

    let proRataHtml = '-';
    if (isAmort) {
      const juros = tx.proRataInterest || 0;
      const tr = tx.monetaryCorrection || 0;
      if (juros > 0 || tr > 0) {
        proRataHtml = `
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--warning-600);" title="Juros Pró-rata: ${window.fmt.currency(juros)} | TR: ${window.fmt.currency(tr)}">
            ${window.fmt.currency(juros + tr)}
            <small style="display: block; font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">J: ${window.fmt.currency(juros)} / TR: ${window.fmt.currency(tr)}</small>
          </div>
        `;
      } else {
        proRataHtml = `<span style="font-size: 0.75rem; color: var(--success-600);">Isento (Dia Venc.)</span>`;
      }
    }

    const statusBadge = tx.status === 'Paga'
      ? `<span class="real-status-badge paga">Paga</span>`
      : (tx.status === 'Projetada'
          ? `<span class="real-status-badge projetada">Projetada</span>`
          : `<span class="real-status-badge">${tx.status || 'Confirmada'}</span>`);

    const editBtn = !isInit ? `
      <button type="button" class="btn btn-icon btn-ghost btn-sm" onclick="${isAmort ? `openRealAmortizationModal('${tx.id}')` : `openRealInstallmentModal('${tx.id}')`}" title="Editar lançamento">
        ✏️
      </button>
      <button type="button" class="btn btn-icon btn-danger-ghost btn-sm" onclick="deleteRealEntry('${tx.id}')" title="Excluir lançamento">
        🗑️
      </button>
    ` : '-';

    html += `
      <tr>
        <td style="font-weight: 600; white-space: nowrap;">${window.fmt.dateISOToBR(tx.date)}</td>
        <td>${opBadge}</td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${tx.description || '-'}</td>
        <td style="font-weight: 700; color: ${isAmort ? 'var(--success-600)' : 'var(--text-main)'};">
          ${isInit ? '-' : window.fmt.currency(tx.operationAmount || tx.amortization || 0)}
        </td>
        <td>${proRataHtml}</td>
        <td style="font-weight: 700;">${isInit ? '-' : window.fmt.currency(tx.totalPaid || 0)}</td>
        <td style="font-weight: 700; color: var(--primary-600);">${window.fmt.currency(tx.balanceAfter || 0)}</td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <div class="real-actions-cell">${editBtn}</div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * Exportar histórico real para arquivo CSV
 */
window.exportRealLedgerCSV = function() {
  const txs = window.realLedgerState.transactions;
  if (!txs || txs.length === 0) {
    window.showToast('Nenhum dado para exportar.', 'warning');
    return;
  }

  let csv = 'Data;Tipo;Descricao;Abatimento Saldo;Juros Pro-rata;TR Pro-rata;Total Desembolsado;Saldo Devedor;Situacao\n';
  txs.forEach(t => {
    const date = window.fmt.dateISOToBR(t.date);
    const tipo = t.type === 'contract_init' ? 'Implantacao' : (t.type === 'amortization' ? 'Amortizacao Extra' : `Parcela #${t.installmentNumber}`);
    const desc = (t.description || '').replace(/;/g, ',');
    const abat = (t.operationAmount || t.amortization || 0).toFixed(2).replace('.', ',');
    const proRata = (t.proRataInterest || 0).toFixed(2).replace('.', ',');
    const tr = (t.monetaryCorrection || 0).toFixed(2).replace('.', ',');
    const total = (t.totalPaid || 0).toFixed(2).replace('.', ',');
    const saldo = (t.balanceAfter || 0).toFixed(2).replace('.', ',');
    const sit = t.status || 'Confirmada';
    csv += `${date};${tipo};${desc};${abat};${proRata};${tr};${total};${saldo};${sit}\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `extrato-oficial-financiamento-${new Date().toISOString().substring(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.showToast('Planilha CSV do extrato real baixada!', 'success');
};

/**
 * Sincroniza os lançamentos reais com os planos do simulador
 */
window.syncRealLedgerWithSimulator = function() {
  const txs = window.realLedgerState.transactions;
  const contract = window.realLedgerState.contract;

  // Atualizar parâmetros do financiamento
  if (contract.loanAmount) window.appState.loanAmount = contract.loanAmount;
  if (contract.startDate) window.appState.date = contract.startDate;
  if (contract.interestRateAnnual) {
    window.appState.interestRate = contract.effectiveRateAnnual || contract.interestRateAnnual;
  }

  // Agrupar amortizações extras por ciclo mensal de parcela
  // Cria planos do simulador para cada amortização ou grupo
  const newPlans = [];

  // Planos de encargos fixos
  newPlans.push({
    id: 'plan_corr_hist',
    type: 'correction',
    name: 'Correção TR Histórica (Parcelas 1 a 20)',
    value: 0.17,
    firstPayment: 1,
    lastPayment: 20,
    frequency: 1
  });
  newPlans.push({
    id: 'plan_fee_hist',
    type: 'fee',
    name: 'Seguro Mensal Histórico (MIP + DFI)',
    value: 40.00,
    firstPayment: 1,
    lastPayment: 20,
    frequency: 1
  });
  newPlans.push({
    id: 'plan_fee_proj',
    type: 'fee',
    name: 'Seguro Mensal Projetado (MIP + DFI)',
    value: 31.00,
    firstPayment: 21,
    lastPayment: 420,
    frequency: 1
  });

  // Mapear amortizações extras reais
  const amorts = txs.filter(t => t.type === 'amortization' && t.status !== 'Cancelada');
  amorts.forEach((am, idx) => {
    // Determinar a parcela de referência com base na data
    const dAmort = new Date(am.date + 'T00:00:00');
    const start = new Date(contract.startDate + 'T00:00:00');
    const diffMonths = (dAmort.getFullYear() - start.getFullYear()) * 12 + (dAmort.getMonth() - start.getMonth());
    const instNum = Math.max(1, diffMonths);

    newPlans.push({
      id: `plan_real_amort_${idx + 1}`,
      type: 'amortization',
      subType: am.subType || 'term',
      name: `Amort. Real (${window.fmt.dateISOToBR(am.date)} - R$ ${window.fmt.number(am.operationAmount, 0)})`,
      value: am.operationAmount,
      firstPayment: instNum,
      lastPayment: instNum,
      frequency: -1
    });
  });

  // Manter planos futuros planejados (após parcela 20)
  const existingFuturePlans = (window.appState.plans || []).filter(p => p.firstPayment > 20 && p.type === 'amortization');
  if (existingFuturePlans.length > 0) {
    newPlans.push(...existingFuturePlans);
  } else {
    // Adicionar estratégia futura padrão
    newPlans.push({
      id: 'plan_future_recurr',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Recorrente Planejada (R$ 2.800/mês)',
      value: 2800.00,
      firstPayment: 21,
      lastPayment: 420,
      frequency: 1
    });
  }

  window.appState.plans = newPlans;
  if (window.saveCurrentStateToStorage) window.saveCurrentStateToStorage();
  if (window.syncFormInputsFromState) window.syncFormInputsFromState();
  if (window.renderPlansList) window.renderPlansList();
  if (window.fetchSimulationData) window.fetchSimulationData();

  window.showToast('Cenário do simulador sincronizado com o extrato real!', 'success');
};

/**
 * =========================================================================
 * MÓDULO 2: LEITOR AUTOMÁTICO DE PDF & ANÁLISE DE DIVERGÊNCIAS
 * =========================================================================
 */

window.openPdfUploadModal = function() {
  const input = document.getElementById('pdfFileInput');
  if (input) input.value = '';
  const proc = document.getElementById('pdfProcessingIndicator');
  if (proc) proc.style.display = 'none';

  const modal = document.getElementById('modalPdfUpload');
  if (modal) modal.classList.add('active');
};

// Drag and drop setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('pdfDropZone');
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        processUploadedPdfFile(files[0]);
      }
    }, false);
  }
});

window.handlePdfFileSelected = function(e) {
  const file = e.target.files && e.target.files[0];
  if (file) {
    processUploadedPdfFile(file);
  }
};

async function processUploadedPdfFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    window.showToast('Por favor, selecione um arquivo em formato PDF.', 'error');
    return;
  }

  const indicator = document.getElementById('pdfProcessingIndicator');
  const textEl = document.getElementById('pdfProcessingText');
  if (indicator) indicator.style.display = 'block';
  if (textEl) textEl.textContent = 'Lendo páginas do PDF...';

  try {
    const arrayBuffer = await file.arrayBuffer();

    if (!window.pdfjsLib) {
      throw new Error('Biblioteca PDF.js não inicializada.');
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.js';

    const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const doc = await loadingTask.promise;

    if (textEl) textEl.textContent = `Extraindo textos de ${doc.numPages} página(s)...`;

    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = content.items;

      // Agrupar itens por linha Y
      const linesMap = new Map();
      items.forEach(item => {
        const y = Math.round(item.transform[5] / 2) * 2;
        if (!linesMap.has(y)) linesMap.set(y, []);
        linesMap.get(y).push(item);
      });

      const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
      for (const y of sortedY) {
        const lineItems = linesMap.get(y);
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
        const lineStr = lineItems.map(it => it.str).join(' ').trim();
        if (lineStr) {
          fullText += lineStr + '\n';
        }
      }
    }

    if (textEl) textEl.textContent = 'Analisando contrato e operações...';

    // Parser do DDC
    const extracted = parseDdcText(fullText);

    if (indicator) indicator.style.display = 'none';
    window.closeModal('modalPdfUpload');

    // Detectar divergências e novos lançamentos
    const divergences = detectDivergences(extracted);

    if (divergences.length > 0) {
      openDivergencesModal(divergences, extracted);
    } else {
      window.showToast('Extrato PDF lido com sucesso! Todos os dados conferem 100% com o seu controle.', 'success');
    }

  } catch (err) {
    console.error('Falha ao processar PDF:', err);
    if (indicator) indicator.style.display = 'none';
    window.showToast('Erro ao ler arquivo PDF: ' + err.message, 'error');
  }
}

function parseBrazilianNumber(str) {
  if (!str) return 0;
  const clean = str.trim().replace(/\./g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function parseBrazilianDate(str) {
  if (!str) return null;
  const match = str.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseDdcText(fullText) {
  const result = {
    contract: {},
    amortizations: [],
    installments: []
  };

  // 1. Cabeçalho
  const cpfMatch = fullText.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
  if (cpfMatch) {
    result.contract.cpf = cpfMatch[1];
  }
  const nameMatch = fullText.match(/(?:Itaú\s+)?([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{5,40}?)(?=\s+agência|\s+conta|\s*\n\s*\d{3}\.\d{3}\.\d{3}|\s+\d{3}\.\d{3}\.\d{3})/i);
  if (nameMatch) {
    result.contract.debtorName = nameMatch[1].trim();
  }

  const agencyMatch = fullText.match(/agência:?\s*(\d+)/i);
  if (agencyMatch) result.contract.agency = agencyMatch[1];

  const accountMatch = fullText.match(/conta:?\s*([\d-]+)/i);
  if (accountMatch) result.contract.account = accountMatch[1];

  const issueMatch = fullText.match(/Emitido em\s+([\d.]+)\s+(?:às|ás)\s+([\d:]+)/i);
  if (issueMatch) result.contract.issuedAt = `${issueMatch[1]} ${issueMatch[2]}`;

  const contractNumMatch = fullText.match(/Número do contrato:?\s*(\d+)/i);
  if (contractNumMatch) result.contract.contractNumber = contractNumMatch[1];

  const totalTermMatch = fullText.match(/Prazo total operação:?\s*(\d+)/i);
  if (totalTermMatch) result.contract.totalTerm = parseInt(totalTermMatch[1], 10);

  const remTermMatch = fullText.match(/Prazo remanescente:?\s*(\d+)/i);
  if (remTermMatch) result.contract.remainingTerm = parseInt(remTermMatch[1], 10);

  const monthlyRateMatch = fullText.match(/Taxa de Juros \(mensal\):?\s*([\d.,]+)%?/i);
  if (monthlyRateMatch) result.contract.interestRateMonthly = parseBrazilianNumber(monthlyRateMatch[1]);

  const annualRateMatch = fullText.match(/Taxa de Juros \(anual\):?\s*([\d.,]+)%?/i);
  if (annualRateMatch) result.contract.interestRateAnnual = parseBrazilianNumber(annualRateMatch[1]);

  const effectiveRateMatch = fullText.match(/Taxa efetiva \(anual\):?\s*([\d.,]+)%?/i);
  if (effectiveRateMatch) result.contract.effectiveRateAnnual = parseBrazilianNumber(effectiveRateMatch[1]);

  const systemMatch = fullText.match(/Sistema de amortização:?\s*([A-Za-z]+)/i);
  if (systemMatch) result.contract.amortizationSystem = systemMatch[1].toUpperCase();

  const lastPaymentValMatch = fullText.match(/Valor da última parcela \(no vencimento\):?\s*R\$?\s*([\d.,]+)/i);
  if (lastPaymentValMatch) result.contract.lastInstallmentValue = parseBrazilianNumber(lastPaymentValMatch[1]);

  const lastDueDateMatch = fullText.match(/Data do vencimento da última parcela:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (lastDueDateMatch) result.contract.lastDueDate = parseBrazilianDate(lastDueDateMatch[1]);

  // Implantação
  const implMatch = fullText.match(/Operação:\s*Implantacao[^\n]*Data:\s*(\d{2}\/\d{2}\/\d{4})\s*Valor da Operação:\s*([\d.,]+)/i);
  if (implMatch) {
    result.contract.startDate = parseBrazilianDate(implMatch[1]);
    result.contract.loanAmount = parseBrazilianNumber(implMatch[2]);
  }

  // Linhas de amortizações extras e parcelas
  const lines = fullText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Amortizações extras
    if (line.includes('Operação:') && line.toLowerCase().includes('amortizacao')) {
      const dateM = line.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i);
      const valM = line.match(/Valor da Operação:\s*([\d.,]+)/i);
      const jurosM = line.match(/Juros Pró-rata:\s*([\d.,]+)/i);
      const corrM = line.match(/Atualização monetária:\s*([\d.,]+)/i);

      if (dateM && valM) {
        const opVal = parseBrazilianNumber(valM[1]);
        const jurosVal = jurosM ? parseBrazilianNumber(jurosM[1]) : 0;
        const corrVal = corrM ? parseBrazilianNumber(corrM[1]) : 0;
        result.amortizations.push({
          date: parseBrazilianDate(dateM[1]),
          dateBR: dateM[1],
          operationAmount: opVal,
          proRataInterest: jurosVal,
          monetaryCorrection: corrVal,
          totalDisbursed: Math.round((opVal + jurosVal + corrVal) * 100) / 100,
          description: 'Amortização redução de prazo recurso próprio'
        });
      }
      continue;
    }

    // Parcelas
    // Linha de parcela: número, data vencimento, amortização, juros, TR, MIP, DFI... Situação... Total, Saldo
    const instMatch = line.match(/(?:^|Operação:[^\n]+?\s+)(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(Paga|Projetada|Pendente)\s+([\d.,]+)\s+([\d.,]+)/i);
    if (instMatch) {
      result.installments.push({
        installmentNumber: parseInt(instMatch[1], 10),
        dueDate: parseBrazilianDate(instMatch[2]),
        dueDateBR: instMatch[2],
        amortization: parseBrazilianNumber(instMatch[3]),
        interest: parseBrazilianNumber(instMatch[4]),
        correctionIndex: parseBrazilianNumber(instMatch[5]),
        mip: parseBrazilianNumber(instMatch[6]),
        dfi: parseBrazilianNumber(instMatch[7]),
        res: parseBrazilianNumber(instMatch[8]),
        tca: parseBrazilianNumber(instMatch[9]),
        penalty: parseBrazilianNumber(instMatch[10]),
        mora: parseBrazilianNumber(instMatch[11]),
        adjustment: parseBrazilianNumber(instMatch[12]),
        fgts: parseBrazilianNumber(instMatch[13]),
        balanceCorrectionIndex: parseBrazilianNumber(instMatch[14]),
        agreement: parseBrazilianNumber(instMatch[15]),
        status: instMatch[16].trim(),
        totalAmount: parseBrazilianNumber(instMatch[17]),
        outstandingBalance: parseBrazilianNumber(instMatch[18])
      });
    }
  }

  return result;
}

/**
 * Detecção de Divergências e Novos Lançamentos
 */
function detectDivergences(extracted) {
  const divergences = [];
  const currentTxs = window.realLedgerState.transactions;
  const currentContract = window.realLedgerState.contract;
  const metrics = window.realLedgerState.metrics;

  // 1. Verificar novos pagamentos de parcelas
  extracted.installments.forEach(inst => {
    if (inst.status === 'Paga') {
      const match = currentTxs.find(t => t.type === 'installment' && t.installmentNumber === inst.installmentNumber);
      if (!match) {
        divergences.push({
          id: `diff_inst_new_${inst.installmentNumber}`,
          type: 'new_installment',
          title: `Nova Parcela Paga (#${inst.installmentNumber})`,
          itemDesc: `Vencimento ${inst.dueDateBR} • Total ${window.fmt.currency(inst.totalAmount)}`,
          systemVal: 'Não lançada no sistema',
          pdfVal: `Paga em ${inst.dueDateBR} • Saldo ${window.fmt.currency(inst.outstandingBalance)}`,
          data: inst
        });
      } else if (match.status !== 'Paga') {
        divergences.push({
          id: `diff_inst_status_${inst.installmentNumber}`,
          type: 'update_installment_status',
          title: `Atualização de Status da Parcela #${inst.installmentNumber}`,
          itemDesc: `A parcela consta como PAGA no extrato bancário.`,
          systemVal: `Status Atual: ${match.status}`,
          pdfVal: `Status no PDF: Paga (${window.fmt.currency(inst.totalAmount)})`,
          data: inst
        });
      }
    }
  });

  // 2. Verificar novas amortizações extras
  extracted.amortizations.forEach((am, idx) => {
    const match = currentTxs.find(t => t.type === 'amortization' && t.date === am.date && Math.abs(t.operationAmount - am.operationAmount) < 1.0);
    if (!match) {
      divergences.push({
        id: `diff_amort_new_${idx}`,
        type: 'new_amortization',
        title: `Nova Amortização Extra (${am.dateBR})`,
        itemDesc: `Aporte extra localizado no extrato do banco.`,
        systemVal: 'Não cadastrada no sistema',
        pdfVal: `${window.fmt.currency(am.operationAmount)} (Juros Pró-rata: ${window.fmt.currency(am.proRataInterest)})`,
        data: am
      });
    } else {
      // Verificar se houve divergência nos juros pró-rata
      if (Math.abs((match.proRataInterest || 0) - (am.proRataInterest || 0)) > 0.05) {
        divergences.push({
          id: `diff_amort_prorata_${idx}`,
          type: 'update_amort_prorata',
          title: `Divergência de Juros Pró-rata (${am.dateBR})`,
          itemDesc: `Amortização de ${window.fmt.currency(am.operationAmount)}`,
          systemVal: `Juros no sistema: ${window.fmt.currency(match.proRataInterest || 0)}`,
          pdfVal: `Juros cobrados pelo banco: ${window.fmt.currency(am.proRataInterest)}`,
          data: { tx: match, extracted: am }
        });
      }
    }
  });

  // 3. Saldo devedor e prazo remanescente
  const lastPaidPdfInst = extracted.installments.filter(i => i.status === 'Paga').pop();
  if (lastPaidPdfInst && metrics) {
    if (Math.abs(lastPaidPdfInst.outstandingBalance - metrics.currentBalance) > 1.0) {
      divergences.push({
        id: 'diff_current_balance',
        type: 'balance_divergence',
        title: 'Saldo Devedor Atual (Itaú)',
        itemDesc: 'Divergência entre o saldo calculado no sistema e o saldo registrado no extrato oficial do banco.',
        systemVal: window.fmt.currency(metrics.currentBalance),
        pdfVal: window.fmt.currency(lastPaidPdfInst.outstandingBalance),
        data: { targetBalance: lastPaidPdfInst.outstandingBalance }
      });
    }
  }

  return divergences;
}

/**
 * Abertura do Modal de Reconciliação & Escolha de Resolução
 */
function openDivergencesModal(divergences, extractedDdc) {
  window.realLedgerState.pendingDivergences = divergences;
  window.realLedgerState.pendingExtractedDdc = extractedDdc;
  window.realLedgerState.selectedDivergenceChoices = {};

  // Inicializar com escolha padrão 'pdf' (recomendado) para todas
  divergences.forEach(d => {
    window.realLedgerState.selectedDivergenceChoices[d.id] = 'pdf';
  });

  const headerEl = document.getElementById('divergencesSummaryHeader');
  if (headerEl) {
    headerEl.innerHTML = `
      <div style="background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.2); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem;">
        <div style="font-weight: 700; color: var(--primary-700); font-size: 0.95rem;">
          📑 Extrato PDF Processado com Sucesso!
        </div>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
          Encontramos <b>${divergences.length} divergência(s) / novo(s) lançamento(s)</b> em relação aos dados salvos. Revise abaixo e escolha a fonte desejada para cada item:
        </div>
      </div>
    `;
  }

  renderDivergencesList();

  const modal = document.getElementById('modalDivergences');
  if (modal) modal.classList.add('active');
}

function renderDivergencesList() {
  const container = document.getElementById('divergencesListContainer');
  if (!container) return;

  const divergences = window.realLedgerState.pendingDivergences || [];
  const choices = window.realLedgerState.selectedDivergenceChoices || {};

  let html = '';
  divergences.forEach(d => {
    const currentChoice = choices[d.id] || 'pdf';
    const isNew = d.type.includes('new');

    html += `
      <div class="divergence-card ${isNew ? 'is-new' : 'has-diff'}">
        <div class="divergence-top">
          <div class="divergence-title">
            <span>${isNew ? '✨' : '⚠️'}</span>
            <span>${d.title}</span>
          </div>
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted);">${d.itemDesc}</span>
        </div>

        <div class="divergence-diff-grid">
          <div class="diff-col">
            <span class="diff-label">Cadastrado no Sistema</span>
            <span class="diff-val" style="color: var(--text-muted);">${d.systemVal}</span>
          </div>
          <div class="diff-col">
            <span class="diff-label" style="color: var(--primary-600);">Extraído do Arquivo PDF (Banco)</span>
            <span class="diff-val" style="color: var(--primary-600); font-weight: 700;">${d.pdfVal}</span>
          </div>
        </div>

        <div class="diff-choice-group">
          <label class="diff-choice-item">
            <input type="radio" name="choice_${d.id}" value="pdf" ${currentChoice === 'pdf' ? 'checked' : ''} onchange="setDivergenceChoice('${d.id}', 'pdf')">
            <span style="font-weight: 600; color: var(--primary-600);">Atualizar para dados do PDF (Recomendado)</span>
          </label>
          <label class="diff-choice-item">
            <input type="radio" name="choice_${d.id}" value="system" ${currentChoice === 'system' ? 'checked' : ''} onchange="setDivergenceChoice('${d.id}', 'system')">
            <span>Manter dados atuais do sistema</span>
          </label>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.setDivergenceChoice = function(diffId, choice) {
  window.realLedgerState.selectedDivergenceChoices[diffId] = choice;
};

window.setAllDivergenceChoices = function(choice) {
  const divergences = window.realLedgerState.pendingDivergences || [];
  divergences.forEach(d => {
    window.realLedgerState.selectedDivergenceChoices[d.id] = choice;
  });
  renderDivergencesList();
};

/**
 * Aplica as decisões de reconciliação selecionadas pelo usuário
 */
window.applyDivergenceDecisions = function() {
  const divergences = window.realLedgerState.pendingDivergences || [];
  const choices = window.realLedgerState.selectedDivergenceChoices || {};
  const extracted = window.realLedgerState.pendingExtractedDdc;
  if (!extracted) return;

  let appliedCount = 0;

  divergences.forEach(d => {
    const choice = choices[d.id] || 'pdf';
    if (choice === 'pdf') {
      appliedCount++;
      if (d.type === 'new_installment') {
        const inst = d.data;
        window.realLedgerState.transactions.push({
          id: 'inst_' + inst.installmentNumber + '_' + Date.now(),
          type: 'installment',
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          date: inst.dueDate,
          description: `Parcela Mensal #${inst.installmentNumber}`,
          amortization: inst.amortization,
          interest: inst.interest,
          mip: inst.mip,
          dfi: inst.dfi,
          correctionIndex: inst.correctionIndex,
          operationAmount: inst.amortization,
          proRataInterest: 0,
          monetaryCorrection: 0,
          totalPaid: inst.totalAmount,
          balanceAfter: inst.outstandingBalance,
          status: 'Paga'
        });
      } else if (d.type === 'update_installment_status') {
        const inst = d.data;
        const tx = window.realLedgerState.transactions.find(t => t.type === 'installment' && t.installmentNumber === inst.installmentNumber);
        if (tx) {
          tx.status = 'Paga';
          tx.totalPaid = inst.totalAmount;
          tx.amortization = inst.amortization;
          tx.interest = inst.interest;
        }
      } else if (d.type === 'new_amortization') {
        const am = d.data;
        window.realLedgerState.transactions.push({
          id: 'amort_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          type: 'amortization',
          subType: 'term',
          date: am.date,
          description: am.description || 'Amortização redução de prazo recurso próprio',
          operationAmount: am.operationAmount,
          proRataInterest: am.proRataInterest,
          monetaryCorrection: am.monetaryCorrection,
          totalPaid: am.totalDisbursed,
          status: 'Paga'
        });
      } else if (d.type === 'update_amort_prorata') {
        const { tx, extracted: am } = d.data;
        tx.proRataInterest = am.proRataInterest;
        tx.monetaryCorrection = am.monetaryCorrection;
        tx.totalPaid = Math.round((tx.operationAmount + am.proRataInterest + am.monetaryCorrection) * 100) / 100;
      }
    }
  });

  // Atualizar dados contratuais com o que foi extraído do PDF
  if (extracted.contract) {
    Object.assign(window.realLedgerState.contract, extracted.contract);
  }

  // Recalcular saldos
  recalculateRealLedger();
  renderRealLedger();

  // Verificar se usuário marcou checkbox para sincronizar o simulador
  const syncCb = document.getElementById('syncScenarioCheckbox');
  if (syncCb && syncCb.checked) {
    window.syncRealLedgerWithSimulator();
  }

  window.closeModal('modalDivergences');
  window.showToast(`${appliedCount} atualização(ões) do extrato bancário aplicada(s) com sucesso!`, 'success');
};

// Expor funções no objeto global window
window.recalculateRealLedger = recalculateRealLedger;
window.calcProRataForDate = calcProRataForDate;
window.parseDdcText = parseDdcText;
window.detectDivergences = detectDivergences;
window.openDivergencesModal = openDivergencesModal;
window.initRealLedger = initRealLedger;

// Inicializar quando o script for carregado
initRealLedger();
