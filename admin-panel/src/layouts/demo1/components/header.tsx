import { useEffect, useState } from 'react';
import { Bell, BusFront, Menu, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/auth/context/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { SearchDialog } from '@/partials/dialogs/search/search-dialog';
import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { SidebarMenu } from './sidebar-menu';
import { Breadcrumb } from './breadcrumb';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const mobileMode = useIsMobile();
  const headerSticky = useScrollPosition() > 0;

  useEffect(() => {
    setIsSidebarSheetOpen(false);
  }, [pathname]);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.trim() || 'A';
  const displayName = user?.fullname || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Administrator';

  return (
    <header className={cn('header admin-header fixed top-0 z-10 start-0 end-0', headerSticky && 'admin-header-sticky')}>
      <Container width="fluid" className="admin-header-inner">
        <div className="admin-header-left">
          {mobileMode && (
            <Sheet open={isSidebarSheetOpen} onOpenChange={setIsSidebarSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" mode="icon" className="admin-header-icon" aria-label="Open navigation">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent className="p-0 gap-0 w-[286px] admin-mobile-sidebar" side="left" close={false}>
                <SheetHeader className="admin-mobile-brand">
                  <BusFront />
                  <div><strong>BusGo</strong><small>Admin Console</small></div>
                </SheetHeader>
                <SheetBody className="p-0 overflow-y-auto">
                  <SidebarMenu />
                </SheetBody>
              </SheetContent>
            </Sheet>
          )}

          <div className="admin-header-context">
            <Breadcrumb />
          </div>
        </div>

        <div className="admin-header-actions">
          {!mobileMode && (
            <SearchDialog
              trigger={
                <Button variant="ghost" mode="icon" shape="circle" className="admin-header-icon" aria-label="Search">
                  <Search />
                </Button>
              }
            />
          )}

          <NotificationsSheet
            trigger={
              <Button variant="ghost" mode="icon" shape="circle" className="admin-header-icon admin-notification-button" aria-label="Notifications">
                <Bell />
                <span className="admin-notification-dot" />
              </Button>
            }
          />

          <UserDropdownMenu
            trigger={
              <button className="admin-profile-trigger" type="button">
                <span className="admin-profile-avatar">{initials}</span>
                {!mobileMode && (
                  <span className="admin-profile-copy">
                    <strong>{displayName}</strong>
                    <small>{user?.role || (user?.is_admin ? 'ADMIN' : 'USER')}</small>
                  </span>
                )}
              </button>
            }
          />
        </div>
      </Container>
    </header>
  );
}
