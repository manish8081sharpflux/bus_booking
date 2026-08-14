import {
  Bus,
  CalendarDays,
  IndianRupee,
  TicketCheck,
  UserCheck,
  Users,
} from 'lucide-react';

const stats = [
  {
    title: 'Total Operators',
    value: '—',
    description: 'Registered bus operators',
    icon: Users,
  },
  {
    title: 'Active Buses',
    value: '—',
    description: 'Currently active vehicles',
    icon: Bus,
  },
  {
    title: "Today's Trips",
    value: '—',
    description: 'Scheduled for today',
    icon: CalendarDays,
  },
  {
    title: "Today's Bookings",
    value: '—',
    description: 'Confirmed today',
    icon: TicketCheck,
  },
  {
    title: 'Revenue',
    value: '—',
    description: 'Gross booking value',
    icon: IndianRupee,
  },
  {
    title: 'Pending Approvals',
    value: '—',
    description: 'Operators awaiting review',
    icon: UserCheck,
  },
];

export function DashboardStats() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-5 lg:gap-7.5">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div key={stat.title} className="card">
            <div className="card-body p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </span>

                  <span className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </span>

                  <span className="text-xs text-gray-500">
                    {stat.description}
                  </span>
                </div>

                <div className="flex items-center justify-center size-10 rounded-lg bg-gray-100">
                  <Icon className="size-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}