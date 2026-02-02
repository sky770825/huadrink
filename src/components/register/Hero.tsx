import { EVENT_INFO } from '@/lib/constants';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Diamond } from 'lucide-react';

/** 將 ISO 截止時間轉成前台顯示用：M/D（週X，含） */
function formatDeadlineDisplay(deadline: string): string {
  if (!deadline) return EVENT_INFO.deadlineDisplay;
  const d = new Date(deadline);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekdays[d.getDay()];
  return `${m}/${day}（週${w}，含）`;
}

export function Hero() {
  const { data: settings } = useSystemSettings();
  const deadlineDisplay = settings?.deadline ? formatDeadlineDisplay(settings.deadline) : EVENT_INFO.deadlineDisplay;

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

        {/* Deadline Notice（與後台系統設定同步） */}
        <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/5 border border-primary/20 animate-fade-in-delay">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-foreground/80">
            <span className="font-medium text-primary">{deadlineDisplay}</span>
            {' '}前完成報名才算完成定案
          </span>
        </div>
      </div>
    </section>
  );
}
