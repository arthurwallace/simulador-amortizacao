/**
 * SIMULADOR DE AMORTIZAÇÃO DE EMPRÉSTIMOS E FINANCIAMENTOS
 * SAC & PRICE com Amortizações Extras, Taxas e Correção Monetária
 * Integração com a API simuladoramortizacao.com.br & Motor de Cálculo Local Resiliente
 * Zero Bloat - 100% Compatível com Cloudflare Pages
 */

const API_CONFIG = {
  url: 'https://simuladoramortizacao.com.br/api/v1/amortization-simulator',
  key: 'dBxyK8QLzT3hc3QdmDSNMeNv3cjH2pkxcHYftu2wUhY7E8agv7'
};

const STORAGE_KEYS = {
  STATE: 'amort_state_v3',
  SCENARIOS: 'amort_scenarios_v3',
  THEME: 'amort_theme_v1'
};

// Default Scenario extracted from the user's provided simulation data
const DEFAULT_USER_SCENARIO = {
  name: 'Financiamento R$ 228k (SAC)',
  loanAmount: 228000,
  date: '2025-02-26',
  amortizationSystemType: 0, // 0 = SAC, 1 = Price
  interestRate: 12.19,
  interestRateType: 0, // 0 = a.a. (anual), 1 = a.m. (mensal)
  numberOfInstallments: 420,
  plans: [
    {
      id: 'plan_1',
      type: 'correction',
      name: 'Correção Monetária (TR/IPCA)',
      value: 0.17, // 0.17%
      firstPayment: 0,
      lastPayment: 420,
      frequency: 1
    },
    {
      id: 'plan_2',
      type: 'fee',
      name: 'Taxa / Seguro Mensal',
      value: 40.00,
      firstPayment: 0,
      lastPayment: 420,
      frequency: 1
    },
    {
      id: 'plan_3',
      type: 'amortization',
      subType: 'term', // prazo
      name: 'Amortização Extra',
      value: 4443.80,
      firstPayment: 7,
      lastPayment: 7,
      frequency: -1
    },
    {
      id: 'plan_4',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 1800.00,
      firstPayment: 8,
      lastPayment: 8,
      frequency: -1
    },
    {
      id: 'plan_5',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 7148.42,
      firstPayment: 9,
      lastPayment: 9,
      frequency: -1
    },
    {
      id: 'plan_6',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 4100.00,
      firstPayment: 10,
      lastPayment: 10,
      frequency: -1
    },
    {
      id: 'plan_7',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 3550.00,
      firstPayment: 11,
      lastPayment: 11,
      frequency: -1
    },
    {
      id: 'plan_8',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 50000.00,
      firstPayment: 16,
      lastPayment: 16,
      frequency: -1
    },
    {
      id: 'plan_9',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 6600.00,
      firstPayment: 17,
      lastPayment: 17,
      frequency: -1
    },
    {
      id: 'plan_10',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 3742.16,
      firstPayment: 18,
      lastPayment: 18,
      frequency: -1
    },
    {
      id: 'plan_11',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Extra',
      value: 2836.92,
      firstPayment: 19,
      lastPayment: 19,
      frequency: -1
    },
    {
      id: 'plan_12',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Recorrente',
      value: 2800.00,
      firstPayment: 20,
      lastPayment: 22,
      frequency: 1
    },
    {
      id: 'plan_13',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Pontual',
      value: 12000.00,
      firstPayment: 23,
      lastPayment: 23,
      frequency: -1
    },
    {
      id: 'plan_14',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Recorrente',
      value: 2800.00,
      firstPayment: 23,
      lastPayment: 40,
      frequency: 1
    },
    {
      id: 'plan_15',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Pontual',
      value: 10000.00,
      firstPayment: 41,
      lastPayment: 41,
      frequency: -1
    },
    {
      id: 'plan_16',
      type: 'amortization',
      subType: 'term',
      name: 'Amortização Recorrente',
      value: 2800.00,
      firstPayment: 42,
      lastPayment: 420,
      frequency: 1
    }
  ]
};

// Application State
let appState = {
  ...DEFAULT_USER_SCENARIO,
  result: null,
  activeTableTab: 'withAmort', // 'withAmort' | 'withoutAmort'
  activeMainTab: localStorage.getItem('simulador_active_main_tab') || 'nextActions',
  nextActionsHorizon: 6,
  tablePage: 1,
  tablePageSize: 50,
  tableSearchTerm: ''
};

// Utilities & Formatters
const fmt = {
  currency: (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  },
  currencyCompact: (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0';
    if (val >= 1000000) return 'R$ ' + (val / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (val >= 1000) return 'R$ ' + (val / 1000).toFixed(0) + 'k';
    return fmt.currency(val);
  },
  number: (val, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return '0,00';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
  },
  percent: (val) => {
    return `${fmt.number(val, 2)}%`;
  },
  parseCurrency: (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = str.replace(/[^\d]/g, '');
    return clean ? parseFloat(clean) / 100 : 0;
  },
  dateISOToMonthYear: (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
  },
  dateISOToBR: (iso) => {
    if (!iso) return '-';
    const parts = iso.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  }
};

// Local Storage Handlers
function saveCurrentStateToStorage() {
  try {
    const toSave = {
      name: appState.name,
      loanAmount: appState.loanAmount,
      date: appState.date,
      amortizationSystemType: appState.amortizationSystemType,
      interestRate: appState.interestRate,
      interestRateType: appState.interestRateType,
      numberOfInstallments: appState.numberOfInstallments,
      plans: appState.plans
    };
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(toSave));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
}

async function loadStateAndGlobalDefault() {
  let fetchedDefault = null;
  // 1. Fetch default-scenario.json from site if available (cache-busted)
  try {
    const res = await fetch('./default-scenario.json?v=' + Date.now(), { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.loanAmount === 'number' && Array.isArray(data.plans)) {
        fetchedDefault = data;
        Object.assign(DEFAULT_USER_SCENARIO, data);
      }
    }
  } catch (e) {
    console.warn('default-scenario.json fetch failed, using embedded default', e);
  }

  const serverTs = fetchedDefault?.updatedAt || DEFAULT_USER_SCENARIO.updatedAt;
  const lastAppliedTs = localStorage.getItem('simulador_applied_default_ts');

  // If server default has been updated (or first run), apply it immediately as the active scenario for all visitors
  if (serverTs && serverTs !== lastAppliedTs) {
    appState = { ...appState, ...DEFAULT_USER_SCENARIO };
    localStorage.setItem('simulador_applied_default_ts', serverTs);
    saveCurrentStateToStorage();
    return;
  }

  // 2. Load from localStorage if user has custom saved state
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.loanAmount === 'number' && Array.isArray(parsed.plans)) {
        appState = { ...appState, ...parsed };
        return;
      }
    }
  } catch (e) {
    console.warn('LocalStorage load failed', e);
  }

  // 3. Fallback to global default
  appState = { ...appState, ...DEFAULT_USER_SCENARIO };
  if (serverTs) {
    localStorage.setItem('simulador_applied_default_ts', serverTs);
  }
}

function getSavedScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
    return raw ? JSON.parse(raw) : { [DEFAULT_USER_SCENARIO.name]: DEFAULT_USER_SCENARIO };
  } catch (e) {
    return { [DEFAULT_USER_SCENARIO.name]: DEFAULT_USER_SCENARIO };
  }
}

