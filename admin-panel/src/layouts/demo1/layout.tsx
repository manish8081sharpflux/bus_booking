import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { useMenu } from '@/hooks/use-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/providers/settings-provider';
import { Header } from './components/header';
import { Sidebar } from './components/sidebar';

export function Demo1Layout() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { menu } = useAuth();
  const { getCurrentItem } = useMenu(pathname);
  const item = getCurrentItem(menu);
  const { settings, setOption } = useSettings();

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapse', settings.layouts.demo1.sidebarCollapse);
  }, [settings.layouts.demo1.sidebarCollapse]);

  useEffect(() => {
    setOption('layout', 'demo1');
  }, [setOption]);

  useEffect(() => {
    const bodyClass = document.body.classList;
    bodyClass.add('demo1', 'sidebar-fixed', 'header-fixed', 'admin-app');
    const timer = window.setTimeout(() => bodyClass.add('layout-initialized'), 50);

    return () => {
      bodyClass.remove('demo1', 'sidebar-fixed', 'sidebar-collapse', 'header-fixed', 'layout-initialized', 'admin-app');
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>{item?.title ? `${item.title} · BusGo Admin` : 'BusGo Admin'}</title>
      </Helmet>

      {!isMobile && <Sidebar />}

      <div className="wrapper admin-wrapper flex grow flex-col">
        <Header />
        <main className="admin-main grow" role="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
