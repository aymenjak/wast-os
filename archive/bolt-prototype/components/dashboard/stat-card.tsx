import { cn } from '@/lib/utils';
import {
  Trash2,
  Recycle,
  AlertCircle,
  CheckCircle2,
  Truck,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  sparkline: number[];
  positiveIsGood?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  trash2: Trash2,
  recycle: Recycle,
  alertCircle: AlertCircle,
  checkCircle2: CheckCircle2,
  truck: Truck,
  timer: Timer,
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({ label, value, change, trend, icon, sparkline, positiveIsGood = true }: StatCardProps) {
  const Icon = iconMap[icon] || AlertCircle;
  const isPositive = trend === 'up';
  const isGood = positiveIsGood ? isPositive : !isPositive;
  const trendColor = isGood ? 'text-success' : 'text-destructive';
  const sparkColor = isGood ? 'hsl(var(--success))' : 'hsl(var(--destructive))';

  return (
    <div className="group relative bg-card rounded-xl border border-border p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{value}</div>
      <div className="flex items-end justify-between mt-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Sparkline data={sparkline} color={sparkColor} />
      </div>
    </div>
  );
}