function saveScenarioToStorage(name, scenarioData) {
  const scenarios = getSavedScenarios();
  scenarios[name] = { ...scenarioData, name, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
}

function deleteScenarioFromStorage(name) {
  const scenarios = getSavedScenarios();
  delete scenarios[name];
  localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
}

// Payload Constructor for simuladoramortizacao.com.br
function buildApiPayload() {
  const amortizations = {};
  const fees = {};
  const monetaryCorrections = {};

  appState.plans.forEach(p => {
    if (p.type === 'fee') {
      const start = Number(p.firstPayment);
      const end = Number(p.lastPayment);
      const freq = Number(p.frequency) || 1;
      for (let i = start; i <= end; i += freq) {
        fees[i] = Number(p.value);
      }
    } else if (p.type === 'correction') {
      const start = Number(p.firstPayment);
      const end = Number(p.lastPayment);
      const freq = Number(p.frequency) || 1;
      for (let i = start; i <= end; i += freq) {
        monetaryCorrections[i] = Number(p.value);
      }
    } else if (p.type === 'amortization') {
      const isTerm = p.subType === 'term';
      if (p.frequency === -1 || p.frequency === 0 || !p.frequency) {
        const idx = Number(p.firstPayment);
        const existing = amortizations[idx]?.value || 0;
        amortizations[idx] = {
          amortizationByTerm: isTerm,
          value: existing + Number(p.value)
        };
      } else {
        const start = Number(p.firstPayment);
        const end = Number(p.lastPayment);
        const freq = Number(p.frequency);
        for (let idx = start; idx <= end; idx += freq) {
          const existing = amortizations[idx]?.value || 0;
          amortizations[idx] = {
            amortizationByTerm: isTerm,
            value: existing + Number(p.value)
          };
        }
      }
    }
  });

  return {
    date: appState.date,
    loanAmount: Number(appState.loanAmount),
    interestRateType: Number(appState.interestRateType),
    numberOfInstallments: Number(appState.numberOfInstallments),
    amortizationSystemType: Number(appState.amortizationSystemType),
    interestRate: Number(appState.interestRate),
    fees,
    monetaryCorrections,
    amortizations
  };
}

// Fallback Local Math Engine (SAC & Price Simulation)
function runLocalSimulation(payload) {
  const n = payload.numberOfInstallments;
  const pv = payload.loanAmount;
  const isSAC = payload.amortizationSystemType === 0;

  // Monthly interest rate calculation
  const iAnnual = payload.interestRate / 100;
  const iMonthly = payload.interestRateType === 0 ? Math.pow(1 + iAnnual, 1 / 12) - 1 : payload.interestRate / 100;

  function simulateScenario(withAmort) {
    let balance = pv;
    const table = [];
    let totalInterest = 0;
    let totalAmort = 0;
    let totalExtraAmort = 0;
    let totalFees = 0;
    let totalCorrection = 0;

    let startDate = new Date(payload.date + 'T00:00:00');

    // Initial row 0
    table.push({
      installment: 0,
      date: startDate.toISOString(),
      installmentAmount: 0,
      installmentAmountWithFee: 0,
      monetaryCorrection: 0,
      monetaryCorrectionValue: 0,
      fee: 0,
      interestAmount: 0,
      monthlyAmortization: 0,
      amortization: 0,
      outstandingBalance: balance,
      amortizationByTerm: false
    });

    let currentRemainingInstallments = n;

    for (let k = 1; k <= n && balance > 0.01; k++) {
      const curDate = new Date(startDate);
      curDate.setMonth(curDate.getMonth() + k);

      // Monetary correction
      const corrRate = (payload.monetaryCorrections[k] || 0) / 100;
      const corrVal = balance * corrRate;
      balance += corrVal;
      totalCorrection += corrVal;

      // Fee
      const fee = payload.fees[k] || 0;
      totalFees += fee;

      // Interest
      const interest = balance * iMonthly;
      totalInterest += interest;

      // Base amortization
      let monthlyAmort = 0;
      let installmentAmount = 0;
      const safeRemaining = Math.max(1, currentRemainingInstallments);

      if (isSAC) {
        monthlyAmort = balance / safeRemaining;
        if (monthlyAmort > balance) monthlyAmort = balance;
        installmentAmount = monthlyAmort + interest;
      } else {
        // Price PMT
        const denom = Math.pow(1 + iMonthly, safeRemaining) - 1;
        const pmt = denom > 0 ? balance * (iMonthly * Math.pow(1 + iMonthly, safeRemaining)) / denom : balance + interest;
        installmentAmount = pmt;
        monthlyAmort = pmt - interest;
        if (monthlyAmort > balance) {
          monthlyAmort = balance;
          installmentAmount = monthlyAmort + interest;
        }
      }

      balance -= monthlyAmort;
      totalAmort += monthlyAmort;

      // Extra amortization
      let extraVal = 0;
      let byTerm = true;
      if (withAmort && payload.amortizations[k]) {
        extraVal = payload.amortizations[k].value;
        byTerm = payload.amortizations[k].amortizationByTerm;

        if (extraVal > balance) extraVal = balance;
        balance -= extraVal;
        totalExtraAmort += extraVal;

        if (byTerm) {
          if (monthlyAmort > 0) {
            currentRemainingInstallments = Math.max(1, Math.round(balance / monthlyAmort));
          }
        }
      }

      currentRemainingInstallments--;

      table.push({
        installment: k,
        date: curDate.toISOString(),
        installmentAmount: installmentAmount,
        installmentAmountWithFee: installmentAmount + fee,
        monetaryCorrection: corrRate,
        monetaryCorrectionValue: corrVal,
        fee: fee,
        interestAmount: interest,
        monthlyAmortization: monthlyAmort,
        amortization: extraVal,
        outstandingBalance: Math.max(0, balance),
        amortizationByTerm: byTerm
      });

      if (balance <= 0.01) break;
    }

    const firstInst = table[1] ? table[1].installmentAmountWithFee : 0;
    const finalInst = table[table.length - 1] ? table[table.length - 1].installmentAmountWithFee : 0;
    const totalPaid = totalAmort + totalExtraAmort + totalInterest + totalFees + totalCorrection;

    return {
      summary: {
        loanAmount: pv,
        totalAmountPayable: totalPaid,
        totalInterestAmount: totalInterest,
        totalAmortization: totalExtraAmort,
        totalFees: totalFees,
        totalCorrectionValue: totalCorrection,
        interestRate: payload.interestRate,
        numberOfInstallments: table.length - 1,
        firstInstallmentAmount: firstInst,
        finalInstallmentAmount: finalInst,
        amortizationSystemType: payload.amortizationSystemType,
        interestRateType: payload.interestRateType
      },
      table
    };
  }

  const standard = simulateScenario(false);
  const withAmort = simulateScenario(true);

  return {
    sucess: true,
    data: {
      summaryResult: standard.summary,
      summaryWithAmortizationResult: withAmort.summary,
      simulationTable: standard.table,
      simulationWithAmortizationTable: withAmort.table
    }
  };
}

// Simulation Service Orchestrator (API + Fallback)
async function fetchSimulationData() {
  const payload = buildApiPayload();
  const simButton = document.getElementById('btnSimulate');
  const originalBtnHtml = simButton ? simButton.innerHTML : '';

  if (simButton) {
    simButton.disabled = true;
    simButton.innerHTML = `<div class="loading-spinner"></div> Calculando...`;
  }

  try {
    const res = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'x-api-key': API_CONFIG.key,
        'Content-Type': 'application/json',
        'Accept-Language': 'pt-BR',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data && data.sucess && data.data) {
      appState.result = data.data;
      updateApiStatusBadge(true);
      showToast('Simulação calculada com sucesso!', 'success');
    } else {
      throw new Error('API format invalid');
    }
  } catch (err) {
    console.warn('API error, using resilient local fallback calculation engine:', err);
    const localData = runLocalSimulation(payload);
    appState.result = localData.data;
    updateApiStatusBadge(false);
    showToast('Calculado via motor financeiro local!', 'info');
  } finally {
    if (simButton) {
      simButton.disabled = false;
      simButton.innerHTML = originalBtnHtml;
    }
    saveCurrentStateToStorage();
    renderAll();
  }
}

// UI Updating & Rendering
function updateApiStatusBadge(isOnline) {
  const badge = document.getElementById('apiStatusBadge');
  if (!badge) return;
  if (isOnline) {
    badge.innerHTML = `<span class="pulse-dot"></span> <span>API Oficial Conectada</span>`;
    badge.title = 'Conectado à API oficial do simuladoramortizacao.com.br';
  } else {
    badge.innerHTML = `<span class="pulse-dot" style="background-color: var(--warning-500)"></span> <span>Motor Local Ativo</span>`;
    badge.title = 'Operando localmente no navegador';
  }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Form Bindings
function syncFormInputsFromState() {
  const loanInput = document.getElementById('loanAmount');
  const dateInput = document.getElementById('date');
  const sysSelect = document.getElementById('amortizationSystemType');
  const rateInput = document.getElementById('interestRate');
  const rateTypeSelect = document.getElementById('interestRateType');
  const installInput = document.getElementById('numberOfInstallments');

  if (loanInput) loanInput.value = fmt.currency(appState.loanAmount);
  if (dateInput) dateInput.value = appState.date;
  if (sysSelect) sysSelect.value = String(appState.amortizationSystemType);
  if (rateInput) rateInput.value = String(appState.interestRate);
  if (rateTypeSelect) rateTypeSelect.value = String(appState.interestRateType);
  if (installInput) installInput.value = String(appState.numberOfInstallments);
}

function attachFormListeners() {
  const loanInput = document.getElementById('loanAmount');
  if (loanInput) {
    loanInput.addEventListener('input', (e) => {
      const val = fmt.parseCurrency(e.target.value);
      appState.loanAmount = val;
      e.target.value = fmt.currency(val);
    });
  }

  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      appState.date = e.target.value;
    });
  }

  const sysSelect = document.getElementById('amortizationSystemType');
  if (sysSelect) {
    sysSelect.addEventListener('change', (e) => {
      appState.amortizationSystemType = Number(e.target.value);
    });
  }

  const rateInput = document.getElementById('interestRate');
  if (rateInput) {
    rateInput.addEventListener('input', (e) => {
      appState.interestRate = parseFloat(e.target.value.replace(',', '.')) || 0;
    });
  }

  const rateTypeSelect = document.getElementById('interestRateType');
  if (rateTypeSelect) {
    rateTypeSelect.addEventListener('change', (e) => {
      appState.interestRateType = Number(e.target.value);
    });
  }

  const installInput = document.getElementById('numberOfInstallments');
  if (installInput) {
    installInput.addEventListener('input', (e) => {
      appState.numberOfInstallments = parseInt(e.target.value, 10) || 0;
    });
  }

  const simForm = document.getElementById('simulationForm');
  if (simForm) {
    simForm.addEventListener('submit', (e) => {
      e.preventDefault();
      fetchSimulationData();
    });
  }

  const modalAmortValInput = document.getElementById('modalAmortValue');
  if (modalAmortValInput) {
    modalAmortValInput.addEventListener('input', (e) => {
      const val = fmt.parseCurrency(e.target.value);
      e.target.value = fmt.currency(val);
    });
  }

  const modalFeeValInput = document.getElementById('modalFeeValue');
  if (modalFeeValInput) {
    modalFeeValInput.addEventListener('input', (e) => {
      const val = fmt.parseCurrency(e.target.value);
      e.target.value = fmt.currency(val);
    });
  }

  // Theme Toggle
  const themeToggle = document.getElementById('btnThemeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
}

