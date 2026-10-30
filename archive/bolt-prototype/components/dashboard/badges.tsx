import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ label, className, dot = true }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap',
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}

interface PriorityBadgeProps {
  label: string;
  className?: string;
}

export function PriorityBadge({ label, className }: PriorityBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap',
      className
    )}>
      {label}
    </span>
  );
}

export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn('h-2 rounded-full bg-muted overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', barClassName || 'bg-primary')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
