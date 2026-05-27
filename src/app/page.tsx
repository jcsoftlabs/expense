'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Plus, 
  ChevronRight,
  Loader2,
  DollarSign,
  Users,
  Briefcase,
  Sparkles,
  Zap
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatLocalDateCompact } from '@/lib/date';
import SecuritySettings from '@/app/components/SecuritySettings';
import { useToast } from '@/app/components/Toast';
import { usePullToRefresh } from '@/app/hooks/usePullToRefresh';




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

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  category: string;
  description: string;
  currency: string;
  projectName?: string;
  clientName?: string;
}

interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
}

interface DashboardData {
  summary: Summary;
  recentTransactions: Transaction[];
  cashFlowDataUSD: CashFlowPoint[];
  cashFlowDataHTG: CashFlowPoint[];
  categoryDataUSD: any[];
  categoryDataHTG: any[];
  upcomingReceivables: any[];
}

export default function Dashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Range Filtering States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Switch between USD and HTG for the Chart
  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'HTG'>('USD');

  // AI Command Center States
  const [aiText, setAiText] = useState('');
  const [aiSubmitting, setAiSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ success: boolean; message: string; extracted?: any } | null>(null);

  async function fetchDashboard(silent = false) {
    try {
      if (!silent) setLoading(true);
      let url = '/api/dashboard';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur lors du chargement des données');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const { pullDistance, isRefreshing, isPulling } = usePullToRefresh({
    onRefresh: async () => {
      await fetchDashboard(true);
    }
  });


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
    fetchDashboard();
  }, [startDate, endDate]);

  async function handleAISubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiText.trim()) return;

    try {
      setAiSubmitting(true);
      setAiResponse(null);
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText })
      });
      const json = await res.json();
      setAiResponse(json);
      if (json.success) {
        showToast(json.message || 'Transaction enregistrée avec succès !', 'success');
        setAiText(''); // Clear input
        fetchDashboard(); // Reactive UI refresh!
      } else {
        showToast(json.message || "Impossible d'analyser la phrase comptable.", 'error');
      }
    } catch (err: any) {
      showToast("Une erreur de connexion est survenue.", 'error');
      setAiResponse({
        success: false,
        message: "Une erreur de connexion est survenue lors de l'envoi de votre phrase comptable."
      });
    } finally {
      setAiSubmitting(false);
    }
  }

  if (loading && !data) {
    return (
      <div>
        {/* Welcome Header Skeleton */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div className="skeleton" style={{ width: '220px', height: '36px', marginBottom: '8px' }}></div>
            <div className="skeleton" style={{ width: '380px', height: '16px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: '8px' }}></div>
            <div className="skeleton" style={{ width: '140px', height: '40px', borderRadius: '8px' }}></div>
          </div>
        </header>

        {/* Date Filter Panel Skeleton */}
        <div className="skeleton-card" style={{ padding: '16px 20px', marginBottom: '35px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div className="skeleton" style={{ width: '280px', height: '24px' }}></div>
          <div className="skeleton" style={{ width: '320px', height: '24px' }}></div>
        </div>

        {/* AI Command Center Skeleton */}
        <div className="skeleton-card" style={{ padding: '24px', marginBottom: '35px', minHeight: '140px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
            <div className="skeleton" style={{ width: '200px', height: '24px' }}></div>
          </div>
          <div className="skeleton" style={{ width: '100%', height: '42px', borderRadius: '8px' }}></div>
        </div>

        {/* Summary Widgets Grid Skeleton */}
        <section className="dashboard-grid" style={{ marginBottom: '35px' }}>
          <div className="skeleton-card" style={{ minHeight: '130px' }}>
            <div className="skeleton-line sm" style={{ marginBottom: '8px' }}></div>
            <div className="skeleton-line lg" style={{ marginBottom: '6px' }}></div>
            <div className="skeleton-line md" style={{ marginBottom: '12px' }}></div>
            <div className="skeleton-line sm" style={{ width: '90%' }}></div>
          </div>
          <div className="skeleton-card" style={{ minHeight: '130px' }}>
            <div className="skeleton-line sm" style={{ marginBottom: '8px' }}></div>
            <div className="skeleton-line lg" style={{ marginBottom: '6px' }}></div>
            <div className="skeleton-line md" style={{ marginBottom: '12px' }}></div>
            <div className="skeleton-line sm" style={{ width: '90%' }}></div>
          </div>
          <div className="skeleton-card" style={{ minHeight: '130px' }}>
            <div className="skeleton-line sm" style={{ marginBottom: '8px' }}></div>
            <div className="skeleton-line lg" style={{ marginBottom: '6px' }}></div>
            <div className="skeleton-line md" style={{ marginBottom: '12px' }}></div>
            <div className="skeleton-line sm" style={{ width: '90%' }}></div>
          </div>
          <div className="skeleton-card" style={{ minHeight: '130px' }}>
            <div className="skeleton-line sm" style={{ marginBottom: '8px' }}></div>
            <div className="skeleton-line lg" style={{ marginBottom: '6px' }}></div>
            <div className="skeleton-line md" style={{ marginBottom: '12px' }}></div>
            <div className="skeleton-line sm" style={{ width: '90%' }}></div>
          </div>
        </section>

        {/* Two Column Layout Skeleton */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '30px' }} className="responsive-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Chart Skeleton */}
            <div className="skeleton-card" style={{ minHeight: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div className="skeleton-line md" style={{ width: '150px' }}></div>
                <div className="skeleton-line sm" style={{ width: '80px' }}></div>
              </div>
              <div className="skeleton" style={{ flex: 1, minHeight: '160px', width: '100%', borderRadius: '8px' }}></div>
            </div>
            {/* Invoices Skeleton */}
            <div className="skeleton-card" style={{ minHeight: '200px' }}>
              <div className="skeleton-line md" style={{ width: '180px', marginBottom: '15px' }}></div>
              <div className="skeleton" style={{ height: '70px', width: '100%', borderRadius: '8px', marginBottom: '10px' }}></div>
              <div className="skeleton" style={{ height: '70px', width: '100%', borderRadius: '8px' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Activities Skeleton */}
            <div className="skeleton-card" style={{ minHeight: '220px' }}>
              <div className="skeleton-line md" style={{ width: '120px', marginBottom: '15px' }}></div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line md" style={{ marginBottom: '6px' }}></div>
                  <div className="skeleton-line sm"></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line md" style={{ marginBottom: '6px' }}></div>
                  <div className="skeleton-line sm"></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line md" style={{ marginBottom: '6px' }}></div>
                  <div className="skeleton-line sm"></div>
                </div>
              </div>
            </div>

            {/* CRM Quick links skeleton */}
            <div className="skeleton-card" style={{ minHeight: '140px' }}>
              <div className="skeleton-line md" style={{ width: '140px', marginBottom: '15px' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }}></div>
                <div className="skeleton" style={{ height: '70px', borderRadius: '8px' }}></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '15px' }}>Erreur</h3>
        <p>{error || 'Impossible de charger le tableau de bord'}</p>
        <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }

  const { summary, recentTransactions, cashFlowDataUSD, cashFlowDataHTG, upcomingReceivables } = data;

  const currentCashFlowData = activeCurrency === 'USD' ? cashFlowDataUSD : cashFlowDataHTG;

  // Custom Interactive SVG Chart calculations
  const chartHeight = 200;
  const chartWidth = 500;
  const paddingLeft = 48;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Find max value in cashFlowData to scale chart
  const maxVal = Math.max(
    ...currentCashFlowData.map(d => Math.max(d.income || 0, d.expenses || 0)),
    1000 // Minimum top boundary
  ) * 1.15;

  // Build SVG path points
  const pointsIncome = currentCashFlowData.map((d, index) => {
    const x = paddingLeft + (index / (currentCashFlowData.length - 1 || 1)) * innerWidth;
    const y = chartHeight - paddingBottom - ((d.income || 0) / maxVal) * innerHeight;
    return `${x},${y}`;
  });

  const pointsExpenses = currentCashFlowData.map((d, index) => {
    const x = paddingLeft + (index / (currentCashFlowData.length - 1 || 1)) * innerWidth;
    const y = chartHeight - paddingBottom - ((d.expenses || 0) / maxVal) * innerHeight;
    return `${x},${y}`;
  });

  const incomePath = pointsIncome.length > 0 ? `M ${pointsIncome.join(' L ')}` : '';
  const expensePath = pointsExpenses.length > 0 ? `M ${pointsExpenses.join(' L ')}` : '';

  // Gradient area fill paths
  const incomeFillPath = pointsIncome.length > 0 
    ? `${incomePath} L ${paddingLeft + innerWidth},${chartHeight - paddingBottom} L ${paddingLeft},${chartHeight - paddingBottom} Z` 
    : '';
  const expenseFillPath = pointsExpenses.length > 0 
    ? `${expensePath} L ${paddingLeft + innerWidth},${chartHeight - paddingBottom} L ${paddingLeft},${chartHeight - paddingBottom} Z` 
    : '';

  return (
    <div style={{ position: 'relative' }}>
      {/* Pull to Refresh Mobile Indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="ptr-indicator" 
          style={{ 
            height: `${pullDistance}px`, 
            opacity: pullDistance > 0 ? Math.min(pullDistance / 50, 1) : 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            transition: isPulling ? 'none' : 'height 0.2s ease, opacity 0.2s ease'
          }}
        >
          <Loader2 
            className="animate-spin" 
            size={16} 
            color="var(--primary)" 
            style={{ 
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transform: isRefreshing ? 'none' : `rotate(${pullDistance * 6}deg)`
            }} 
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isRefreshing ? 'Actualisation des données...' : 'Tirez pour rafraîchir'}
          </span>
        </div>
      )}

      {/* Welcome Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', marginBottom: '6px' }}>Cockpit Financier</h1>
          <p>Bonjour. Suivez vos revenus en USD et HTG de manière consolidée.</p>
        </div>
        <div className="dashboard-header-actions" style={{ display: 'flex', gap: '12px' }}>
          <Link href="/transactions" className="btn btn-secondary">
            <Plus size={18} /> Nouvelle transaction
          </Link>
          <Link href="/receivables" className="btn btn-primary">
            <FileText size={18} /> Émettre Facture
          </Link>
        </div>
      </header>

      {/* Date Filter Panel */}
      <div className="glass-panel dashboard-date-panel" style={{ 
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
        <div className="dashboard-period-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>Période :</span>
          <div className="dashboard-period-pills" style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
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

        <div className="dashboard-date-inputs" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="dashboard-date-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Du</span>
            <input 
              type="date" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', width: '135px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="dashboard-date-input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Au</span>
            <input 
              type="date" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '0.8rem', width: '135px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* AI Command Center Canvas */}
      <section className="glass-panel" style={{ 
        padding: '24px', 
        marginBottom: '35px', 
        border: '1px solid rgba(139, 92, 246, 0.25)', 
        background: 'linear-gradient(135deg, rgba(17, 12, 40, 0.45) 0%, rgba(10, 10, 18, 0.5) 100%)',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.05), inset 0 0 16px rgba(255, 255, 255, 0.01)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '120px',
          height: '120px',
          background: 'var(--primary)',
          filter: 'blur(70px)',
          opacity: 0.12,
          pointerEvents: 'none'
        }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div className="ai-icon-pulse" style={{
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Sparkles size={14} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.02rem', fontWeight: '700', color: '#ffffff', letterSpacing: '0.3px' }}>AI Command Center</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pilotez votre comptabilité en langage naturel</p>
          </div>
        </div>

        <form onSubmit={handleAISubmit} className="dashboard-ai-form" style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
          <div className="dashboard-ai-input-wrap" style={{ flexGrow: 1, position: 'relative' }}>
            <input 
              type="text" 
              placeholder='Ex: "J&#39;ai realiser la mise a jour de l&#39;application NOUMOBILE pour le client NOU pour 30 000 HTG, pas encore payé"'
              className="form-input"
              style={{ 
                paddingRight: '45px', 
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
                fontSize: '0.9rem'
              }}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              disabled={aiSubmitting}
            />
            <div style={{ position: 'absolute', right: '14px', top: '13px', display: 'flex', alignItems: 'center' }}>
              {aiSubmitting ? (
                <Loader2 className="animate-spin" size={16} color="var(--primary)" />
              ) : (
                <Sparkles size={16} color="rgba(167, 139, 250, 0.5)" />
              )}
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary dashboard-ai-submit" 
            style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              borderColor: '#7c3aed',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600'
            }}
            disabled={aiSubmitting || !aiText.trim()}
          >
            Saisir <Zap size={14} />
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="dashboard-ai-suggestions" style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Suggestions :</span>
          {[
            "Revenu de 500$",
            "Dépense hosting 12$",
            "Facture client Jean"
          ].map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setAiText(suggestion)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '4px 12px',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
            >
              <Sparkles size={11} style={{ opacity: 0.7 }} />
              {suggestion}
            </button>
          ))}
        </div>

        {/* AI Action response area */}
        {aiResponse && (
          <div style={{ 
            marginTop: '18px', 
            padding: '16px', 
            borderRadius: '10px', 
            background: aiResponse.success ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.06)',
            border: `1px solid ${aiResponse.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}`,
            position: 'relative'
          }}>
            <button 
              type="button" 
              onClick={() => setAiResponse(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-dark)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                lineHeight: '1'
              }}
            >
              ×
            </button>
            <div style={{ fontSize: '0.88rem', color: '#ffffff', lineHeight: '1.5', whiteSpace: 'pre-line', paddingRight: '20px' }}>
              {aiResponse.message}
            </div>
            
            {/* Show parsed entities tags on success */}
            {aiResponse.success && aiResponse.extracted && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                  💰 {formatCurrency(aiResponse.extracted.amount, aiResponse.extracted.currency)}
                </span>
                {aiResponse.extracted.clientName && (
                  <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                    👤 Client: {aiResponse.extracted.clientName}
                  </span>
                )}
                {aiResponse.extracted.projectName && (
                  <span className="badge badge-info" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                    📂 Projet: {aiResponse.extracted.projectName}
                  </span>
                )}
                <span className="badge" style={{ background: aiResponse.extracted.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: aiResponse.extracted.isPaid ? 'var(--success)' : 'var(--warning)' }}>
                  ⏳ Statut: {aiResponse.extracted.isPaid ? 'Payé' : 'En attente'}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Summary Widgets Grid */}
      <section className="dashboard-grid">
        {/* Net Trésorerie */}
        <div className="glass-panel summary-card card-blue card-hover-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="summary-label">Trésorerie Nette</span>
            <div className="summary-value" style={{ fontSize: '1.6rem', marginTop: '6px', fontWeight: '800' }}>{formatCurrency(summary.usd.netBalance, 'USD')}</div>
            <div className="summary-value" style={{ fontSize: '1.2rem', marginTop: '4px', opacity: 0.85, fontWeight: '700' }}>{formatCurrency(summary.htg.netBalance, 'HTG')}</div>
          </div>
          <span className="summary-meta" style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Solde réel global de votre activité</span>
        </div>

        {/* Entrées */}
        <div className="glass-panel summary-card card-green card-hover-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="summary-label">Entrées encaissées</span>
            <div className="summary-value" style={{ fontSize: '1.6rem', marginTop: '6px', fontWeight: '800' }}>{formatCurrency(summary.usd.totalIncome, 'USD')}</div>
            <div className="summary-value" style={{ fontSize: '1.2rem', marginTop: '4px', opacity: 0.85, fontWeight: '700' }}>{formatCurrency(summary.htg.totalIncome, 'HTG')}</div>
          </div>
          <span className="summary-meta" style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Revenus professionnels facturés et perçus</span>
        </div>

        {/* Dépenses */}
        <div className="glass-panel summary-card card-rose card-hover-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="summary-label">Dépenses totales</span>
            <div className="summary-value" style={{ fontSize: '1.6rem', marginTop: '6px', fontWeight: '800' }}>{formatCurrency(summary.usd.totalExpenses, 'USD')}</div>
            <div className="summary-value" style={{ fontSize: '1.2rem', marginTop: '4px', opacity: 0.85, fontWeight: '700' }}>{formatCurrency(summary.htg.totalExpenses, 'HTG')}</div>
          </div>
          <span className="summary-meta" style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Frais de fonctionnement et d'outils</span>
        </div>

        {/* Factures en attente */}
        <div className="glass-panel summary-card card-amber card-hover-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="summary-label">Comptes à Recevoir</span>
            <div className="summary-value" style={{ fontSize: '1.6rem', marginTop: '6px', fontWeight: '800' }}>{formatCurrency(summary.usd.totalOutstanding, 'USD')}</div>
            <div className="summary-value" style={{ fontSize: '1.2rem', marginTop: '4px', opacity: 0.85, fontWeight: '700' }}>{formatCurrency(summary.htg.totalOutstanding, 'HTG')}</div>
          </div>
          <div className="summary-meta" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '10px', fontSize: '0.78rem' }}>
            {summary.usd.outstandingOverdue > 0 && <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Retard USD: {formatCurrency(summary.usd.outstandingOverdue, 'USD')}</span>}
            {summary.htg.outstandingOverdue > 0 && <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Retard HTG: {formatCurrency(summary.htg.outstandingOverdue, 'HTG')}</span>}
            {summary.usd.outstandingOverdue === 0 && summary.htg.outstandingOverdue === 0 && <span style={{ color: 'var(--text-muted)' }}>Aucun retard de paiement</span>}
          </div>
        </div>
      </section>

      {/* Dashboard Visual Layout */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '30px', flexWrap: 'wrap' }} className="responsive-container">
        
        {/* Left Column: Cashflow Chart & Invoices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Cashflow SVG Chart Card */}
          <div className="glass-panel" style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Flux de Trésorerie ({activeCurrency})
              </h3>
              
              {/* Currency Selector Chart Switcher */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <button
                  className="btn"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    background: activeCurrency === 'USD' ? 'var(--primary-glow)' : 'transparent',
                    borderColor: activeCurrency === 'USD' ? 'var(--primary)' : 'transparent',
                    color: '#ffffff',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveCurrency('USD')}
                >
                  USD ($)
                </button>
                <button
                  className="btn"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    background: activeCurrency === 'HTG' ? 'var(--primary-glow)' : 'transparent',
                    borderColor: activeCurrency === 'HTG' ? 'var(--primary)' : 'transparent',
                    color: '#ffffff',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveCurrency('HTG')}
                >
                  HTG (G)
                </button>
              </div>
            </div>
            
            {currentCashFlowData.length < 2 ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)' }}>
                Pas assez de données pour tracer le graphique ({activeCurrency}).
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%' }}>
                {/* SVG Visual */}
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
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
                          y={y + 4} 
                          fill="var(--text-dark)" 
                          fontSize="9" 
                          textAnchor="end"
                        >
                          {Math.round(val).toLocaleString('fr-FR')}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic gradients fill */}
                  <path d={incomeFillPath} fill="url(#incomeGrad)" />
                  <path d={expenseFillPath} fill="url(#expenseGrad)" />

                  {/* Active Line Plots */}
                  <path d={incomePath} fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={expensePath} fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* X Axis Labels */}
                  {currentCashFlowData.map((d, index) => {
                    const x = paddingLeft + (index / (currentCashFlowData.length - 1 || 1)) * innerWidth;
                    return (
                      <text 
                        key={index} 
                        x={x} 
                        y={chartHeight - 6} 
                        fill="var(--text-muted)" 
                        fontSize="9" 
                        textAnchor="middle"
                      >
                        {d.month.split('-')[1]}/{d.month.split('-')[0].slice(2)}
                      </text>
                    );
                  })}
                </svg>

                {/* Legends */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: 'var(--success)', display: 'inline-block' }}></span>
                    Entrées
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: 'var(--danger)', display: 'inline-block' }}></span>
                    Dépenses
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accounts Receivable Widget */}
          <div className="glass-panel" style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Factures en attente</h3>
              <Link href="/receivables" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
                Tout voir <ChevronRight size={16} />
              </Link>
            </div>

            {upcomingReceivables.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="empty-state-title">Toutes les factures sont payées</h4>
                <p className="empty-state-subtitle">
                  Félicitations ! Vous n'avez aucune facture en attente de recouvrement actuellement.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingReceivables.map((inv) => (
                  <div 
                    key={inv.id} 
                    className={`glass-panel ${inv.status === 'OVERDUE' ? 'pulse-overdue' : ''}`}
                    style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{inv.clientName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Facture #{inv.invoice_number} • {inv.projectName || 'Projet divers'}
                      </span>
                      <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', color: inv.status === 'OVERDUE' ? 'var(--danger)' : 'var(--text-muted)' }}>
                        <Clock size={12} /> Échéance: {formatLocalDateCompact(inv.due_date)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>
                        {formatCurrency(inv.amount, inv.currency)}
                      </span>
                      <span className={`badge ${inv.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}`}>
                        {inv.status === 'OVERDUE' ? 'En Retard' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ledger Activities & Active CRM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Quick Ledger Activities Feed */}
          <div className="glass-panel" style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Flux d'activité</h3>
              <Link href="/transactions" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
                Grand livre <ChevronRight size={16} />
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Clock size={28} />
                </div>
                <h4 className="empty-state-title">Aucune transaction</h4>
                <p className="empty-state-subtitle">
                  Enregistrez votre première opération financière manuellement ou en langage naturel.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentTransactions.map((t) => (
                  <div key={t.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: t.type === 'INCOME' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: t.type === 'INCOME' ? 'var(--success)' : 'var(--danger)',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {t.type === 'INCOME' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {t.category} • {formatLocalDateCompact(t.date)}
                      </span>
                    </div>

                    <div style={{
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      color: t.type === 'INCOME' ? 'var(--success)' : 'var(--text-main)',
                      flexShrink: 0
                    }}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clients & Projects Overview Quick links */}
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Vue d'ensemble CRM</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Link href="/clients" className="glass-panel card-hover-lift" style={{ padding: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Users size={20} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clients actifs</span>
                <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff' }}>{summary.totalClients}</span>
              </Link>
              <Link href="/projects" className="glass-panel card-hover-lift" style={{ padding: '16px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Briefcase size={20} color="var(--success)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Projets en cours</span>
                <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff' }}>{summary.activeProjects}</span>
              </Link>
            </div>
          </div>

          {/* Paramètres de sécurité */}
          <SecuritySettings />
        </div>
      </section>

      {/* Styled Grid Responsive Helper CSS */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .responsive-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
