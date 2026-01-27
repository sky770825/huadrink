import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'purple';
}

const colorClasses = {
  default: 'bg-muted/50 text-foreground',
  gold: 'bg-primary/10 text-primary',
  green: 'bg-green-500/10 text-green-600',
  red: 'bg-red-500/10 text-red-600',
  blue: 'bg-blue-500/10 text-blue-600',
  purple: 'bg-purple-500/10 text-purple-600',
};

export function StatsCard({ title, value, icon: Icon, color = 'default' }: StatsCardProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="font-serif text-3xl font-semibold text-foreground">{value}</p>
        </div>
        <div className={cn('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
