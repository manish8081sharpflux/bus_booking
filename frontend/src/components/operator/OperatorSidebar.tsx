import React from 'react';

import {
  IonIcon,
} from '@ionic/react';

import {
  busOutline,
  calendarOutline,
  cashOutline,
  gridOutline,
  peopleOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  swapHorizontalOutline,
  ticketOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useLocation,
} from 'react-router-dom';

import '../../pages/operator/OperatorDashboardPage.css';

interface OperatorSidebarProps {
  operatorName?: string;
  operatorId?: string | null;
}

interface MenuItem {
  label: string;
  path: string;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/operator/dashboard',
    icon: gridOutline,
  },
  {
    label: 'Buses',
    path: '/operator/buses',
    icon: busOutline,
  },
  {
    label: 'Routes',
    path: '/operator/routes',
    icon: swapHorizontalOutline,
  },
  {
    label: 'Trips',
    path: '/operator/trips',
    icon: calendarOutline,
  },
  {
    label: 'Bookings',
    path: '/operator/bookings',
    icon: ticketOutline,
  },
  {
    label: 'Earnings',
    path: '/operator/earnings',
    icon: cashOutline,
  },
  {
    label: 'Staff',
    path: '/operator/staff',
    icon: peopleOutline,
  },
  {
    label: 'Policies',
    path: '/operator/policies',
    icon: shieldCheckmarkOutline,
  },
  {
    label: 'Settings',
    path: '/operator/settings',
    icon: settingsOutline,
  },
];

const OperatorSidebar:
React.FC<OperatorSidebarProps> = ({
  operatorName = 'Bus Operator',
  operatorId,
}) => {
  const history =
    useHistory();

  const location =
    useLocation();

  const initial =
    operatorName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    'O';

  const shortOperatorId =
    operatorId
      ? operatorId.slice(
          0,
          8,
        )
      : null;

  const isActive = (
    path: string,
  ) => {
    if (
      path ===
      '/operator/dashboard'
    ) {
      return (
        location.pathname ===
        '/operator/dashboard'
      );
    }

    if (
      path ===
      '/operator/buses'
    ) {
      return (
        location.pathname.startsWith(
          '/operator/buses',
        )
      );
    }

    if (
      path ===
      '/operator/routes'
    ) {
      return (
        location.pathname.startsWith(
          '/operator/routes',
        )
      );
    }

    if (path === '/operator/trips') {
      return (
        location.pathname.startsWith(
          '/operator/trips',
        )
      );
    }

    return (
      location.pathname.startsWith(
        path,
      )
    );
  };

  return (
    <aside className="operator-sidebar">

      <div className="operator-sidebar-brand">

        <div className="operator-sidebar-logo">
          <IonIcon
            icon={busOutline}
          />
        </div>

        <div>
          <h1 className="operator-sidebar-title">
            BusGo
          </h1>

          <p className="operator-sidebar-subtitle">
            Operator Console
          </p>
        </div>

      </div>

      <nav className="operator-sidebar-menu">

        {MENU_ITEMS.map(
          (
            item,
          ) => {
            const active =
              isActive(
                item.path,
              );

            return (
              <button
                key={
                  item.path
                }
                type="button"
                onClick={() =>
                  history.push(
                    item.path,
                  )
                }
                className={
                  active
                    ? 'operator-sidebar-item active'
                    : 'operator-sidebar-item'
                }
              >
                <IonIcon
                  icon={
                    item.icon
                  }
                />

                <span>
                  {item.label}
                </span>
              </button>
            );
          },
        )}

      </nav>

      <div className="operator-sidebar-footer">

        <div className="operator-sidebar-profile">

          <div className="operator-sidebar-avatar">
            {initial}
          </div>

          <div className="operator-sidebar-profile-info">

            <p className="operator-sidebar-profile-name">
              {operatorName}
            </p>

            <p className="operator-sidebar-profile-id">
              {shortOperatorId
                ? `ID: ${shortOperatorId}`
                : 'Operator account'}
            </p>

          </div>

        </div>

      </div>

    </aside>
  );
};

export default OperatorSidebar;
