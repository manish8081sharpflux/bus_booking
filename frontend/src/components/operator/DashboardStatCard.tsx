import React from 'react';

import {
  IonIcon,
} from '@ionic/react';

import '../../pages/operator/OperatorDashboardPage.css';

interface DashboardStatCardProps {
  title: string;

  value:
    | string
    | number;

  subtitle?: string;

  icon: string;

  variant?:
    | 'bus'
    | 'booking'
    | 'revenue'
    | 'occupancy';

  onClick?: () => void;

  loading?: boolean;
}

const DashboardStatCard:
React.FC<DashboardStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'bus',
  onClick,
  loading = false,
}) => {
  const Component =
    onClick
      ? 'button'
      : 'div';

  return (
    <Component
      {...(
        onClick
          ? {
              type:
                'button' as const,

              onClick,
            }
          : {}
      )}
      className={
        onClick
          ? 'operator-stat-card clickable'
          : 'operator-stat-card'
      }
    >

      <div className="operator-stat-top">

        <div>

          <p className="operator-stat-label">
            {title}
          </p>

          <h3 className="operator-stat-value">
            {loading
              ? '...'
              : value}
          </h3>

          {subtitle && (
            <p className="operator-stat-subtitle">
              {subtitle}
            </p>
          )}

        </div>

        <div
          className={
            `operator-stat-icon ${variant}`
          }
        >
          <IonIcon
            icon={icon}
          />
        </div>

      </div>

    </Component>
  );
};

export default DashboardStatCard;