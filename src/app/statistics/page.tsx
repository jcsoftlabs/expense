'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Calendar,
  PieChart,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ArrowLeft,
  Briefcase,
  Users
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface CurrencySummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  outstandingPending: number;
  outstandingOverdue: number;
  totalOutstanding: number;
  outstandingPaid: number;
}

interface Summary {
  usd: CurrencySummary;
  htg: CurrencySummary;
  activeProjects: number;
  totalProjects: number;
  totalClients: number;
}

interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
}

interface CategoryData {
  category: string;
  value: number;
}

interface PaymentMethodData {
  method: string;
  value: number;
}

interface StatisticsData {
  summary: Summary;
  cashFlowDataUSD: CashFlowPoint[];
  cashFlowDataHTG: CashFlowPoint[];
  categoryDataUSD: CategoryData[];
  categoryDataHTG: CategoryData[];
  paymentMethodsUSD: PaymentMethodData[];
  paymentMethodsHTG: PaymentMethodData[];
}

export default function Statistics() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and view state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'HTG'>('USD');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  // Pre-configured elegant HSL colors for categories chart
  const donutColors = [
    '#3b82f6', // Indigo Blue
    '#10b981', // Emerald Green
    '#a855f7', // Radiant Violet
    '#f43f5e', // Vibrant Rose
    '#f59e0b', // Sunset Amber
    '#06b6d4', // Cyan Wave
    '#ec4899', // Hot Pink
    '#6366f1'  // Deep Purple
  ];

  async function fetchStatistics() {
    try {
      setLoading(true);
      let url = '/api/dashboard';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur lors de la récupération des métriques statistiques');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  const applyPreset = (preset: 'all' | 'month' | '3months') => {
    const today = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (preset === '3months') {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [startDate, endDate]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '15px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)' }}>Analyse de vos données financières en cours...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '15px' }}>Erreur</h3>
        <p>{error || 'Impossible de charger le cockpit statistique'}</p>
        <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }

  // Deselect indices if active currency changes to prevent stale indices
  const handleCurrencyChange = (curr: 'USD' | 'HTG') => {
    setActiveCurrency(curr);
    setHoveredDonutIndex(null);
  };

  const { 
    summary, 
    cashFlowDataUSD, 
    cashFlowDataHTG, 
    categoryDataUSD, 
    categoryDataHTG, 
    paymentMethodsUSD, 
    paymentMethodsHTG 
  } = data;

  const currentSummary = activeCurrency === 'USD' ? summary.usd : summary.htg;
  const currentCashFlow = activeCurrency === 'USD' ? cashFlowDataUSD : cashFlowDataHTG;
  const currentCategories = activeCurrency === 'USD' ? categoryDataUSD : categoryDataHTG;
  const currentPaymentMethods = activeCurrency === 'USD' ? paymentMethodsUSD : paymentMethodsHTG;

  // 1. Calculate ratios
  const totalIncome = currentSummary.totalIncome;
  const totalExpenses = currentSummary.totalExpenses;
  const netMargin = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Consolidated monthly average
  const uniqueMonths = currentCashFlow.filter(d => d.income > 0 || d.expenses > 0);
  const averageIncome = uniqueMonths.length > 0 
    ? totalIncome / uniqueMonths.length 
    : totalIncome;

  // Collection efficiency
  const totalBilled = currentSummary.outstandingPaid + currentSummary.totalOutstanding;
  const collectionEfficiency = totalBilled > 0 
    ? (currentSummary.outstandingPaid / totalBilled) * 100 
    : 0;

  // 2. Bar chart configuration
  const chartHeight = 220;
  const chartWidth = 560;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(
    ...currentCashFlow.map(d => Math.max(d.income || 0, d.expenses || 0)),
    1000
  ) * 1.15;

  const numMonths = currentCashFlow.length;
  const secWidth = numMonths > 0 ? innerWidth / numMonths : innerWidth;
  const barWidth = Math.max(8, secWidth * 0.22);
  const barGap = 4;

  // 3. Donut chart calculations
  const donutRadius = 70;
  const donutCircumference = 2 * Math.PI * donutRadius; // 439.82
  const donutCenter = 100;
  const totalExpensesSum = currentCategories.reduce((acc, curr) => acc + curr.value, 0);

  let cumulativePercent = 0;
  const donutSlices = currentCategories.map((cat, index) => {
    const sharePercent = totalExpensesSum > 0 ? (cat.value / totalExpensesSum) * 100 : 0;
    const strokeLength = (sharePercent / 100) * donutCircumference;
    const strokeOffset = donutCircumference - (cumulativePercent / 100) * donutCircumference;
    cumulativePercent += sharePercent;
    
    return {
      ...cat,
      percentage: sharePercent,
      strokeLength,
      strokeOffset,
      color: donutColors[index % donutColors.length]
    };
  });

  const activeDonutSlice = hoveredDonutIndex !== null ? donutSlices[hoveredDonutIndex] : null;

  // French display names for payment methods
  const translatePaymentMethod = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CASH': return 'Espèces';
      case 'VIREMENT': return 'Virement Bancaire';
      case 'CHEQUE': return 'Chèque';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  const totalCollectedMethods = currentPaymentMethods.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header section with back option & main titles */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.88rem' }}>
              <ArrowLeft size={16} /> Retour au tableau de bord
            </Link>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Statistiques Analytiques
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Visualisez et analysez la santé financière de vos projets et activités.
          </p>
        </div>

        {/* Currency Switcher Pill */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-glass)', 
          padding: '4px', 
          borderRadius: '10px',
          display: 'flex',
          gap: '4px'
        }}>
          <button
            className={`btn ${activeCurrency === 'USD' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '7px',
              fontWeight: 600,
              background: activeCurrency === 'USD' ? 'var(--primary-glow)' : 'transparent',
              borderColor: activeCurrency === 'USD' ? 'var(--primary)' : 'transparent',
              color: '#ffffff',
              borderWidth: '1px',
              borderStyle: 'solid',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
            onClick={() => handleCurrencyChange('USD')}
          >
            Dollar Américain (USD)
          </button>
          <button
            className={`btn ${activeCurrency === 'HTG' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '7px',
              fontWeight: 600,
              background: activeCurrency === 'HTG' ? 'var(--primary-glow)' : 'transparent',
              borderColor: activeCurrency === 'HTG' ? 'var(--primary)' : 'transparent',
              color: '#ffffff',
              borderWidth: '1px',
              borderStyle: 'solid',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
            onClick={() => handleCurrencyChange('HTG')}
          >
            Gourde Haïtienne (HTG)
          </button>
        </div>
      </header>

      {/* Date Filter Widget */}
      <div className="glass-panel" style={{ 
        padding: '16px 20px', 
        marginBottom: '35px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '15px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'var(--border-glass)'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Calendar size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>Période d'analyse :</span>
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <button 
              type="button" 
              className="btn" 
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: (!startDate && !endDate) ? 'var(--primary-glow)' : 'transparent',
                borderColor: (!startDate && !endDate) ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                borderWidth: '1px',
                borderStyle: 'solid',
                cursor: 'pointer'
              }}
              onClick={() => applyPreset('all')}
            >
              Tout
            </button>
            <button 
              type="button" 
              className="btn" 
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: (startDate && endDate && new Date(startDate).getDate() === 1) ? 'var(--primary-glow)' : 'transparent',
                borderColor: (startDate && endDate && new Date(startDate).getDate() === 1) ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                borderWidth: '1px',
                borderStyle: 'solid',
                cursor: 'pointer'
              }}
              onClick={() => applyPreset('month')}
            >
              Ce mois-ci
            </button>
            <button 
              type="button" 
              className="btn" 
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: (startDate && new Date(startDate).getMonth() === ((new Date().getMonth() - 2 + 12) % 12)) ? 'var(--primary-glow)' : 'transparent',
                borderColor: (startDate && new Date(startDate).getMonth() === ((new Date().getMonth() - 2 + 12) % 12)) ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                borderWidth: '1px',
                borderStyle: 'solid',
                cursor: 'pointer'
              }}
              onClick={() => applyPreset('3months')}
            >
              3 derniers mois
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Du</span>
            <input 
              type="date" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', width: '135px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Au</span>
            <input 
              type="date" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', width: '135px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '6px', color: '#fff' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ratios & Indicators (Row of 3 cards) */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '35px' 
      }}>
        {/* Card 1: Marge Nette Consolidée */}
        <div className="glass-panel card-hover-lift" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: netMargin >= 15 ? 'radial-gradient(circle, var(--success-glow) 0%, transparent 70%)' : 'radial-gradient(circle, var(--danger-glow) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>Taux d'Épargne / Marge Nette</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: netMargin >= 15 ? 'var(--success-glow)' : 'var(--danger-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: netMargin >= 15 ? 'var(--success)' : 'var(--danger)'
            }}>
              {netMargin >= 15 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '8px' }}>
            {netMargin.toFixed(1)}%
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} /> Ratio de conservation des revenus ({activeCurrency})
          </p>
          <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              background: netMargin >= 15 ? 'var(--success)' : 'var(--danger)', 
              height: '100%', 
              width: `${Math.min(100, Math.max(0, netMargin))}%`, 
              boxShadow: netMargin >= 15 ? '0 0 10px var(--success-glow)' : '0 0 10px var(--danger-glow)',
              transition: 'width 0.8s ease-out'
            }} />
          </div>
        </div>

        {/* Card 2: Revenu Mensuel Moyen */}
        <div className="glass-panel card-hover-lift" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>Revenu Mensuel Moyen</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Activity size={20} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '8px' }}>
            {formatCurrency(averageIncome, activeCurrency)}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>
            Calculé sur la base de {uniqueMonths.length} mois actifs
          </p>
          <div style={{ marginTop: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Revenus totaux : {formatCurrency(totalIncome, activeCurrency)}</span>
          </div>
        </div>

        {/* Card 3: Efficacité des Recouvrements */}
        <div className="glass-panel card-hover-lift" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>Efficacité des Recouvrements</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <CreditCard size={20} />
            </div>
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '8px' }}>
            {collectionEfficiency.toFixed(1)}%
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>
            Factures payées vs factures totales émises
          </p>
          <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              background: 'var(--warning)', 
              height: '100%', 
              width: `${collectionEfficiency}%`, 
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)',
              transition: 'width 0.8s ease-out'
            }} />
          </div>
        </div>
      </section>

      {/* Main Charts Canvas (Grids) */}
      <section className="stats-charts-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
        gap: '24px',
        marginBottom: '35px'
      }}>
        {/* Widget Left: Flux Mensuel Bar Chart */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Flux Mensuel Comparatif ({activeCurrency})</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dark)' }}>Entrées et sorties par mois</p>
            </div>
            {hoveredMonth !== null && currentCashFlow[hoveredMonth] && (
              <div className="glass-panel animate-fade-in" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--bg-surface-hover)', borderColor: 'var(--primary)' }}>
                <span style={{ fontWeight: 600, color: '#fff', marginRight: '6px' }}>{currentCashFlow[hoveredMonth].month} :</span>
                <span style={{ color: 'var(--success)' }}>+{formatCurrency(currentCashFlow[hoveredMonth].income, activeCurrency)}</span>
                <span style={{ color: 'var(--text-dark)', margin: '0 4px' }}>|</span>
                <span style={{ color: 'var(--danger)' }}>-{formatCurrency(currentCashFlow[hoveredMonth].expenses, activeCurrency)}</span>
              </div>
            )}
          </div>

          {currentCashFlow.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '0.9rem' }}>
              Aucune donnée de trésorerie sur cette période.
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.3" />
                  </linearGradient>
                  {/* Glass overlay filter */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Y Axis Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const y = paddingTop + r * innerHeight;
                  const val = maxVal * (1 - r);
                  return (
                    <g key={i}>
                      <line 
                        x1={paddingLeft} 
                        y1={y} 
                        x2={chartWidth - paddingRight} 
                        y2={y} 
                        stroke="rgba(255, 255, 255, 0.04)" 
                        strokeDasharray="4,4"
                      />
                      <text 
                        x={paddingLeft - 8} 
                        y={y + 3} 
                        fill="var(--text-dark)" 
                        fontSize="9" 
                        textAnchor="end"
                        fontFamily="var(--font-family)"
                      >
                        {Math.round(val).toLocaleString('fr-FR')}
                      </text>
                    </g>
                  );
                })}

                {/* Bars Rendering */}
                {currentCashFlow.map((d, index) => {
                  const secX = paddingLeft + index * secWidth;
                  const centerX = secX + secWidth / 2;

                  // Scales relative to max value
                  const incomeH = ((d.income || 0) / maxVal) * innerHeight;
                  const expenseH = ((d.expenses || 0) / maxVal) * innerHeight;

                  const incomeY = chartHeight - paddingBottom - incomeH;
                  const expenseY = chartHeight - paddingBottom - expenseH;

                  const incomeX = centerX - barWidth - barGap / 2;
                  const expenseX = centerX + barGap / 2;

                  const isHovered = hoveredMonth === index;

                  return (
                    <g 
                      key={index}
                      onMouseEnter={() => setHoveredMonth(index)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Section Hover Overlay box */}
                      <rect 
                        x={secX}
                        y={paddingTop}
                        width={secWidth}
                        height={innerHeight + 5}
                        fill={isHovered ? 'rgba(255,255,255,0.02)' : 'transparent'}
                        rx={6}
                        style={{ transition: 'fill 0.2s' }}
                      />

                      {/* Income Bar (Green) */}
                      {d.income > 0 && (
                        <rect
                          x={incomeX}
                          y={incomeY}
                          width={barWidth}
                          height={incomeH}
                          fill="url(#successGrad)"
                          rx={3}
                          opacity={hoveredMonth === null || isHovered ? 1 : 0.55}
                          style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                      )}

                      {/* Expense Bar (Red) */}
                      {d.expenses > 0 && (
                        <rect
                          x={expenseX}
                          y={expenseY}
                          width={barWidth}
                          height={expenseH}
                          fill="url(#dangerGrad)"
                          rx={3}
                          opacity={hoveredMonth === null || isHovered ? 1 : 0.55}
                          style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                      )}

                      {/* Month Text Label */}
                      <text
                        x={centerX}
                        y={chartHeight - 8}
                        fill={isHovered ? '#ffffff' : 'var(--text-dark)'}
                        fontSize="9"
                        textAnchor="middle"
                        fontWeight={isHovered ? '600' : '400'}
                        fontFamily="var(--font-family)"
                        style={{ transition: 'fill 0.2s' }}
                      >
                        {d.month.split('-')[1]}/{d.month.split('-')[0].slice(2)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Legends Row */}
              <div style={{ display: 'flex', gap: '15px', marginTop: '15px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: 'var(--success)', display: 'inline-block' }}></span>
                  Entrées d'argent
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: 'var(--danger)', display: 'inline-block' }}></span>
                  Dépenses & Frais
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Widget Right: Dépenses par Catégorie Donut Chart */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '340px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>Dépenses par Catégorie</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dark)', marginBottom: '20px' }}>Distribution de vos coûts de fonctionnement ({activeCurrency})</p>
          </div>

          {currentCategories.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '0.9rem' }}>
              Aucune dépense enregistrée sur cette période.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-around' }}>
              {/* Donut Render canvas */}
              <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <filter id="sliceGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  
                  <g transform="rotate(-90 100 100)">
                    {/* Underlying Track Ring */}
                    <circle
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius}
                      fill="transparent"
                      stroke="rgba(255, 255, 255, 0.02)"
                      strokeWidth={14}
                    />

                    {/* Slices circle loops */}
                    {donutSlices.map((slice, index) => {
                      const isHovered = hoveredDonutIndex === index;
                      return (
                        <circle
                          key={index}
                          cx={donutCenter}
                          cy={donutCenter}
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 20 : 14}
                          strokeDasharray={slice.strokeLength + ' ' + donutCircumference}
                          strokeDashoffset={slice.strokeOffset}
                          strokeLinecap={slice.percentage > 3 ? 'round' : 'butt'}
                          style={{
                            transition: 'stroke-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s',
                            cursor: 'pointer',
                            filter: isHovered ? `drop-shadow(0 0 6px ${slice.color}80) url(#sliceGlow)` : 'none',
                            opacity: hoveredDonutIndex === null || isHovered ? 1 : 0.55
                          }}
                          onMouseEnter={() => setHoveredDonutIndex(index)}
                          onMouseLeave={() => setHoveredDonutIndex(null)}
                        />
                      );
                    })}
                  </g>

                  {/* Inner text information displaying hovered context or default aggregates */}
                  <g>
                    <text
                      x="100"
                      y="92"
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="9"
                      fontWeight="600"
                      letterSpacing="0.04em"
                      fontFamily="var(--font-family)"
                    >
                      {activeDonutSlice ? activeDonutSlice.category : 'TOTAL CHARGES'}
                    </text>
                    <text
                      x="100"
                      y="112"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={activeDonutSlice ? '13' : '15'}
                      fontWeight="800"
                      fontFamily="var(--font-family)"
                    >
                      {activeDonutSlice 
                        ? formatCurrency(activeDonutSlice.value, activeCurrency) 
                        : formatCurrency(totalExpensesSum, activeCurrency)
                      }
                    </text>
                    <text
                      x="100"
                      y="126"
                      textAnchor="middle"
                      fill="var(--text-dark)"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="var(--font-family)"
                    >
                      {activeDonutSlice 
                        ? `${activeDonutSlice.percentage.toFixed(1)}% des charges` 
                        : `${currentCategories.length} catégories`
                      }
                    </text>
                  </g>
                </svg>
              </div>

              {/* Legends detailed lists */}
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {donutSlices.map((slice, index) => {
                  const isHovered = hoveredDonutIndex === index;
                  return (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isHovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={() => setHoveredDonutIndex(index)}
                      onMouseLeave={() => setHoveredDonutIndex(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: slice.color, 
                          boxShadow: isHovered ? `0 0 8px ${slice.color}` : 'none',
                          display: 'inline-block' 
                        }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: isHovered ? '600' : '400', color: isHovered ? '#fff' : 'var(--text-main)' }}>
                          {slice.category}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {formatCurrency(slice.value, activeCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Payment methods volume collected analysis */}
      <section className="glass-panel" style={{ padding: '24px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <CreditCard size={20} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Volume d'Encaissements par Mode de Paiement</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dark)' }}>Répartition sémantique des volumes réels encaissés ({activeCurrency})</p>
          </div>
        </div>

        {currentPaymentMethods.length === 0 ? (
          <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)', fontSize: '0.9rem' }}>
            Aucun paiement encaissé répertorié pour cette période ({activeCurrency}).
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '20px',
            marginTop: '10px'
          }}>
            {currentPaymentMethods.map((pm, i) => {
              const share = totalCollectedMethods > 0 ? (pm.value / totalCollectedMethods) * 100 : 0;
              const formattedName = translatePaymentMethod(pm.method);
              
              // Colors matching payment method icons
              let badgeColor = 'rgba(59, 130, 246, 0.1)';
              let textColor = '#3b82f6';
              if (pm.method.toUpperCase() === 'CASH') {
                badgeColor = 'rgba(16, 185, 129, 0.1)';
                textColor = '#10b981';
              } else if (pm.method.toUpperCase() === 'CHEQUE') {
                badgeColor = 'rgba(245, 158, 11, 0.1)';
                textColor = '#f59e0b';
              } else if (pm.method.toUpperCase() === 'MOBILE_MONEY') {
                badgeColor = 'rgba(168, 85, 247, 0.1)';
                textColor = '#a855f7';
              }

              return (
                <div key={i} className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      background: badgeColor, 
                      color: textColor, 
                      fontSize: '0.75rem', 
                      fontWeight: 700 
                    }}>
                      {formattedName}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '10px' }}>
                    {formatCurrency(pm.value, activeCurrency)}
                  </h4>
                  <div style={{ background: 'rgba(255,255,255,0.03)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                      background: textColor, 
                      height: '100%', 
                      width: `${share}%`, 
                      boxShadow: `0 0 6px ${textColor}80` 
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
