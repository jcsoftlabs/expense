if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Service worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.error('[SW] Service worker registration failed:', err);
      });
  });
}
