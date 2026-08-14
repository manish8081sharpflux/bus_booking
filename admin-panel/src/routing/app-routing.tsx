import { useEffect, useRef } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useLocation } from 'react-router-dom';
import { useLoadingBar } from 'react-top-loading-bar';
import { AppRoutingSetup } from './app-routing-setup';

export function AppRouting() {
  const { verify, setLoading } = useAuth();
  const location = useLocation();
  const initializedRef = useRef(false);

  const { start, complete } = useLoadingBar({
    color: 'var(--color-primary)',
    shadow: false,
    waitingTime: 250,
    transitionTime: 180,
    height: 2,
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void verify().finally(() => setLoading(false));
  }, [setLoading, verify]);

  useEffect(() => {
    start('static');
    const frame = window.requestAnimationFrame(() => {
      complete();
      if (!window.location.hash) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [complete, location.pathname, location.search, start]);

  return <AppRoutingSetup />;
}
