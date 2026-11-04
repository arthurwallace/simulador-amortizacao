/**
 * ==============================================================================
 * CALCULATION ENGINE - MOTOR DE CÁLCULO FINANCEIRO
 * ==============================================================================
 * Módulo puro, autônomo e modular para cálculos e simulações de financiamentos
 * imobiliários e empréstimos nos sistemas SAC e PRICE.
 *
 * Características:
 * • 100% Offline e livre de dependências de DOM, rede ou APIs externas.
 * • Alta fidelidade bancária comprovada contra Demonstrativo Descritivo de Crédito (DDC Itaú).
 * • Precisão matemática centesimal com suporte a juros pró-rata intra-mês compostos.
 * • Compatível com navegadores modernos (vanilla ES6) e ambientes Node.js (CommonJS).
 * ==============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Navegador (Global Window)
    const engine = factory();
    root.CalculationEngine = engine;
    root.runLocalSimulation = engine.simulate;
    root.calcProRataForDate = engine.calcProRataForDate;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. CONVERSÃO E MANIPULAÇÃO DE TAXAS DE JUROS
  // ---------------------------------------------------------------------------
  const RateUtils = {
    /**
     * Converte Taxa Anual Efetiva para Taxa Mensal Equivalente (Juros Compostos)
     * Fórmula: i_mensal = (1 + i_anual)^(1/12) - 1
     */
    annualEffectiveToMonthly(annualRatePercent) {
      const iAnnual = Number(annualRatePercent) / 100;
      return Math.pow(1 + iAnnual, 1 / 12) - 1;
    },

    /**
     * Converte Taxa Mensal para Taxa Anual Efetiva Equivalente (Juros Compostos)
     * Fórmula: i_anual = (1 + i_mensal)^12 - 1
     */
    monthlyToAnnualEffective(monthlyRatePercent) {
      const iMonthly = Number(monthlyRatePercent) / 100;
      return (Math.pow(1 + iMonthly, 12) - 1) * 100;
    },

    /**
     * Converte Taxa Anual Nominal para Taxa Mensal Proporcional (Juros Simples)
     * Fórmula: i_mensal = (i_anual / 12)
     */
    annualNominalToMonthly(annualRatePercent) {
      return (Number(annualRatePercent) / 12) / 100;
    },

    /**
     * Obtém o fator decimal mensal a partir do tipo e valor da taxa
     * interestRateType: 0 = Anual Efetiva, 1 = Mensal
     */
    resolveMonthlyRate(rate, rateType = 0) {
      const numericRate = Number(rate) || 0;
      if (Number(rateType) === 0) {
        return RateUtils.annualEffectiveToMonthly(numericRate);
      }
      return numericRate / 100;
    }
  };

  // ---------------------------------------------------------------------------
  // 2. CÁLCULO DE PARCELAS BASE (SAC & PRICE)
  // ---------------------------------------------------------------------------
  const MortgageFormulas = {
    /**
     * Calcula parcela e amortização ordinária do mês
     * @param {Object} params
     * @param {boolean} params.isSAC - true para SAC, false para PRICE
     * @param {number} params.balance - Saldo devedor atual (após correção monetária do mês)
     * @param {number} params.remainingTerms - Parcelas restantes no cronograma
     * @param {number} params.iMonthly - Taxa mensal em decimal (ex: 0.009631393)
     */
    calcBaseInstallment({ isSAC, balance, remainingTerms, iMonthly }) {
      const safeRemaining = Math.max(1, remainingTerms);
      const interestAmount = balance * iMonthly;
      let monthlyAmortization = 0;
      let installmentAmount = 0;

      if (isSAC) {
        monthlyAmortization = balance / safeRemaining;
        if (monthlyAmortization > balance) monthlyAmortization = balance;
        installmentAmount = monthlyAmortization + interestAmount;
      } else {
        // Tabela Price (Prestação constante PMT)
        const factor = Math.pow(1 + iMonthly, safeRemaining);
        const denom = factor - 1;
        const pmt = denom > 0
          ? balance * (iMonthly * factor) / denom
          : balance + interestAmount;

        installmentAmount = pmt;
        monthlyAmortization = pmt - interestAmount;
        if (monthlyAmortization > balance) {
          monthlyAmortization = balance;
          installmentAmount = monthlyAmortization + interestAmount;
        }
      }

      return {
        monthlyAmortization,
        interestAmount,
        installmentAmount
      };
    },

    /**
     * Recalcula o prazo remanescente após amortização extraordinária (Redução de Prazo no SAC)
     * Modelo Bancário Brasileiro (Itaú / SFH):
     * A parcela ordinária prevista para o mês seguinte é mantida constante, aplicando
     * a economia de juros obtida pelo abatimento do saldo diretamente na amortização principal.
     */
    calcTermReductionSAC({ balance, iMonthly, monthlyAmort, balBeforeExtra }) {
      if (balance <= 0.001) return 0;
      const nextInstWithoutAmort = monthlyAmort + (balBeforeExtra * iMonthly);
      const nextInterestWithAmort = balance * iMonthly;
      const newAmort = nextInstWithoutAmort - nextInterestWithAmort;

      if (newAmort > 0) {
        return Math.max(1, Math.round(balance / newAmort));
      }
      return 1;
    },

    /**
     * Recalcula o prazo remanescente após amortização extraordinária na Tabela Price
     * Mantém o valor da prestação (PMT) constante e calcula o novo prazo pela fórmula logarítmica.
     */
    calcTermReductionPrice({ balance, iMonthly, currentPMT }) {
      if (balance <= 0.001) return 0;
      const denom = currentPMT - (balance * iMonthly);
      if (denom > 0) {
        return Math.max(1, Math.round(-Math.log(1 - (balance * iMonthly) / currentPMT) / Math.log(1 + iMonthly)));
      }
      return 1;
    }
  };

  // ---------------------------------------------------------------------------
  // 3. JUROS PRÓ-RATA & TR INTRA-MÊS (PADRÃO DDC BANCÁRIO ITAÚ)
  // ---------------------------------------------------------------------------
  /**
   * Calcula encargos proporcionais quando uma amortização extra é realizada entre dois vencimentos.
   *
   * Regra do Banco:
   * • No dia do vencimento contratual (ex: dia 26): dias decorridos = 0 => Juros = R$ 0,00 e TR = R$ 0,00.
   * • Entre datas de vencimento: conta-se os dias corridos d a partir do dia 26 anterior.
   * • Juros Pró-rata: Valor * ((1 + i_mensal)^(d / 30) - 1)
   * • Correção TR: Valor * ((1 + TR_mensal)^(d / 30) - 1)
   * • Total Desembolsado = Valor Amortizado + Juros Pró-rata + TR
   * • Abatimento do Saldo Devedor = Valor Amortizado
   */
  function calcProRataForDate(amortDateStr, amount, customMonthlyRate, customTrRate, customCycleDay = 26) {
    const numAmount = Number(amount) || 0;
    if (!amortDateStr || numAmount <= 0) {
      return { days: 0, proRataInterest: 0, monetaryCorrection: 0, totalPaid: 0, baseDateStr: '-' };
    }

    const dAmort = new Date(amortDateStr + 'T00:00:00');
    const monthlyRate = (customMonthlyRate !== undefined && customMonthlyRate !== null)
      ? Number(customMonthlyRate)
      : 0.9631393; // Taxa mensal padrão do contrato Itaú

    const cycleDay = Number(customCycleDay) || 26;
    const year = dAmort.getFullYear();
    const month = dAmort.getMonth();
    const day = dAmort.getDate();

    let baseDate = new Date(year, month, cycleDay);
    if (day < cycleDay) {
      // Vencimento base foi no mês anterior
      baseDate = new Date(year, month - 1, cycleDay);
    }

    const diffMs = dAmort.getTime() - baseDate.getTime();
    const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const baseDateStr = baseDate.toISOString().substring(0, 10);

    if (days === 0) {
      return {
        days: 0,
        proRataInterest: 0,
        monetaryCorrection: 0,
        totalPaid: numAmount,
        baseDateStr
      };
    }

    // Juros Pró-rata Exponencial Composto: Valor * ((1 + i_mensal)^(dias / 30) - 1)
    const iMonthly = monthlyRate / 100;
    const proRataInterest = Math.round(numAmount * (Math.pow(1 + iMonthly, days / 30) - 1) * 100) / 100;

    // TR proporcional intra-mês (utiliza 0.1719% se não informado)
    const trRate = (customTrRate !== undefined && customTrRate !== null) ? Number(customTrRate) : 0.1719;
    const trMonthly = trRate / 100;
    const monetaryCorrection = Math.round(numAmount * (Math.pow(1 + trMonthly, days / 30) - 1) * 100) / 100;

    const totalPaid = Math.round((numAmount + proRataInterest + monetaryCorrection) * 100) / 100;

    return {
      days,
      proRataInterest,
      monetaryCorrection,
      totalPaid,
      baseDateStr
    };
  }

  // ---------------------------------------------------------------------------
  // 4. MOTOR COMPLETO DE SIMULAÇÃO (SAC & PRICE)
  // ---------------------------------------------------------------------------
  /**
   * Executa a simulação financeira completa de um financiamento.
   * Produz o cenário standard (sem amortizações extras) e o cenário com amortizações extras,
   * gerando tabela mês a mês com balanço de saldo, juros, amortização ordinária,
   * amortizações extras, taxas de seguro (MIP/DFI) e correção monetária (TR).
   *
   * @param {Object} payload Parâmetros do contrato e estratégia
   * @returns {Object} { sucess: true, data: { summaryResult, summaryWithAmortizationResult, simulationTable, simulationWithAmortizationTable } }
   */
  function simulate(payload) {
    if (!payload) throw new Error('Payload obrigatório para simulação');

    const n = Number(payload.numberOfInstallments) || 420;
    const pv = Number(payload.loanAmount) || 0;
    const isSAC = Number(payload.amortizationSystemType) === 0;
    const iMonthly = RateUtils.resolveMonthlyRate(payload.interestRate, payload.interestRateType);

    function simulateScenario(withAmort) {
      let balance = pv;
      const table = [];
      let totalInterest = 0;
      let totalAmort = 0;
      let totalExtraAmort = 0;
      let totalFees = 0;
      let totalCorrection = 0;

      const startDate = new Date((payload.date || '2025-02-26') + 'T00:00:00');

      // Linha inicial 0 (Estado de Contratação / Implantação)
      table.push({
        installment: 0,
        date: startDate.toISOString().split('.')[0],
        installmentAmount: 0,
        installmentAmountWithFee: 0,
        monetaryCorrection: 0,
        monetaryCorrectionValue: 0,
        fee: 0,
        interestAmount: 0,
        monthlyAmortization: 0,
        amortization: 0,
        outstandingBalance: balance,
        previousOutstandingBalance: 0,
        numberOfInstallmentsCurrent: 0,
        lastMonetaryCorrectionValue: 0,
        amortizationByTerm: false
      });

      let currentRemainingInstallments = n;

      for (let k = 1; k <= n && balance > 0.001; k++) {
        const curDate = new Date(startDate);
        curDate.setMonth(curDate.getMonth() + k);
        const prevBal = balance;

        // 1. Correção Monetária (TR)
        const corrRate = (payload.monetaryCorrections?.[k] || 0) / 100;
        const corrVal = balance * corrRate;
        balance += corrVal;
        totalCorrection += corrVal;

        // 2. Encargos e Seguros (MIP + DFI)
        const fee = Number(payload.fees?.[k]) || 0;
        totalFees += fee;

        // 3. Parcela e Amortização Base
        const base = MortgageFormulas.calcBaseInstallment({
          isSAC,
          balance,
          remainingTerms: currentRemainingInstallments,
          iMonthly
        });

        totalInterest += base.interestAmount;
        balance -= base.monthlyAmortization;
        totalAmort += base.monthlyAmortization;

        // 4. Amortização Extra (se aplicável)
        let extraVal = 0;
        let byTerm = true;
        let termRecalculated = false;

        if (withAmort && payload.amortizations?.[k]) {
          extraVal = Number(payload.amortizations[k].value) || 0;
          byTerm = Boolean(payload.amortizations[k].amortizationByTerm);

          if (extraVal > balance) extraVal = balance;
          const balBeforeExtra = balance;
          balance -= extraVal;
          totalExtraAmort += extraVal;

          if (byTerm && balance > 0.01) {
            if (isSAC) {
              currentRemainingInstallments = MortgageFormulas.calcTermReductionSAC({
                balance,
                iMonthly,
                monthlyAmort: base.monthlyAmortization,
                balBeforeExtra
              });
            } else {
              currentRemainingInstallments = MortgageFormulas.calcTermReductionPrice({
                balance,
                iMonthly,
                currentPMT: base.installmentAmount
              });
            }
            termRecalculated = true;
          }
        }

        if (!termRecalculated) {
          currentRemainingInstallments = Math.max(0, currentRemainingInstallments - 1);
        }

        table.push({
          installment: k,
          date: curDate.toISOString().split('.')[0],
          installmentAmount: base.installmentAmount,
          installmentAmountWithFee: base.installmentAmount + fee,
          monetaryCorrection: corrRate,
          monetaryCorrectionValue: corrVal,
          fee,
          interestAmount: base.interestAmount,
          monthlyAmortization: base.monthlyAmortization,
          amortization: extraVal,
          outstandingBalance: Math.max(0, balance),
          previousOutstandingBalance: prevBal,
          numberOfInstallmentsCurrent: currentRemainingInstallments,
          lastMonetaryCorrectionValue: 0,
          amortizationByTerm: byTerm
        });

        if (balance <= 0.001) break;
      }

      const firstInst = table[1] ? table[1].installmentAmountWithFee : 0;
      const finalInst = table[table.length - 1] ? table[table.length - 1].installmentAmountWithFee : 0;

      // Total desembolsado pelo tomador (parcelas + taxas + amortizações extras)
      let totalPaid = 0;
      for (let rowIdx = 1; rowIdx < table.length; rowIdx++) {
        totalPaid += table[rowIdx].installmentAmountWithFee + table[rowIdx].amortization;
      }

      return {
        summary: {
          loanAmount: pv,
          totalAmountPayable: totalPaid,
          totalInterestAmount: totalInterest,
          totalAmortization: totalExtraAmort,
          totalFees: totalFees,
          totalCorrectionValue: totalCorrection,
          interestRate: Number(payload.interestRate),
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

  // ---------------------------------------------------------------------------
  // 5. CÁLCULO DE ECONOMIA E COMPARAÇÃO DE CENÁRIOS
  // ---------------------------------------------------------------------------
  /**
   * Compara o cenário com amortizações extras em relação ao cenário padrão
   * e extrai os ganhos financeiros e temporais.
   */
  function calculateSavings(standardSummary, withAmortSummary) {
    if (!standardSummary || !withAmortSummary) {
      return {
        savedInterest: 0,
        savedTotalMoney: 0,
        reducedInstallments: 0,
        reducedYears: 0,
        accelerationFactor: 1,
        percentTotalSaved: 0
      };
    }

    const savedInterest = Math.max(0, standardSummary.totalInterestAmount - withAmortSummary.totalInterestAmount);
    const savedTotalMoney = Math.max(0, standardSummary.totalAmountPayable - withAmortSummary.totalAmountPayable);
    const reducedInstallments = Math.max(0, standardSummary.numberOfInstallments - withAmortSummary.numberOfInstallments);
    const reducedYears = reducedInstallments / 12;
    const accelerationFactor = withAmortSummary.numberOfInstallments > 0
      ? standardSummary.numberOfInstallments / withAmortSummary.numberOfInstallments
      : 1;
    const percentTotalSaved = standardSummary.totalAmountPayable > 0
      ? (savedTotalMoney / standardSummary.totalAmountPayable) * 100
      : 0;

    return {
      savedInterest,
      savedTotalMoney,
      reducedInstallments,
      reducedYears,
      accelerationFactor,
      percentTotalSaved
    };
  }

  // ---------------------------------------------------------------------------
  // EXPOSIÇÃO DO MÓDULO
  // ---------------------------------------------------------------------------
  return {
    version: '3.0.0',
    RateUtils,
    MortgageFormulas,
    calcProRataForDate,
    simulate,
    calculateSavings
  };
});
