/**
 * SIMULADOR DE AMORTIZAÇÃO - MÓDULO DE SINCRONIZAÇÃO EM NUVEM (CLOUDFLARE PAGES / KV)
 * Permite sincronizar automaticamente os lançamentos reais, extrato e cenários entre
 * múltiplos dispositivos (computador, celular, tablet) sem necessidade de servidores externos.
 */

const CLOUD_SYNC_KEYS = {
  PIN: 'amort_cloud_pin',
  AUTOSYNC: 'amort_cloud_autosync',
  LAST_SYNC: 'amort_cloud_last_sync_ts',
  LAST_REMOTE_TS: 'amort_cloud_last_remote_ts'
};

const cloudSync = {
  isSyncing: false,

  getPin() {
    return localStorage.getItem(CLOUD_SYNC_KEYS.PIN) || '';
  },

  setPin(pin) {
    if (!pin) {
      localStorage.removeItem(CLOUD_SYNC_KEYS.PIN);
    } else {
      localStorage.setItem(CLOUD_SYNC_KEYS.PIN, pin.trim());
    }
    this.updateStatusBadge();
  },

  isAutoSyncEnabled() {
    const val = localStorage.getItem(CLOUD_SYNC_KEYS.AUTOSYNC);
    return val === null ? true : val === 'true'; // Padrão: ativado
  },

  setAutoSync(enabled) {
    localStorage.setItem(CLOUD_SYNC_KEYS.AUTOSYNC, enabled ? 'true' : 'false');
  },

  getLastSyncDate() {
    return localStorage.getItem(CLOUD_SYNC_KEYS.LAST_SYNC) || null;
  },

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const pin = this.getPin();
    if (pin) {
      headers['x-sync-pin'] = pin;
    }
    return headers;
  },

  /**
   * Atualiza o indicador visual da nuvem no topo da página
   */
  updateStatusBadge(state = null, message = null) {
    const dot = document.getElementById('cloudSyncDot');
    const text = document.getElementById('cloudSyncStatusText');
    const btn = document.getElementById('btnCloudSync');
    const modalStatus = document.getElementById('cloudModalStatusText');
    const modalLastSync = document.getElementById('cloudModalLastSync');

    const pin = this.getPin();
    const lastSync = this.getLastSyncDate();

    let displayState = state;
    if (!displayState) {
      if (!pin) {
        displayState = 'unconfigured';
      } else if (lastSync) {
        displayState = 'synced';
      } else {
        displayState = 'ready';
      }
    }

    if (dot) {
      dot.className = 'sync-status-dot';
      if (displayState === 'synced') dot.classList.add('synced');
      else if (displayState === 'syncing') dot.classList.add('syncing');
      else if (displayState === 'error') dot.classList.add('error');
      else if (displayState === 'unconfigured') dot.classList.add('unconfigured');
      else dot.classList.add('ready');
    }

    if (text) {
      if (displayState === 'syncing') text.textContent = 'Sincronizando...';
      else if (displayState === 'synced') text.textContent = 'Nuvem Conectada';
      else if (displayState === 'error') text.textContent = 'Erro Nuvem';
      else if (displayState === 'unconfigured') text.textContent = 'Nuvem';
      else text.textContent = 'Nuvem';
    }

    if (modalStatus) {
      if (displayState === 'synced') {
        modalStatus.innerHTML = '<span class="badge-status-pill success">● Conectado e Sincronizado</span>';
      } else if (displayState === 'syncing') {
        modalStatus.innerHTML = '<span class="badge-status-pill warning">⏳ Sincronizando dados...</span>';
      } else if (displayState === 'error') {
        modalStatus.innerHTML = `<span class="badge-status-pill danger">⚠️ ${message || 'Erro de conexão'}</span>`;
      } else if (!pin) {
        modalStatus.innerHTML = '<span class="badge-status-pill muted">○ Não configurado (informe o PIN abaixo)</span>';
      } else {
        modalStatus.innerHTML = '<span class="badge-status-pill info">● Pronto para sincronizar</span>';
      }
    }

    if (modalLastSync) {
      if (lastSync) {
        try {
          const d = new Date(lastSync);
          modalLastSync.textContent = d.toLocaleString('pt-BR');
        } catch {
          modalLastSync.textContent = lastSync;
        }
      } else {
        modalLastSync.textContent = 'Nunca sincronizado';
      }
    }
  },

  /**
   * Baixa os dados da nuvem Cloudflare e atualiza o estado local
   */
  async pullFromCloud({ silent = false } = {}) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      const resp = await fetch('/api/sync', {
        method: 'GET',
        headers: this.getHeaders()
      });

      // Se a rota não existir (ex: rodando localmente sem wrangler pages)
      if (resp.status === 404) {
        this.isSyncing = false;
        this.updateStatusBadge('unconfigured');
        if (!silent) {
          window.showToast?.('Ambiente local detectado. A sincronização em nuvem funciona após o deploy no Cloudflare Pages.', 'info');
        }
        return false;
      }

      const res = await resp.json();

      if (!resp.ok || !res.success) {
        throw new Error(res.error || 'Falha ao buscar dados na nuvem.');
      }

      if (!res.data) {
        this.isSyncing = false;
        this.updateStatusBadge('ready');
        if (!silent) {
          window.showToast?.(res.message || 'Nenhum dado encontrado na nuvem.', 'info');
        }
        return false;
      }

      const remoteData = res.data;
      let updatedAnything = false;

      // 1. Atualizar Extrato Real e Transações
      if (remoteData.realLedger && Array.isArray(remoteData.realLedger.transactions)) {
        window.realLedgerState = remoteData.realLedger;
        localStorage.setItem('amort_real_ledger_v2', JSON.stringify(remoteData.realLedger));
        if (typeof window.recalculateRealLedger === 'function') window.recalculateRealLedger();
        if (typeof window.renderRealLedger === 'function') window.renderRealLedger();
        updatedAnything = true;
      }

      // 2. Atualizar Cenários Salvos e Excluídos
      if (Array.isArray(remoteData.deletedScenarios)) {
        try {
          const local = JSON.parse(localStorage.getItem('simulador_deleted_scenarios') || '[]');
          const merged = Array.from(new Set([...local, ...remoteData.deletedScenarios]));
          localStorage.setItem('simulador_deleted_scenarios', JSON.stringify(merged));
        } catch {}
      }

      if (remoteData.scenarios && typeof remoteData.scenarios === 'object') {
        localStorage.setItem('amort_scenarios_v3', JSON.stringify(remoteData.scenarios));
        localStorage.setItem('simulador_scenarios', JSON.stringify(remoteData.scenarios));
        if (typeof window.renderScenariosList === 'function') window.renderScenariosList();
        updatedAnything = true;
      }

      // 3. Atualizar Parâmetros e Estado da Simulação
      if (remoteData.appState && typeof remoteData.appState === 'object') {
        if (typeof window.appState === 'object') {
          Object.assign(window.appState, remoteData.appState);
          if (typeof window.saveCurrentStateToStorage === 'function') window.saveCurrentStateToStorage();
          if (typeof window.syncFormInputsFromState === 'function') window.syncFormInputsFromState();
          if (typeof window.fetchSimulationData === 'function') window.fetchSimulationData();
        }
        updatedAnything = true;
      }

      const now = new Date().toISOString();
      localStorage.setItem(CLOUD_SYNC_KEYS.LAST_SYNC, now);
      if (res.updatedAt) {
        localStorage.setItem(CLOUD_SYNC_KEYS.LAST_REMOTE_TS, res.updatedAt);
      }

      this.isSyncing = false;
      this.updateStatusBadge('synced');

      if (!silent) {
        window.showToast?.('Dados sincronizados da nuvem com sucesso!', 'success');
      }

      return true;

    } catch (err) {
      console.warn('Erro ao sincronizar da nuvem:', err);
      this.isSyncing = false;
      this.updateStatusBadge('error', err.message);
      if (!silent) {
        window.showToast?.(err.message, 'error');
      }
      return false;
    }
  },

  /**
   * Envia os dados atuais locais para a nuvem Cloudflare
   */
  async pushToCloud({ silent = false } = {}) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      // Coletar pacote completo de dados para sincronização
      const payload = {
        version: '1.0',
        realLedger: window.realLedgerState || null,
        scenarios: (() => {
          try {
            const raw = localStorage.getItem('amort_scenarios_v3') || localStorage.getItem('simulador_scenarios');
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })(),
        deletedScenarios: (() => {
          try {
            return JSON.parse(localStorage.getItem('simulador_deleted_scenarios') || '[]');
          } catch {
            return [];
          }
        })(),
        appState: (() => {
          if (typeof window.appState === 'object') {
            return {
              name: window.appState.name,
              loanAmount: window.appState.loanAmount,
              date: window.appState.date,
              amortizationSystemType: window.appState.amortizationSystemType,
              interestRate: window.appState.interestRate,
              interestRateType: window.appState.interestRateType,
              numberOfInstallments: window.appState.numberOfInstallments,
              plans: window.appState.plans
            };
          }
          return null;
        })()
      };

      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (resp.status === 404) {
        this.isSyncing = false;
        this.updateStatusBadge('unconfigured');
        if (!silent) {
          window.showToast?.('Ambiente local detectado. O envio em nuvem funcionará após o deploy no Cloudflare Pages.', 'info');
        }
        return false;
      }

      const res = await resp.json();

      if (!resp.ok || !res.success) {
        throw new Error(res.error || 'Falha ao salvar dados na nuvem.');
      }

      const now = new Date().toISOString();
      localStorage.setItem(CLOUD_SYNC_KEYS.LAST_SYNC, now);
      if (res.updatedAt) {
        localStorage.setItem(CLOUD_SYNC_KEYS.LAST_REMOTE_TS, res.updatedAt);
      }

      this.isSyncing = false;
      this.updateStatusBadge('synced');

      if (!silent) {
        window.showToast?.('Dados salvos na nuvem Cloudflare com sucesso!', 'success');
      }

      return true;

    } catch (err) {
      console.warn('Erro ao salvar na nuvem:', err);
      this.isSyncing = false;
      this.updateStatusBadge('error', err.message);
      if (!silent) {
        window.showToast?.(err.message, 'error');
      }
      return false;
    }
  },

  /**
   * Inicialização e verificação de sincronização no carregamento
   */
  async init() {
    this.updateStatusBadge();

    // Se tiver PIN configurado e auto-sync ativado, verifica em segundo plano se há dados novos na nuvem
    if (this.getPin() && this.isAutoSyncEnabled()) {
      setTimeout(() => {
        this.pullFromCloud({ silent: true });
      }, 1200);
    }
  }
};

