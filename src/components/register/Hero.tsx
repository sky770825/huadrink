import { EVENT_INFO } from '@/lib/constants';
import { Diamond } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative hero-gradient py-16 md:py-24 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-t from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="container max-w-4xl mx-auto px-4 text-center">
        {/* Diamond Icon */}
        <div className="flex justify-center mb-6 animate-fade-in">
          <div className="p-3 rounded-full bg-primary/10">
            <Diamond className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-4 animate-fade-in-up">
          {EVENT_INFO.title}
        </h1>

        {/* Gold Line */}
        <div className="gold-line max-w-xs mx-auto my-6 animate-fade-in-delay" />

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground mb-2 animate-fade-in-up font-light tracking-wide">
          {EVENT_INFO.date}
        </p>
        <p className="text-base md:text-lg text-muted-foreground animate-fade-in-up font-light">
          {EVENT_INFO.checkInTime} 入場｜{EVENT_INFO.startTime} 正式開始
        </p>

        {/* Deadline Notice */}
        <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/5 border border-primary/20 animate-fade-in-delay">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-foreground/80">
            <span className="font-medium text-primary">{EVENT_INFO.deadlineDisplay}</span>
            {' '}前完成報名才算完成定案
          </span>
        </div>
      </div>
    </section>
  );
}
