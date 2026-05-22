'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Users, 
  Briefcase,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import BiometricLock from '@/app/components/BiometricLock';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Journal', href: '/transactions', icon: Receipt },
    { name: 'Factures', href: '/receivables', icon: FileText },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Projets', href: '/projects', icon: Briefcase },
    { name: 'Statistiques', href: '/statistics', icon: BarChart3 },
  ];

  useEffect(() => {
    checkSecurityStatus();
  }, []);

  async function checkSecurityStatus() {
    try {
      const res = await fetch('/api/auth/biometric/pin');
      if (res.ok) {
        const data = await res.json();
        setIsLocked(!data.isUnlocked);
      }
    } catch (err) {
      console.error('Erreur validation sécurité layout:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <html lang="fr">
      <head>
        <title>DevFinance - Track & Profit</title>
        <meta name="description" content="Premium finance tracker for software engineers" />
        
        {/* PWA & Mobile Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#080C14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DevFinance" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {loading ? (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#04060a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999
          }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
          </div>
        ) : isLocked ? (
          <BiometricLock onUnlockSuccess={() => setIsLocked(false)} />
        ) : (
          <div className="app-container">
            {/* Primary Sidebar (Desktop Navigation) */}
            <aside className="sidebar">
              <div>
                <div className="brand-section">
                  <div className="brand-icon-wrapper">
                    <img src="/icon-192.png" alt="Logo" className="brand-icon" />
                  </div>
                  <span className="brand-name">DevFinance</span>
                </div>
                
                <ul className="nav-menu">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name} className="nav-item">
                        <Link 
                          href={item.href} 
                          className={`nav-link ${isActive ? 'active' : ''}`}
                        >
                          <Icon />
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div className="sidebar-footer">
                <div className="user-badge" style={{ cursor: 'pointer' }} onClick={async () => {
                  if (confirm('Voulez-vous verrouiller votre session immédiatement ?')) {
                    await fetch('/api/auth/biometric/pin', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'lock' }),
                    });
                    setIsLocked(true);
                  }
                }}>
                  <div className="user-avatar">CJ</div>
                  <div className="user-info">
                    <span className="user-name">Dev User</span>
                    <span className="user-role">Verrouiller la session</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Bottom Navigation (Mobile PWA Shell) */}
            <nav className="bottom-nav">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href} 
                    className={`bottom-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Main Canvas */}
            <main className="main-content">
              {children}
            </main>
          </div>
        )}

        {/* Register Service Worker */}
        <Script src="/register-sw.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
