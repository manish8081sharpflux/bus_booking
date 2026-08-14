import { Outlet } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BusFront, CheckCircle2, ShieldCheck } from 'lucide-react';

export function BrandedLayout() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-slate-50">
      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
              <BusFront className="size-6" />
            </div>
            <div><div className="text-2xl font-bold text-slate-950">BusGo</div><div className="text-sm text-slate-500">Administration Console</div></div>
          </div>
          <Card className="w-full border-slate-200 shadow-xl shadow-slate-200/60">
            <CardContent className="p-7 sm:p-9">
              <Outlet />
            </CardContent>
          </Card>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400 p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-slate-950/10" />
        <div className="relative">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><ShieldCheck className="size-8" /></div>
          <h2 className="max-w-lg text-4xl font-bold leading-tight">Run your bus network from one secure workspace.</h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-rose-50">Manage operators, approve vehicles, monitor trips and keep daily operations moving.</p>
        </div>
        <div className="relative grid gap-4 text-base">
          {['Role-based administrator access', 'Live operational visibility', 'Secure identity and audit controls'].map((label) => (
            <div key={label} className="flex items-center gap-3"><CheckCircle2 className="size-5" /><span>{label}</span></div>
          ))}
        </div>
      </aside>
    </div>
  );
}
