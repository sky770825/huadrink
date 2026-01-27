import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEPS } from '@/lib/constants';

interface StepperProps {
  currentStep: number;
}

export function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, index) => (
        <div key={step.number} className="flex items-center">
          {/* Step Circle */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'stepper-step font-serif text-lg font-semibold',
                currentStep === step.number && 'stepper-step-active',
                currentStep > step.number && 'stepper-step-completed',
                currentStep < step.number && 'stepper-step-pending'
              )}
            >
              {currentStep > step.number ? (
                <Check className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'mt-2 text-xs font-medium tracking-wide hidden sm:block',
                currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.title}
            </span>
          </div>

          {/* Connector Line */}
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                'w-12 md:w-20 h-px mx-2 transition-colors duration-300',
                currentStep > step.number ? 'bg-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
