import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-slate-800 bg-slate-900/60 text-slate-100',
    success: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100',
    warning: 'border-amber-500/30 bg-amber-950/20 text-amber-100',
    danger: 'border-rose-500/30 bg-rose-950/20 text-rose-100',
  };

  const iconColors = {
    default: 'text-teal-400 bg-teal-500/10',
    success: 'text-emerald-400 bg-emerald-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    danger: 'text-rose-400 bg-rose-500/10',
  };

  return (
    <div className={`p-5 rounded-xl border backdrop-blur-sm shadow-sm transition-all ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconColors[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
