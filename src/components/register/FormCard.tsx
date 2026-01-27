import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormCardProps {
  children: ReactNode;
  className?: string;
}

export function FormCard({ children, className }: FormCardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-6 md:p-8 lg:p-10 animate-fade-in-up',
        className
      )}
    >
      {children}
    </div>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
