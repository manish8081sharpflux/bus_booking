import {
  Bell,
  BadgePercent,
  BusFront,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Headphones,
  Activity,
  BarChart3,
  CircleDollarSign,
  History,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Ticket,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { type MenuConfig } from './types';

export const MENU_SIDEBAR: MenuConfig = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { heading: 'Operator Management' },
  {
    title: 'Operators',
    icon: Users,
    children: [
      { title: 'All Operators', path: '/account/members/operators' },
      { title: 'Add Operator', icon: UserPlus, path: '/account/members/add-operator' },
    ],
  },
  { heading: 'Platform Operations' },
  {
    title: 'Buses',
    icon: BusFront,
    children: [
      { title: 'All Buses', path: '/admin/buses' },
      { title: 'Verification Queue', icon: ClipboardCheck, path: '/bus-verification' },
    ],
  },
  { title: 'Trips', icon: CalendarDays, children: [
    { title: 'All Trips', path: '/admin/trips' },
    { title: 'Live Trips', icon: Activity, path: '/admin/live-trips' },
  ] },
  { title: 'Bookings', icon: Ticket, path: '/admin/bookings' },
  { title: 'Payments & Refunds', icon: CreditCard, path: '/admin/payments' },
  { title: 'Offers & Coupons', icon: BadgePercent, path: '/admin/promotions' },
  { title: 'Settlements', icon: CircleDollarSign, path: '/admin/settlements' },
  { title: 'Reports & Analytics', icon: BarChart3, path: '/admin/reports' },
  { heading: 'Administration' },
  {
    title: 'Users & Roles',
    icon: UserCog,
    children: [
      { title: 'Users', path: '/account/members/users' },
      { title: 'Team Members', path: '/account/members/team-members' },
      { title: 'Roles', path: '/account/members/roles' },
      { title: 'Permissions', path: '/account/members/permissions-toggle' },
    ],
  },
  { title: 'Notifications', icon: Bell, path: '/account/notifications' },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'Company Profile', path: '/account/home/company-profile' },
      { title: 'API Keys', path: '/account/api-keys' },
      { title: 'Integrations', path: '/account/integrations' },
    ],
  },
  { title: 'Admin Access', icon: ShieldCheck, path: '/account/security/overview' },
  { title: 'Help & Support', icon: Headphones, path: '/admin/support' },
  { title: 'Audit Logs', icon: History, path: '/admin/audit-logs' },
];

export const MENU_SIDEBAR_CUSTOM: MenuConfig = MENU_SIDEBAR;
export const MENU_SIDEBAR_COMPACT: MenuConfig = MENU_SIDEBAR;
export const MENU_MEGA: MenuConfig = MENU_SIDEBAR;
export const MENU_MEGA_MOBILE: MenuConfig = MENU_SIDEBAR;
export const MENU_HELP: MenuConfig = [];
