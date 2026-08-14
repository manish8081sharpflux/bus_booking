import { BusFront, ChevronFirst } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';

export function SidebarHeader() {
  const { settings, storeOption } = useSettings();

  const handleToggleClick = () => {
    storeOption('layouts.demo1.sidebarCollapse', !settings.layouts.demo1.sidebarCollapse);
  };

  return (
    <div className="sidebar-header admin-sidebar-header hidden lg:flex items-center relative justify-between shrink-0">
      <Link to="/" className="admin-brand" aria-label="BusGo Admin dashboard">
        <span className="admin-brand-mark">
          <BusFront />
        </span>
        <span className="admin-brand-copy" data-slot="accordion-menu-title">
          <strong>BusGo</strong>
          <small>Admin Console</small>
        </span>
      </Link>

      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'admin-sidebar-toggle size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          settings.layouts.demo1.sidebarCollapse ? 'ltr:rotate-180' : 'rtl:rotate-180',
        )}
        aria-label="Toggle sidebar"
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
