'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Users, 
  Briefcase 
} from 'lucide-react';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Journal', href: '/transactions', icon: Receipt },
    { name: 'Factures', href: '/receivables', icon: FileText },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Projets', href: '/projects', icon: Briefcase },
  ];

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
              <div className="user-badge">
                <div className="user-avatar">CJ</div>
                <div className="user-info">
                  <span className="user-name">Dev User</span>
                  <span className="user-role">Software Engineer</span>
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

        {/* Register Service Worker */}
        <Script src="/register-sw.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
