import { useState, useEffect, useCallback } from 'react';
import api from './api';

const STORAGE_KEY = 'sentrix_client_portal_enabled';

export function useClientPortalStatus() {
  const [clientServicesEnabled, setClientServicesEnabled] = useState<boolean>(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached !== null ? cached === 'true' : true;
  });
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/service-orders/portal-status');
      if (res.data && typeof res.data.enabled === 'boolean') {
        const isEnabled = res.data.enabled;
        setClientServicesEnabled(isEnabled);
        localStorage.setItem(STORAGE_KEY, String(isEnabled));
      }
    } catch (err) {
      // Keep cached value
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial check
    fetchStatus();

    // 2. Refresh on window focus (when user switches tabs or returns to window)
    const handleFocus = () => {
      fetchStatus();
    };

    // 3. Listen to localStorage changes across browser tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setClientServicesEnabled(e.newValue === 'true');
      }
    };

    // 4. Custom event for immediate same-window updates
    const handleCustomEvent = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setClientServicesEnabled(e.detail.enabled);
      }
    };

    // 5. Periodic sync (every 3 seconds) for instant sync across tabs and role switches
    const interval = setInterval(fetchStatus, 3000);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('client-portal-status-changed', handleCustomEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('client-portal-status-changed', handleCustomEvent);
    };
  }, [fetchStatus]);

  return { clientServicesEnabled, loadingStatus, refreshStatus: fetchStatus };
}

export function broadcastPortalStatus(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent('client-portal-status-changed', { detail: { enabled } }));
}
