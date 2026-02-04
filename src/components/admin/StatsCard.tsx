import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'purple';
  /** 點擊時觸發，設了就會變成可點擊卡片 */
  onClick?: () => void;
}

const colorClasses = {
  default: 'bg-muted/50 text-foreground',
  gold: 'bg-primary/10 text-primary',
  green: 'bg-green-500/10 text-green-600',
  red: 'bg-red-500/10 text-red-600',
  blue: 'bg-blue-500/10 text-blue-600',
  purple: 'bg-purple-500/10 text-purple-600',
};

export function StatsCard({ title, value, icon: Icon, color = 'default', onClick }: StatsCardProps) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="font-serif text-2xl font-semibold text-foreground leading-tight">{value}</p>
      </div>
      <div className={cn('p-3 rounded-xl', colorClasses[color])}>
        <Icon className="w-6 h-6" strokeWidth={1.5} />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="glass-card rounded-xl p-4 text-left w-full hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        title={`點擊篩選「${title}」`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4">
      {content}
    </div>
  );
}
