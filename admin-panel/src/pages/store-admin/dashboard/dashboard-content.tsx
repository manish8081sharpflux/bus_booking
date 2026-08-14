import { DashboardStats } from './components/dashboard-stats';
// import { BookingTrend } from './components/booking-trend';
// import { RevenueTrend } from './components/revenue-trend';
// import { RecentBookings } from './components/recent-bookings';
// import { PendingOperators } from './components/pending-operators';
// import { OperationalAlerts } from './components/operational-alerts';

export function DashboardContent() {
  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      <DashboardStats />

      {/* <div className="grid lg:grid-cols-2 gap-5 lg:gap-7.5">
        <BookingTrend />
        <RevenueTrend />
      </div>

      <RecentBookings />

      <div className="grid lg:grid-cols-2 gap-5 lg:gap-7.5">
        <PendingOperators />
        <OperationalAlerts />
      </div> */}
    </div>
  );
}