// Plan Helpers
function getPlansForInstallment(instNum) {
  return appState.plans.filter(p => {
    if (p.type !== 'amortization') return false;
    const start = Number(p.firstPayment);
    if (p.frequency === -1 || p.frequency === 0 || !p.frequency) {
      return start === instNum;
    }
    const end = Number(p.lastPayment);
    const freq = Number(p.frequency);
    return instNum >= start && instNum <= end && ((instNum - start) % freq === 0);
  });
}

function getOverlappingPlansForPlan(plan, planIndex) {
  if (plan.type !== 'amortization') return [];
  const pStart = Number(plan.firstPayment);
  const pEnd = plan.frequency > 0 ? Number(plan.lastPayment) : pStart;
  const pFreq = plan.frequency > 0 ? Number(plan.frequency) : 1;

  const overlapping = [];
  appState.plans.forEach((other, oIdx) => {
    if (oIdx === planIndex || other.type !== 'amortization') return;
    const oStart = Number(other.firstPayment);
    const oEnd = other.frequency > 0 ? Number(other.lastPayment) : oStart;
    const oFreq = other.frequency > 0 ? Number(other.frequency) : 1;

    for (let k = pStart; k <= pEnd; k += pFreq) {
      if (k >= oStart && k <= oEnd && ((k - oStart) % oFreq === 0)) {
        overlapping.push({ parcel: k, otherPlan: other });
        break;
      }
    }
  });
  return overlapping;
}