// Funções para controle da Modal de Sincronização
window.openCloudSyncModal = function() {
  const pinInput = document.getElementById('cloudModalPin');
  const autoCb = document.getElementById('cloudModalAutoSync');

  if (pinInput) pinInput.value = cloudSync.getPin();
  if (autoCb) autoCb.checked = cloudSync.isAutoSyncEnabled();

  cloudSync.updateStatusBadge();

  const modal = document.getElementById('modalCloudSync');
  if (modal) modal.classList.add('active');
};

window.saveCloudSyncSettings = function() {
  const pinInput = document.getElementById('cloudModalPin');
  const autoCb = document.getElementById('cloudModalAutoSync');

  const pin = pinInput?.value || '';
  const autoSync = autoCb ? autoCb.checked : true;

  cloudSync.setPin(pin);
  cloudSync.setAutoSync(autoSync);

  window.showToast?.('Configurações de sincronização salvas!', 'success');
};

window.triggerManualCloudPush = async function() {
  window.saveCloudSyncSettings();
  await cloudSync.pushToCloud({ silent: false });
};

window.triggerManualCloudPull = async function() {
  window.saveCloudSyncSettings();
  await cloudSync.pullFromCloud({ silent: false });
};

// Expor globalmente
window.cloudSync = cloudSync;

// Iniciar quando o script carregar
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cloudSync.init());
  } else {
    cloudSync.init();
  }
}

