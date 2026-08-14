'use client';

import { JSX, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { MenuConfig, MenuItem } from '@/config/types';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';

export function SidebarMenu() {
  const { pathname } = useLocation();
  const { menu, menuLoading } = useAuth();

  const matchPath = useCallback(
    (path: string): boolean => path === pathname || (path.length > 1 && pathname.startsWith(`${path}/`)),
    [pathname],
  );

  const classNames: AccordionMenuClassNames = {
    root: 'admin-menu-root',
    group: 'admin-menu-group',
    label: 'admin-menu-label',
    separator: 'admin-menu-separator',
    item: 'admin-menu-item',
    sub: 'admin-menu-sub',
    subTrigger: 'admin-menu-sub-trigger',
    subContent: 'admin-menu-sub-content',
    subWrapper: 'admin-menu-sub-wrapper',
    indicator: 'admin-menu-indicator',
  };

  const buildMenu = (items: MenuConfig): JSX.Element[] =>
    items.map((item: MenuItem, index: number) => {
      if (item.heading) return <AccordionMenuLabel key={`heading-${index}`}>{item.heading}</AccordionMenuLabel>;
      if (item.disabled) return buildDisabled(item, index);
      return buildRoot(item, index);
    });

  const buildRoot = (item: MenuItem, index: number): JSX.Element => {
    if (item.children?.length) {
      const value = item.path || `root-${index}`;
      return (
        <AccordionMenuSub key={value} value={value}>
          <AccordionMenuSubTrigger>
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent type="single" collapsible parentValue={value}>
            <AccordionMenuGroup>{buildChildren(item.children, index)}</AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    return (
      <AccordionMenuItem key={item.path || index} value={item.path || ''}>
        <Link to={item.path || '#'}>
          {item.icon && <item.icon data-slot="accordion-menu-icon" />}
          <span data-slot="accordion-menu-title">{item.title}</span>
        </Link>
      </AccordionMenuItem>
    );
  };

  const buildChildren = (items: MenuConfig, parentIndex: number): JSX.Element[] =>
    items.map((item, index) => {
      if (item.disabled) return buildDisabled(item, Number(`${parentIndex}${index}`));
      if (item.children?.length) return buildRoot(item, Number(`${parentIndex}${index}`));

      return (
        <AccordionMenuItem key={item.path || `${parentIndex}-${index}`} value={item.path || ''}>
          <Link to={item.path || '#'}>
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    });

  const buildDisabled = (item: MenuItem, index: number): JSX.Element => (
    <AccordionMenuItem key={`disabled-${index}`} value={`disabled-${index}`} disabled>
      {item.icon && <item.icon data-slot="accordion-menu-icon" />}
      <span data-slot="accordion-menu-title">{item.title}</span>
      <Badge variant="secondary" size="sm" className="ms-auto">Soon</Badge>
    </AccordionMenuItem>
  );

  return (
    <div className="admin-sidebar-scroll kt-scrollable-y-hover">
      {menuLoading ? <div className="admin-menu-loading">Loading navigation…</div> : null}
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(menu)}
      </AccordionMenu>
    </div>
  );
}