// Plan Management Rendering
function renderPlansList() {
  const container = document.getElementById('plansListContainer');
  const countBadge = document.getElementById('plansCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${appState.plans.length} planos`;

  if (appState.plans.length === 0) {
    container.innerHTML = `
      <div class="empty-plans-state">
        <p>Nenhuma amortização extra, taxa ou correção adicionada.</p>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">Clique nos botões acima para adicionar e acelerar sua quitação!</p>
      </div>
    `;
    return;
  }

  let html = '';
  appState.plans.forEach((p, idx) => {
    let badgeClass = 'plan-badge-term';
    let badgeLabel = 'PRAZO';
    let desc = '';
    let extraBadgesHtml = '';

    if (p.type === 'amortization') {
      const isRecurr = p.frequency > 0;
      badgeClass = isRecurr ? 'plan-badge-term' : 'plan-badge-installment';
      badgeLabel = isRecurr ? 'RECORRENTE' : 'PONTUAL';
      const freqText = isRecurr ? `a cada ${p.frequency} mês até parcela <b>${p.lastPayment}</b>` : '';
      const targetLabel = p.subType === 'installment' ? '(reduz parcela)' : '(reduz prazo)';
      desc = `Amortizando <span class="plan-val">${fmt.currency(p.value)}</span> por prazo a partir da parcela <b>${p.firstPayment}</b> ${freqText}`;

      const overlaps = getOverlappingPlansForPlan(p, idx);
      if (overlaps.length > 0) {
        const sharedParcels = overlaps.map(o => `mês ${o.parcel}`).join(', ');
        extraBadgesHtml += `<span class="plan-badge" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;" title="Soma com outra amortização no mesmo mês">⚡ Acumula no ${sharedParcels}</span>`;
      }
    } else if (p.type === 'fee') {
      badgeClass = 'plan-badge-fee';
      badgeLabel = 'TAXA / SEGURO';
      desc = `Taxa mensal de <span class="plan-val">${fmt.currency(p.value)}</span> da parcela <b>${p.firstPayment}</b> até <b>${p.lastPayment}</b>`;
    } else if (p.type === 'correction') {
      badgeClass = 'plan-badge-correction';
      badgeLabel = 'CORREÇÃO';
      const freqText = p.frequency > 1 ? `a cada ${p.frequency} meses` : 'mensal';
      desc = `Correção de <span class="plan-val">${fmt.percent(p.value)}</span> (${freqText}) da parcela <b>${p.firstPayment}</b> até <b>${p.lastPayment}</b>`;
    }

    html += `
      <div class="plan-item" data-plan-id="${p.id || idx}">
        <div class="plan-desc">
          <span class="plan-badge ${badgeClass}">${badgeLabel}</span>
          ${extraBadgesHtml}
          <span>${desc}</span>
        </div>
        <div class="plan-item-actions">
          <button class="btn btn-icon btn-ghost" onclick="editPlan(${idx})" title="Editar plano">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-icon btn-danger-ghost" onclick="deletePlan(${idx})" title="Excluir plano">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.deletePlan = function(index) {
  appState.plans.splice(index, 1);
  saveCurrentStateToStorage();
  renderPlansList();
  fetchSimulationData();
};

window.editPlan = function(index) {
  const p = appState.plans[index];
  if (!p) return;
  editingPlanIndex = index;

  if (p.type === 'amortization') {
    openAmortizationModal(p);
  } else if (p.type === 'fee') {
    openFeeModal(p);
  } else if (p.type === 'correction') {
    openCorrectionModal(p);
  }
};

window.clearAllPlans = function() {
  if (confirm('Deseja realmente remover todos os planos de amortização e encargos?')) {
    appState.plans = [];
    saveCurrentStateToStorage();
    renderPlansList();
    fetchSimulationData();
  }
};

window.restoreDefaultScenario = async function() {
  if (confirm('Deseja restaurar o cenário padrão global do simulador?')) {
    try {
      const res = await fetch('./default-scenario.json?v=' + Date.now(), { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.loanAmount === 'number') {
          Object.assign(DEFAULT_USER_SCENARIO, data);
          if (data.updatedAt) {
            localStorage.setItem('simulador_applied_default_ts', data.updatedAt);
          }
        }
      }
    } catch (e) {}

    appState.plans = JSON.parse(JSON.stringify(DEFAULT_USER_SCENARIO.plans));
    appState.loanAmount = DEFAULT_USER_SCENARIO.loanAmount;
    appState.interestRate = DEFAULT_USER_SCENARIO.interestRate;
    appState.interestRateType = DEFAULT_USER_SCENARIO.interestRateType ?? 0;
    appState.numberOfInstallments = DEFAULT_USER_SCENARIO.numberOfInstallments;
    appState.date = DEFAULT_USER_SCENARIO.date;
    appState.amortizationSystemType = DEFAULT_USER_SCENARIO.amortizationSystemType ?? 0;
    appState.name = DEFAULT_USER_SCENARIO.name || 'Cenário Padrão';
    saveCurrentStateToStorage();
    syncFormInputsFromState();
    renderPlansList();
    fetchSimulationData();
    showToast('Cenário padrão global restaurado!', 'success');
  }
};

// Results Rendering
function renderResults() {
  if (!appState.result) return;
  const standard = appState.result.summaryResult;
  const withAmort = appState.result.summaryWithAmortizationResult || standard;

  // Hero Achievement Banner
  const heroEl = document.getElementById('achievementHero');
  if (heroEl && standard && withAmort) {
    const savedMoney = Math.max(0, standard.totalAmountPayable - withAmort.totalAmountPayable);
    const reducedInstallments = Math.max(0, standard.numberOfInstallments - withAmort.numberOfInstallments);
    const finalDate = appState.result.simulationWithAmortizationTable?.[appState.result.simulationWithAmortizationTable.length - 1]?.date;
    const finalDateText = fmt.dateISOToMonthYear(finalDate);

    const progressPct = Math.min(100, Math.round((reducedInstallments / standard.numberOfInstallments) * 100));

    heroEl.innerHTML = `
      <div class="achievement-content">
        <div class="achievement-top">
          <div class="achievement-title-area">
            <div class="achievement-icon">🏆</div>
            <div>
              <div class="achievement-headline">Quitação em ${finalDateText}!</div>
              <div class="achievement-sub">Com sua estratégia de amortização antecipada, você reduziu anos de dívida!</div>
            </div>
          </div>
        </div>

        <div class="achievement-stats-row">
          <div class="stat-pill">
            <div class="stat-pill-label">Economia Total em Juros e Custos</div>
            <div class="stat-pill-val green">${fmt.currency(savedMoney)}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-pill-label">Parcelas Eliminadas</div>
            <div class="stat-pill-val">${reducedInstallments} parcelas (${fmt.number(reducedInstallments / 12, 1)} anos a menos)</div>
          </div>
          <div class="stat-pill">
            <div class="stat-pill-label">Total Pago no Financiamento</div>
            <div class="stat-pill-val">${fmt.currency(withAmort.totalAmountPayable)}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-pill-label">Prazo Final Real</div>
            <div class="stat-pill-val">${withAmort.numberOfInstallments} meses (${fmt.number(withAmort.numberOfInstallments / 12, 1)} anos)</div>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-labels">
            <span>Tempo Eliminado: ${progressPct}% do contrato cortado!</span>
            <span>${withAmort.numberOfInstallments} de ${standard.numberOfInstallments} parcelas originais</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
          </div>
        </div>
      </div>
    `;
    heroEl.style.display = 'block';
  }

  // Side-by-Side Comparison Cards
  const comparisonEl = document.getElementById('comparisonContainer');
  if (comparisonEl && standard && withAmort) {
    const interestSaved = Math.max(0, standard.totalInterestAmount - withAmort.totalInterestAmount);

    comparisonEl.innerHTML = `
      <!-- Sem Antecipação -->
      <div class="compare-card">
        <div class="compare-header standard">
          <div class="compare-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Sem Antecipação de Pagamento
          </div>
        </div>
        <div class="compare-body">
          <div class="compare-row"><span class="lbl">Valor Financiado:</span><span class="val">${fmt.currency(standard.loanAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Total de Juros:</span><span class="val">${fmt.currency(standard.totalInterestAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Total em Taxas / Seguros:</span><span class="val">${fmt.currency(standard.totalFees)}</span></div>
          <div class="compare-row"><span class="lbl">Correção Monetária:</span><span class="val">${fmt.currency(standard.totalCorrectionValue)}</span></div>
          <div class="compare-row"><span class="lbl">Amortização Extra:</span><span class="val">R$ 0,00</span></div>
          <div class="compare-row"><span class="lbl">Valor da 1ª Parcela:</span><span class="val">${fmt.currency(standard.firstInstallmentAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Valor da Última Parcela:</span><span class="val">${fmt.currency(standard.finalInstallmentAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Prazo Contratado:</span><span class="val">${standard.numberOfInstallments} parcelas (${Math.round(standard.numberOfInstallments / 12)} anos)</span></div>
          <div class="compare-row total"><span class="lbl">Total a Ser Pago:</span><span class="val">${fmt.currency(standard.totalAmountPayable)}</span></div>
        </div>
      </div>

      <!-- Com Antecipação -->
      <div class="compare-card featured">
        <div class="compare-header accelerated">
          <div class="compare-title" style="color: var(--success-700);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            Com Antecipação & Amortizações
          </div>
          <span class="api-badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success-700);">Recomendado</span>
        </div>
        <div class="compare-body">
          <div class="compare-row"><span class="lbl">Valor Financiado:</span><span class="val">${fmt.currency(withAmort.loanAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Total de Juros:</span><span class="val" style="color: var(--success-600); font-weight: 700;">${fmt.currency(withAmort.totalInterestAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Total em Taxas / Seguros:</span><span class="val">${fmt.currency(withAmort.totalFees)}</span></div>
          <div class="compare-row"><span class="lbl">Correção Monetária:</span><span class="val">${fmt.currency(withAmort.totalCorrectionValue)}</span></div>
          <div class="compare-row"><span class="lbl">Amortizações Extras:</span><span class="val">${fmt.currency(withAmort.totalAmortization)}</span></div>
          <div class="compare-row"><span class="lbl">Valor da 1ª Parcela:</span><span class="val">${fmt.currency(withAmort.firstInstallmentAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Valor da Última Parcela:</span><span class="val">${fmt.currency(withAmort.finalInstallmentAmount)}</span></div>
          <div class="compare-row"><span class="lbl">Prazo Real de Quitação:</span><span class="val" style="color: var(--success-600); font-weight: 700;">${withAmort.numberOfInstallments} parcelas (${fmt.number(withAmort.numberOfInstallments / 12, 1)} anos)</span></div>
          <div class="compare-row total"><span class="lbl">Total a Ser Pago:</span><span class="val">${fmt.currency(withAmort.totalAmountPayable)}</span></div>
        </div>
      </div>
    `;
  }

  // Render Charts
  renderSvgCharts();

  // Render Table
  renderDetailedTable();
}

// Lightweight Zero-Dependency SVG Charts
function renderSvgCharts() {
  if (!appState.result) return;
  const standardTable = appState.result.simulationTable || [];
  const amortTable = appState.result.simulationWithAmortizationTable || standardTable;

  // Chart 1: Curva do Saldo Devedor
  const balanceContainer = document.getElementById('balanceChartContainer');
  if (balanceContainer) {
    const width = 600;
    const height = 230;
    const padding = { top: 20, right: 30, bottom: 35, left: 65 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxInstallments = Math.max(standardTable.length, 1);
    const maxBalance = Math.max(appState.loanAmount, standardTable[0]?.outstandingBalance || 0);

    function getPoints(table) {
      return table.map(row => {
        const x = padding.left + (row.installment / maxInstallments) * chartW;
        const y = padding.top + chartH - (row.outstandingBalance / maxBalance) * chartH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    }

    const pointsStd = getPoints(standardTable);
    const pointsAmort = getPoints(amortTable);

    // Generate Y-axis gridlines
    let yGridHtml = '';
    for (let i = 0; i <= 4; i++) {
      const val = (maxBalance * i) / 4;
      const y = padding.top + chartH - (i / 4) * chartH;
      yGridHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="3,3" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${(val / 1000).toFixed(0)}k</text>
      `;
    }

    // Generate X-axis labels
    let xGridHtml = '';
    const xStep = Math.ceil(maxInstallments / 6);
    for (let k = 0; k <= maxInstallments; k += xStep) {
      const x = padding.left + (k / maxInstallments) * chartW;
      xGridHtml += `
        <text x="${x}" y="${height - 10}" fill="var(--text-muted)" font-size="10" text-anchor="middle">mês ${k}</text>
      `;
    }

    balanceContainer.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="balance-chart-svg">
        ${yGridHtml}
        ${xGridHtml}
        <!-- Standard curve -->
        <polyline points="${pointsStd}" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-dasharray="5,4" />
        <!-- Accelerated curve -->
        <polyline points="${pointsAmort}" fill="none" stroke="#10b981" stroke-width="3.5" />
      </svg>
    `;
  }

  // Chart 2: Composição Financeira Donut Chart
  const costContainer = document.getElementById('costChartContainer');
  if (costContainer) {
    const withAmort = appState.result.summaryWithAmortizationResult || appState.result.summaryResult;
    const principal = withAmort.loanAmount;
    const interest = withAmort.totalInterestAmount;
    const fees = withAmort.totalFees;
    const corr = withAmort.totalCorrectionValue;
    const total = principal + interest + fees + corr;

    const pInterest = ((interest / total) * 100).toFixed(1);
    const pPrincipal = ((principal / total) * 100).toFixed(1);
    const pFees = (((fees + corr) / total) * 100).toFixed(1);

    costContainer.innerHTML = `
      <div class="donut-content-layout">
        <div class="donut-visual-box">
          <svg viewBox="0 0 160 160" class="donut-svg">
            <circle cx="80" cy="80" r="55" fill="transparent" stroke="var(--border-color)" stroke-width="22" />
            <!-- Principal -->
            <circle cx="80" cy="80" r="55" fill="transparent" stroke="#2563eb" stroke-width="22"
              stroke-dasharray="${(pPrincipal * 3.45).toFixed(1)} 345" stroke-dashoffset="0" transform="rotate(-90 80 80)" />
            <!-- Juros -->
            <circle cx="80" cy="80" r="55" fill="transparent" stroke="#f59e0b" stroke-width="22"
              stroke-dasharray="${(pInterest * 3.45).toFixed(1)} 345" stroke-dashoffset="-${(pPrincipal * 3.45).toFixed(1)}" transform="rotate(-90 80 80)" />
            <!-- Taxas/Correcao -->
            <circle cx="80" cy="80" r="55" fill="transparent" stroke="#ec4899" stroke-width="22"
              stroke-dasharray="${(pFees * 3.45).toFixed(1)} 345" stroke-dashoffset="-${((Number(pPrincipal) + Number(pInterest)) * 3.45).toFixed(1)}" transform="rotate(-90 80 80)" />
          </svg>
          <div class="donut-center-badge">
            <span class="donut-center-label">Custo Total</span>
            <span class="donut-center-val">${fmt.currencyCompact(total)}</span>
          </div>
        </div>

        <div class="donut-legend-box">
          <div class="donut-legend-row">
            <div class="donut-legend-tag">
              <span class="donut-dot" style="background: #2563eb;"></span>
              <span class="donut-name">Imóvel Financiado</span>
            </div>
            <div class="donut-legend-values">
              <span class="donut-val"><b>${fmt.currency(principal)}</b></span>
              <span class="donut-pct">${pPrincipal}%</span>
            </div>
          </div>
          <div class="donut-legend-row">
            <div class="donut-legend-tag">
              <span class="donut-dot" style="background: #f59e0b;"></span>
              <span class="donut-name">Juros ao Banco</span>
            </div>
            <div class="donut-legend-values">
              <span class="donut-val"><b>${fmt.currency(interest)}</b></span>
              <span class="donut-pct">${pInterest}%</span>
            </div>
          </div>
          <div class="donut-legend-row">
            <div class="donut-legend-tag">
              <span class="donut-dot" style="background: #ec4899;"></span>
              <span class="donut-name">Taxas, Seguros & TR</span>
            </div>
            <div class="donut-legend-values">
              <span class="donut-val"><b>${fmt.currency(fees + corr)}</b></span>
              <span class="donut-pct">${pFees}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Detailed Table & Pagination
function renderDetailedTable() {
  if (!appState.result) return;
  const isWithAmort = appState.activeTableTab === 'withAmort';
  const sourceTable = isWithAmort
    ? (appState.result.simulationWithAmortizationTable || appState.result.simulationTable || [])
    : (appState.result.simulationTable || []);

  const tbody = document.getElementById('tableBody');
  const countEl = document.getElementById('tableTotalCount');
  const paginationControls = document.getElementById('paginationControls');
  if (!tbody) return;

  // Filter rows
  let filtered = sourceTable;
  if (appState.tableSearchTerm) {
    const term = appState.tableSearchTerm.trim().toLowerCase();
    filtered = sourceTable.filter(r => String(r.installment).includes(term) || fmt.dateISOToBR(r.date).includes(term));
  }

  if (countEl) countEl.textContent = `${filtered.length} parcelas registradas`;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / appState.tablePageSize));
  if (appState.tablePage > totalPages) appState.tablePage = totalPages;
  const startIndex = (appState.tablePage - 1) * appState.tablePageSize;
  const pageRows = filtered.slice(startIndex, startIndex + appState.tablePageSize);

  let html = '';
  pageRows.forEach(row => {
    const hasExtra = row.amortization > 0;
    let extraCellHtml = '-';
    if (hasExtra) {
      const plans = getPlansForInstallment(row.installment);
      if (plans.length > 1) {
        const parts = plans.map(p => `${fmt.currency(p.value)} (${p.frequency > 0 ? 'recorrente' : 'pontual'})`).join(' + ');
        extraCellHtml = `
          <div style="font-weight: 700; color: var(--success-600);">${fmt.currency(row.amortization)}</div>
          <div style="font-size: 0.72rem; color: var(--success-700); font-weight: 600; margin-top: 2px;" title="${parts}">
            ⚡ ${parts}
          </div>
        `;
      } else {
        const p = plans[0];
        const tag = p ? (p.frequency > 0 ? 'recorrente' : 'pontual') : '';
        extraCellHtml = `
          <div style="font-weight: 700; color: var(--success-600);">${fmt.currency(row.amortization)}</div>
          ${tag ? `<div style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">${tag}</div>` : ''}
        `;
      }
    }

    html += `
      <tr class="${hasExtra ? 'has-extra-amort' : ''}">
        <td><b>${row.installment}</b></td>
        <td>${fmt.dateISOToBR(row.date)}</td>
        <td>${fmt.currency(row.installmentAmountWithFee)}</td>
        <td>${fmt.currency(row.monthlyAmortization)}</td>
        <td>${fmt.currency(row.interestAmount)}</td>
        <td>${fmt.currency(row.fee)}</td>
        <td>${fmt.currency(row.monetaryCorrectionValue)}</td>
        <td class="extra-val">${extraCellHtml}</td>
        <td><b>${fmt.currency(row.outstandingBalance)}</b></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Pagination buttons
  if (paginationControls) {
    paginationControls.innerHTML = `
      <button class="btn btn-sm btn-secondary" ${appState.tablePage <= 1 ? 'disabled' : ''} onclick="changePage(1)">&laquo;</button>
      <button class="btn btn-sm btn-secondary" ${appState.tablePage <= 1 ? 'disabled' : ''} onclick="changePage(${appState.tablePage - 1})">&lsaquo;</button>
      <span style="font-weight: 600; padding: 0 0.5rem;">Página ${appState.tablePage} de ${totalPages}</span>
      <button class="btn btn-sm btn-secondary" ${appState.tablePage >= totalPages ? 'disabled' : ''} onclick="changePage(${appState.tablePage + 1})">&rsaquo;</button>
      <button class="btn btn-sm btn-secondary" ${appState.tablePage >= totalPages ? 'disabled' : ''} onclick="changePage(${totalPages})">&raquo;</button>
    `;
  }
}

window.changePage = function(p) {
  appState.tablePage = p;
  renderDetailedTable();
};

window.switchTableTab = function(tabName) {
  appState.activeTableTab = tabName;
  appState.tablePage = 1;
  const tabWith = document.getElementById('tabWithAmort');
  const tabWithout = document.getElementById('tabWithoutAmort');
  if (tabWith) tabWith.className = `tab-btn ${tabName === 'withAmort' ? 'active' : ''}`;
  if (tabWithout) tabWithout.className = `tab-btn ${tabName === 'withoutAmort' ? 'active' : ''}`;
  renderDetailedTable();
};

window.onTableSearchInput = function(e) {
  appState.tableSearchTerm = e.target.value;
  appState.tablePage = 1;
  renderDetailedTable();
};

// CSV Export
window.exportTableToCSV = function() {
  if (!appState.result) return;
  const isWithAmort = appState.activeTableTab === 'withAmort';
  const table = isWithAmort ? appState.result.simulationWithAmortizationTable : appState.result.simulationTable;
  if (!table || table.length === 0) return;

  const headers = ['Parcela', 'Data', 'Prestação (R$)', 'Amortização Ordinária (R$)', 'Juros (R$)', 'Taxa/Seguro (R$)', 'Correção (R$)', 'Amortização Extra (R$)', 'Saldo Devedor (R$)'];
  const rows = table.map(r => [
    r.installment,
    fmt.dateISOToBR(r.date),
    r.installmentAmountWithFee.toFixed(2),
    r.monthlyAmortization.toFixed(2),
    r.interestAmount.toFixed(2),
    r.fee.toFixed(2),
    r.monetaryCorrectionValue.toFixed(2),
    (r.amortization || 0).toFixed(2),
    r.outstandingBalance.toFixed(2)
  ]);

  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `simulacao_amortizacao_${isWithAmort ? 'com_antecipacao' : 'padrao'}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Planilha CSV gerada para download!', 'success');
};

// Print
window.printReport = function() {
  window.print();
};

// Modal Logic
let editingPlanIndex = null;

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
  editingPlanIndex = null;
}

window.closeModal = closeModal;

// Modal 1: Amortização Extra
window.openAmortizationModal = function(existingPlan = null) {
  editingPlanIndex = existingPlan ? appState.plans.indexOf(existingPlan) : null;
  const modal = document.getElementById('modalAmortization');
  if (!modal) return;

  const isTermRadio = document.getElementById('modalAmortTypeTerm');
  const isInstRadio = document.getElementById('modalAmortTypeInst');
  const valInput = document.getElementById('modalAmortValue');
  const startInput = document.getElementById('modalAmortFirstPayment');
  const isRecurringCheck = document.getElementById('modalAmortIsRecurring');
  const recurrBlock = document.getElementById('modalAmortRecurrBlock');
  const endInput = document.getElementById('modalAmortLastPayment');
  const freqInput = document.getElementById('modalAmortFreq');

  if (existingPlan) {
    if (existingPlan.subType === 'installment') {
      isInstRadio.checked = true;
      selectRadioCard('modalAmortTypeInst');
    } else {
      isTermRadio.checked = true;
      selectRadioCard('modalAmortTypeTerm');
    }
    valInput.value = fmt.currency(existingPlan.value);
    startInput.value = existingPlan.firstPayment;
    const isRecurr = existingPlan.frequency > 0;
    isRecurringCheck.checked = isRecurr;
    recurrBlock.style.display = isRecurr ? 'grid' : 'none';
    endInput.value = existingPlan.lastPayment || appState.numberOfInstallments;
    freqInput.value = existingPlan.frequency > 0 ? existingPlan.frequency : 1;
  } else {
    isTermRadio.checked = true;
    selectRadioCard('modalAmortTypeTerm');
    valInput.value = 'R$ 2.800,00';
    startInput.value = '1';
    isRecurringCheck.checked = false;
    recurrBlock.style.display = 'none';
    endInput.value = appState.numberOfInstallments;
    freqInput.value = '1';
  }

  modal.classList.add('active');
};

window.saveAmortizationModal = function() {
  const isTerm = document.getElementById('modalAmortTypeTerm').checked;
  const val = fmt.parseCurrency(document.getElementById('modalAmortValue').value);
  const firstPayment = parseInt(document.getElementById('modalAmortFirstPayment').value, 10) || 0;
  const isRecurring = document.getElementById('modalAmortIsRecurring').checked;
  const lastPayment = isRecurring ? (parseInt(document.getElementById('modalAmortLastPayment').value, 10) || appState.numberOfInstallments) : firstPayment;
  const frequency = isRecurring ? (parseInt(document.getElementById('modalAmortFreq').value, 10) || 1) : -1;

  if (val <= 0) {
    alert('Por favor informe um valor válido para amortização.');
    return;
  }

  const planObj = {
    id: `plan_${Date.now()}`,
    type: 'amortization',
    subType: isTerm ? 'term' : 'installment',
    name: 'Amortização Extra',
    value: val,
    firstPayment,
    lastPayment,
    frequency
  };

  if (editingPlanIndex !== null && editingPlanIndex >= 0) {
    appState.plans[editingPlanIndex] = planObj;
  } else {
    appState.plans.push(planObj);
  }

  closeModal('modalAmortization');
  saveCurrentStateToStorage();
  renderPlansList();
  fetchSimulationData();
};

// Modal 2: Taxa / Seguro
window.openFeeModal = function(existingPlan = null) {
  editingPlanIndex = existingPlan ? appState.plans.indexOf(existingPlan) : null;
  const modal = document.getElementById('modalFee');
  if (!modal) return;

  const valInput = document.getElementById('modalFeeValue');
  const startInput = document.getElementById('modalFeeFirstPayment');
  const endInput = document.getElementById('modalFeeLastPayment');

  if (existingPlan) {
    valInput.value = fmt.currency(existingPlan.value);
    startInput.value = existingPlan.firstPayment;
    endInput.value = existingPlan.lastPayment;
  } else {
    valInput.value = 'R$ 40,00';
    startInput.value = '0';
    endInput.value = appState.numberOfInstallments;
  }

  modal.classList.add('active');
};

window.saveFeeModal = function() {
  const val = fmt.parseCurrency(document.getElementById('modalFeeValue').value);
  const firstPayment = parseInt(document.getElementById('modalFeeFirstPayment').value, 10) || 0;
  const lastPayment = parseInt(document.getElementById('modalFeeLastPayment').value, 10) || appState.numberOfInstallments;

  const planObj = {
    id: `fee_${Date.now()}`,
    type: 'fee',
    name: 'Taxa / Seguro Mensal',
    value: val,
    firstPayment,
    lastPayment,
    frequency: 1
  };

  if (editingPlanIndex !== null && editingPlanIndex >= 0) {
    appState.plans[editingPlanIndex] = planObj;
  } else {
    appState.plans.push(planObj);
  }

  closeModal('modalFee');
  saveCurrentStateToStorage();
  renderPlansList();
  fetchSimulationData();
};

// Modal 3: Correção Monetária
window.openCorrectionModal = function(existingPlan = null) {
  editingPlanIndex = existingPlan ? appState.plans.indexOf(existingPlan) : null;
  const modal = document.getElementById('modalCorrection');
  if (!modal) return;

  const valInput = document.getElementById('modalCorrectionValue');
  const startInput = document.getElementById('modalCorrectionFirstPayment');
  const endInput = document.getElementById('modalCorrectionLastPayment');
  const freqInput = document.getElementById('modalCorrectionFreq');

  if (existingPlan) {
    valInput.value = String(existingPlan.value);
    startInput.value = existingPlan.firstPayment;
    endInput.value = existingPlan.lastPayment;
    freqInput.value = existingPlan.frequency || 1;
  } else {
    valInput.value = '0.17';
    startInput.value = '0';
    endInput.value = appState.numberOfInstallments;
    freqInput.value = '1';
  }

  modal.classList.add('active');
};

window.saveCorrectionModal = function() {
  const val = parseFloat(document.getElementById('modalCorrectionValue').value.replace(',', '.')) || 0;
  const firstPayment = parseInt(document.getElementById('modalCorrectionFirstPayment').value, 10) || 0;
  const lastPayment = parseInt(document.getElementById('modalCorrectionLastPayment').value, 10) || appState.numberOfInstallments;
  const frequency = parseInt(document.getElementById('modalCorrectionFreq').value, 10) || 1;

  const planObj = {
    id: `corr_${Date.now()}`,
    type: 'correction',
    name: 'Correção Monetária (TR/IPCA)',
    value: val,
    firstPayment,
    lastPayment,
    frequency
  };

  if (editingPlanIndex !== null && editingPlanIndex >= 0) {
    appState.plans[editingPlanIndex] = planObj;
  } else {
    appState.plans.push(planObj);
  }

  closeModal('modalCorrection');
  saveCurrentStateToStorage();
  renderPlansList();
  fetchSimulationData();
};

// Helper for Radio Cards
window.selectRadioCard = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.checked = true;
  const parent = input.closest('.radio-cards-row');
  if (parent) {
    parent.querySelectorAll('.radio-card-label').forEach(lbl => lbl.classList.remove('selected'));
    input.closest('.radio-card-label').classList.add('selected');
  }
};

// Modal 4: Cenários Salvos (Multi-Scenario Manager)
window.openScenariosModal = function() {
  const modal = document.getElementById('modalScenarios');
  if (!modal) return;
  renderScenariosList();
  modal.classList.add('active');
};

function renderScenariosList() {
  const container = document.getElementById('scenariosListContainer');
  if (!container) return;
  const scenarios = getSavedScenarios();
  const keys = Object.keys(scenarios);

  if (keys.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum cenário salvo ainda.</p>`;
    return;
  }

  let html = '';
  keys.forEach(k => {
    const sc = scenarios[k];
    const isCurrent = appState.name === k;
    html += `
      <div class="scenario-item">
        <div>
          <div class="scenario-name">${sc.name || k} ${isCurrent ? '<span class="api-badge" style="font-size: 0.7rem;">Atual</span>' : ''}</div>
          <div class="scenario-meta">
            ${fmt.currency(sc.loanAmount)} • ${sc.amortizationSystemType === 0 ? 'SAC' : 'Price'} • ${sc.plans?.length || 0} planos
          </div>
        </div>
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-sm btn-primary" onclick="loadScenario('${encodeURIComponent(k)}')">Carregar</button>
          <button class="btn btn-sm btn-danger-ghost" onclick="deleteScenario('${encodeURIComponent(k)}')" title="Excluir cenário">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.saveNewScenarioPrompt = function() {
  const name = prompt('Informe um nome para o cenário:', appState.name || 'Meu Cenário');
  if (!name) return;
  saveScenarioToStorage(name, {
    name,
    loanAmount: appState.loanAmount,
    date: appState.date,
    amortizationSystemType: appState.amortizationSystemType,
    interestRate: appState.interestRate,
    interestRateType: appState.interestRateType,
    numberOfInstallments: appState.numberOfInstallments,
    plans: appState.plans
  });
  appState.name = name;
  saveCurrentStateToStorage();
  renderScenariosList();
  showToast(`Cenário "${name}" salvo!`, 'success');
};

window.loadScenario = function(encodedKey) {
  const key = decodeURIComponent(encodedKey);
  const scenarios = getSavedScenarios();
  const sc = scenarios[key];
  if (!sc) return;

  appState = {
    ...appState,
    ...sc,
    name: key
  };

  saveCurrentStateToStorage();
  syncFormInputsFromState();
  renderPlansList();
  closeModal('modalScenarios');
  fetchSimulationData();
  showToast(`Cenário "${key}" carregado!`, 'success');
};

window.deleteScenario = function(encodedKey) {
  const key = decodeURIComponent(encodedKey);
  if (confirm(`Deseja excluir o cenário "${key}"?`)) {
    deleteScenarioFromStorage(key);
    renderScenariosList();
  }
};

window.exportBackupJson = function() {
  const scenarios = getSavedScenarios();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scenarios, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `backup_cenarios_amortizacao_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
};

window.importBackupJson = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported === 'object') {
        const current = getSavedScenarios();
        const merged = { ...current, ...imported };
        localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(merged));
        renderScenariosList();
        showToast('Cenários importados com sucesso!', 'success');
      }
    } catch (err) {
      alert('Arquivo JSON inválido.');
    }
  };
  reader.readAsText(file);
};

window.downloadDefaultScenarioJson = function() {
  const toExport = {
    name: appState.name || 'Financiamento Padrão',
    version: '2.0',
    updatedAt: new Date().toISOString(),
    loanAmount: appState.loanAmount,
    date: appState.date,
    amortizationSystemType: appState.amortizationSystemType,
    interestRate: appState.interestRate,
    interestRateType: appState.interestRateType,
    numberOfInstallments: appState.numberOfInstallments,
    plans: appState.plans
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(toExport, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', 'default-scenario.json');
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('Arquivo default-scenario.json baixado!', 'success');
};

window.importAndSetAsGlobalDefault = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let imported = JSON.parse(e.target.result);
      if (!imported.loanAmount && typeof imported === 'object') {
        const firstKey = Object.keys(imported)[0];
        if (firstKey && imported[firstKey]?.loanAmount) {
          imported = imported[firstKey];
        }
      }
      if (typeof imported.loanAmount !== 'number' || !Array.isArray(imported.plans)) {
        alert('O arquivo selecionado não contém uma estrutura válida de financiamento (requer loanAmount e lista de plans).');
        return;
      }

      imported.updatedAt = new Date().toISOString();

      // Update appState
      appState = {
        ...appState,
        ...imported,
        name: imported.name || 'Cenário Padrão'
      };

      // Update DEFAULT_USER_SCENARIO in memory
      Object.assign(DEFAULT_USER_SCENARIO, imported);

      // Save to localStorage
      saveCurrentStateToStorage();
      localStorage.setItem('simulador_applied_default_ts', imported.updatedAt);
      syncFormInputsFromState();
      renderPlansList();
      fetchSimulationData();
      closeModal('modalScenarios');

      // Trigger download of default-scenario.json with this data
      downloadDefaultScenarioJson();

      alert(
        '✅ Cenário importado com sucesso!\n\n' +
        'O arquivo "default-scenario.json" foi baixado para o seu computador.\n\n' +
        '📌 Para torná-lo o padrão de TODOS os visitantes no Cloudflare Pages:\n' +
        '1. Salve este arquivo "default-scenario.json" na pasta do projeto.\n' +
        '2. Envie para o GitHub executando:\n' +
        '   git add default-scenario.json\n' +
        '   git commit -m "chore: atualizar cenario padrao global"\n' +
        '   git push\n\n' +
        'O Cloudflare Pages atualizará automaticamente o padrão para todos os acessos do mundo!'
      );
    } catch (err) {
      alert('Erro ao importar JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
};

// Dark / Light Theme
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEYS.THEME, next);
  updateThemeIcon(next);
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('btnThemeToggle');
  if (!btn) return;
  if (theme === 'dark') {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  } else {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }
}

// Main Tabs Switcher
window.switchMainTab = function(tabName) {
  appState.activeMainTab = tabName;
  localStorage.setItem('simulador_active_main_tab', tabName);
  updateMainTabsView();
};

function updateMainTabsView() {
  const tabName = appState.activeMainTab || 'nextActions';

  const tabButtons = {
    nextActions: document.getElementById('tabBtnNextActions'),
    overview: document.getElementById('tabBtnOverview'),
    inputs: document.getElementById('tabBtnInputs'),
    table: document.getElementById('tabBtnTable'),
    all: document.getElementById('tabBtnAll')
  };

  Object.entries(tabButtons).forEach(([key, btn]) => {
    if (btn) btn.classList.toggle('active', key === tabName);
  });

  const pNext = document.getElementById('panelNextActions');
  const sHero = document.getElementById('achievementHero') || document.getElementById('sectionHeroStats');
  const sComp = document.getElementById('comparisonContainer') || document.getElementById('sectionComparisonCards');
  const sCharts = document.getElementById('sectionCharts') || document.querySelector('.charts-grid');
  const sInputs = document.getElementById('sectionInputs');
  const sPlans = document.getElementById('sectionPlans');
  const sTable = document.getElementById('sectionTable');
  const sEdu = document.getElementById('sectionEducation') || document.getElementById('sectionEducational');

  function setVisible(el, isVisible) {
    if (el) el.style.display = isVisible ? '' : 'none';
  }

  if (tabName === 'nextActions') {
    setVisible(pNext, true);
    setVisible(sHero, false);
    setVisible(sComp, false);
    setVisible(sCharts, false);
    setVisible(sInputs, false);
    setVisible(sPlans, false);
    setVisible(sTable, false);
    setVisible(sEdu, false);
    renderNextActions();
  } else if (tabName === 'overview') {
    setVisible(pNext, false);
    setVisible(sHero, true);
    setVisible(sComp, true);
    setVisible(sCharts, true);
    setVisible(sInputs, false);
    setVisible(sPlans, false);
    setVisible(sTable, false);
    setVisible(sEdu, false);
    renderResults();
  } else if (tabName === 'inputs') {
    setVisible(pNext, false);
    setVisible(sHero, false);
    setVisible(sComp, false);
    setVisible(sCharts, false);
    setVisible(sInputs, true);
    setVisible(sPlans, true);
    setVisible(sTable, false);
    setVisible(sEdu, false);
  } else if (tabName === 'table') {
    setVisible(pNext, false);
    setVisible(sHero, false);
    setVisible(sComp, false);
    setVisible(sCharts, false);
    setVisible(sInputs, false);
    setVisible(sPlans, false);
    setVisible(sTable, true);
    setVisible(sEdu, false);
    renderDetailedTable();
  } else if (tabName === 'all') {
    setVisible(pNext, true);
    setVisible(sInputs, true);
    setVisible(sPlans, true);
    setVisible(sHero, true);
    setVisible(sComp, true);
    setVisible(sCharts, true);
    setVisible(sTable, true);
    setVisible(sEdu, true);
    renderNextActions();
    renderResults();
  }
}

window.setNextActionsHorizon = function(months) {
  appState.nextActionsHorizon = months;
  [3, 6, 12].forEach(m => {
    const btn = document.getElementById('btnHorizon' + m);
    if (btn) btn.classList.toggle('active', m === months);
  });
  renderNextActions();
};

function renderNextActions() {
  if (!appState.result) return;
  const amortTable = appState.result.simulationWithAmortizationTable || appState.result.simulationTable || [];
  const standardTable = appState.result.simulationTable || [];
  if (amortTable.length === 0) return;

  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayISO = today.toISOString().substring(0, 10);
  const todayFormatted = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const dateEl = document.getElementById('nextActionsTodayDate');
  if (dateEl) dateEl.textContent = todayFormatted;

  // Find index for current month
  let currIdx = amortTable.findIndex(r => r.date && r.date.substring(0, 7) === currentYM);
  if (currIdx === -1) {
    currIdx = amortTable.findIndex(r => r.date && r.date >= todayISO);
    if (currIdx > 0) currIdx--;
  }
  if (currIdx < 0) currIdx = 0;

  const currRow = amortTable[currIdx] || amortTable[0];
  const nextRow = amortTable[currIdx + 1] || currRow;

  // Status Card
  const statusCard = document.getElementById('nextActionsStatusCard');
  if (statusCard) {
    const remainingInstallments = Math.max(0, amortTable.length - 1 - currRow.installment);
    const originalRemaining = Math.max(0, (standardTable.length - 1) - currRow.installment);
    const monthsEliminated = Math.max(0, originalRemaining - remainingInstallments);
    const yearsEliminated = (monthsEliminated / 12).toFixed(1);

    statusCard.innerHTML = `
      <div class="status-pill-item">
        <span class="status-pill-label">Saldo Devedor Hoje</span>
        <span class="status-pill-val">${fmt.currency(currRow.outstandingBalance)}</span>
      </div>
      <div class="status-pill-sep"></div>
      <div class="status-pill-item">
        <span class="status-pill-label">Parcela Atual</span>
        <span class="status-pill-val" style="color: var(--text-main);">#${currRow.installment} <small style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">de ${standardTable.length - 1}</small></span>
      </div>
      <div class="status-pill-sep"></div>
      <div class="status-pill-item">
        <span class="status-pill-label">Restam Com Amortização</span>
        <span class="status-pill-val" style="color: var(--success-600);">${remainingInstallments} meses <small style="font-size: 0.75rem; font-weight: 600;">(-${yearsEliminated} anos)</small></span>
      </div>
    `;
  }

  // Horizon Calculations helper
  function getHorizon(months) {
    const slice = amortTable.slice(currIdx + 1, currIdx + 1 + months);
    const extra = slice.reduce((acc, r) => acc + (r.amortization || 0), 0);
    const bank = slice.reduce((acc, r) => acc + (r.installmentAmountWithFee || r.installmentValue || 0), 0);
    const lastRow = slice[slice.length - 1] || currRow;
    return {
      months,
      count: slice.length,
      extra,
      bank,
      total: extra + bank,
      endBalance: lastRow.outstandingBalance
    };
  }

  const hNext = {
    date: nextRow.date ? fmt.dateISOToBR(nextRow.date) : '-',
    installmentNum: nextRow.installment,
    bank: nextRow.installmentAmountWithFee || nextRow.installmentValue || 0,
    extra: nextRow.amortization || 0,
    total: (nextRow.installmentAmountWithFee || nextRow.installmentValue || 0) + (nextRow.amortization || 0)
  };

  const h3 = getHorizon(3);
  const h6 = getHorizon(6);
  const h12 = getHorizon(12);

  // Metrics Grid
  const metricsGrid = document.getElementById('nextActionsMetricsGrid');
  if (metricsGrid) {
    const plansNext = getPlansForInstallment(nextRow.installment);
    const nextTag = plansNext.length > 1
      ? `⚡ R$ ${plansNext.map(p => fmt.number(p.value, 0)).join(' + ')}`
      : (plansNext[0]?.frequency > 0 ? 'Recorrente mensal' : 'Aporte planejado');

    metricsGrid.innerHTML = `
      <!-- Card 1: Próximo Mês Imediato -->
      <div class="metric-action-card highlight">
        <div class="metric-card-top">
          <span class="metric-card-title">Próximo Vencimento (#${hNext.installmentNum})</span>
          <span class="metric-horizon-badge">${hNext.date}</span>
        </div>
        <div class="metric-card-amount" style="color: var(--primary-600);">
          ${fmt.currency(hNext.total)}
        </div>
        <div class="metric-card-details">
          <div class="metric-detail-row">
            <span>Amortização Extra:</span>
            <b>${fmt.currency(hNext.extra)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Parcela do Banco:</span>
            <span>${fmt.currency(hNext.bank)}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--success-700); font-weight: 600; margin-top: 2px;">
            ${nextTag}
          </div>
        </div>
      </div>

      <!-- Card 2: Próximos 3 Meses -->
      <div class="metric-action-card">
        <div class="metric-card-top">
          <span class="metric-card-title">Próximos 3 Meses</span>
          <span class="metric-horizon-badge">3 meses</span>
        </div>
        <div class="metric-card-amount">
          ${fmt.currency(h3.extra)}
        </div>
        <div class="metric-card-details">
          <div class="metric-detail-row">
            <span>Total a Amortizar:</span>
            <b style="color: var(--success-600);">${fmt.currency(h3.extra)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Desembolso Total:</span>
            <b>${fmt.currency(h3.total)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Saldo ao final:</span>
            <span>${fmt.currency(h3.endBalance)}</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Próximos 6 Meses -->
      <div class="metric-action-card">
        <div class="metric-card-top">
          <span class="metric-card-title">Próximos 6 Meses</span>
          <span class="metric-horizon-badge">6 meses</span>
        </div>
        <div class="metric-card-amount">
          ${fmt.currency(h6.extra)}
        </div>
        <div class="metric-card-details">
          <div class="metric-detail-row">
            <span>Total a Amortizar:</span>
            <b style="color: var(--success-600);">${fmt.currency(h6.extra)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Desembolso Total:</span>
            <b>${fmt.currency(h6.total)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Saldo ao final:</span>
            <span>${fmt.currency(h6.endBalance)}</span>
          </div>
        </div>
      </div>

      <!-- Card 4: Próximos 12 Meses -->
      <div class="metric-action-card">
        <div class="metric-card-top">
          <span class="metric-card-title">Próximos 12 Meses</span>
          <span class="metric-horizon-badge">1 ano</span>
        </div>
        <div class="metric-card-amount">
          ${fmt.currency(h12.extra)}
        </div>
        <div class="metric-card-details">
          <div class="metric-detail-row">
            <span>Total a Amortizar:</span>
            <b style="color: var(--success-600);">${fmt.currency(h12.extra)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Desembolso Total:</span>
            <b>${fmt.currency(h12.total)}</b>
          </div>
          <div class="metric-detail-row">
            <span>Saldo ao final:</span>
            <span>${fmt.currency(h12.endBalance)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Special Punctual Alert
  const alertEl = document.getElementById('nextActionsSpecialAlert');
  if (alertEl) {
    const next12Slice = amortTable.slice(currIdx + 1, currIdx + 1 + 12);
    const specialRow = next12Slice.find(r => {
      const plans = getPlansForInstallment(r.installment);
      return plans.some(p => p.frequency <= 0) || (r.amortization || 0) > (hNext.extra * 1.5);
    });

    if (specialRow) {
      const plans = getPlansForInstallment(specialRow.installment);
      const punctual = plans.find(p => p.frequency <= 0);
      const extraDesc = punctual ? ` (incluindo aporte pontual de ${fmt.currency(punctual.value)})` : '';
      const dateStr = fmt.dateISOToMonthYear(specialRow.date);

      alertEl.style.display = 'flex';
      alertEl.className = 'special-alert-banner';
      alertEl.innerHTML = `
        <div class="special-alert-icon">⚡</div>
        <div class="special-alert-content">
          <div class="special-alert-title">Aporte Especial Programado em ${dateStr} (Parcela #${specialRow.installment})</div>
          <div class="special-alert-desc">
            Você planejou uma amortização reforçada de <b>${fmt.currency(specialRow.amortization)}</b>${extraDesc}.
            Nesse mês, o seu saldo devedor cairá para <b>${fmt.currency(specialRow.outstandingBalance)}</b>, acelerando fortemente o fim do financiamento!
          </div>
        </div>
      `;
    } else {
      alertEl.style.display = 'none';
    }
  }

  // Monthly Timeline Table
  const tableWrapper = document.getElementById('nextActionsTableWrapper');
  if (tableWrapper) {
    const horizon = appState.nextActionsHorizon || 6;
    const upcomingRows = amortTable.slice(currIdx, currIdx + 1 + horizon);

    let rowsHtml = '';
    upcomingRows.forEach((r, idx) => {
      const isCurrent = idx === 0;
      const isNext = idx === 1;
      const plans = getPlansForInstallment(r.installment);
      const hasSpecial = plans.some(p => p.frequency <= 0);

      let rowClass = '';
      let badgeHtml = '';
      if (isCurrent) {
        rowClass = 'row-current';
        badgeHtml = '<span class="badge-tag current">Mês Atual</span>';
      } else if (isNext) {
        rowClass = 'row-next';
        badgeHtml = '<span class="badge-tag next">Próxima</span>';
      } else if (hasSpecial) {
        rowClass = 'row-special';
        badgeHtml = '<span class="badge-tag special">⚡ Aporte Especial</span>';
      } else {
        badgeHtml = `<span class="badge-tag regular">Mês +${idx}</span>`;
      }

      const bankVal = r.installmentAmountWithFee || r.installmentValue || 0;
      const extraVal = r.amortization || 0;
      const totalDisbursement = bankVal + extraVal;

      let extraDesc = '-';
      if (extraVal > 0) {
        if (plans.length > 1) {
          const parts = plans.map(p => `${fmt.currency(p.value)} (${p.frequency > 0 ? 'recorrente' : 'pontual'})`).join(' + ');
          extraDesc = `
            <div style="font-weight: 700; color: var(--success-600);">${fmt.currency(extraVal)}</div>
            <div style="font-size: 0.72rem; color: var(--success-700); font-weight: 600;" title="${parts}">⚡ ${parts}</div>
          `;
        } else {
          const p = plans[0];
          const tag = p ? (p.frequency > 0 ? 'recorrente' : 'pontual') : '';
          extraDesc = `
            <div style="font-weight: 700; color: var(--success-600);">${fmt.currency(extraVal)}</div>
            ${tag ? `<div style="font-size: 0.7rem; color: var(--text-muted);">${tag}</div>` : ''}
          `;
        }
      }

      rowsHtml += `
        <tr class="${rowClass}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${badgeHtml}
              <b>#${r.installment}</b>
            </div>
          </td>
          <td>
            <b>${fmt.dateISOToBR(r.date)}</b>
          </td>
          <td>${fmt.currency(bankVal)}</td>
          <td>${extraDesc}</td>
          <td>
            <b style="color: var(--primary-600); font-size: 0.92rem;">${fmt.currency(totalDisbursement)}</b>
          </td>
          <td>
            <b>${fmt.currency(r.outstandingBalance)}</b>
          </td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">
            ${fmt.currency(r.interestAmount || r.interest || 0)}
          </td>
        </tr>
      `;
    });

    tableWrapper.innerHTML = `
      <table class="timeline-table">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Vencimento</th>
            <th>Parcela Banco</th>
            <th>Amortização Extra</th>
            <th>Desembolso Total</th>
            <th>Saldo Devedor Restante</th>
            <th>Juros do Mês</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }
}

// Master Render
function renderAll() {
  renderPlansList();
  renderResults();
  renderNextActions();
  updateMainTabsView();
}

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadStateAndGlobalDefault();
  syncFormInputsFromState();
  attachFormListeners();
  renderPlansList();
  updateMainTabsView();

  // Initial Calculation with stored data
  fetchSimulationData();
});
