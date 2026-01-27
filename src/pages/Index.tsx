import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Diamond, ArrowRight, CalendarDays, Clock, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EVENT_INFO } from '@/lib/constants';

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
};

export default function Index() {
  const [countdown, setCountdown] = useState<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const deadline = new Date(EVENT_INFO.deadline).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setCountdown((prev) => ({ ...prev, isExpired: true }));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen marble-bg">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 space-y-12 lg:space-y-20">
        {/* Hero Section */}
        <section className="max-w-3xl mx-auto text-center animate-fade-in-up px-2 sm:px-0">
          {/* Diamond Icon */}
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-full bg-primary/10 backdrop-blur-sm shadow-gold/40">
              <Diamond className="w-12 h-12 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-4 leading-tight">
            {EVENT_INFO.title}
          </h1>

          {/* Gold Line */}
          <div className="gold-line max-w-xs mx-auto my-8" />

          {/* Event Details */}
          <div className="space-y-2 mb-8">
            <p className="flex items-center justify-center gap-2 text-base sm:text-lg md:text-xl text-muted-foreground font-light">
              <CalendarDays className="w-5 h-5 text-primary/80" />
              {EVENT_INFO.date}
            </p>
            <p className="flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg text-muted-foreground font-light">
              <Clock className="w-5 h-5 text-primary/80" />
              {EVENT_INFO.checkInTime} 入場｜{EVENT_INFO.startTime} 正式開始
            </p>
          </div>

          {/* CTA Button + Countdown */}
          <div className="flex flex-col items-center gap-4">
            <Link to="/register">
              <Button size="lg" className="group gap-2 px-8 py-5 md:py-6 text-base md:text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold">
                立即報名
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            {/* Deadline Notice + Countdown */}
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <p>
                報名截止：
                <span className="text-primary font-medium"> {EVENT_INFO.deadlineDisplay}</span>
              </p>

              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/70 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm shadow-sm">
                <span className="text-primary font-semibold tracking-wide">倒數</span>
                {countdown.isExpired ? (
                  <span className="text-destructive font-medium">報名已截止</span>
                ) : (
                  <span className="tabular-nums tracking-wide">
                    {countdown.days} 天 {countdown.hours.toString().padStart(2, '0')} 時{' '}
                    {countdown.minutes.toString().padStart(2, '0')} 分{' '}
                    {countdown.seconds.toString().padStart(2, '0')} 秒
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Highlight Section */}
        <section className="max-w-5xl mx-auto px-1 sm:px-0">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-background/70 p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-gold/40 transition-transform">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">菁英人脈交流</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                匯聚華地產鑽石分會夥伴與貴賓，一晚建立高品質人脈，創造未來合作機會。
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-gold/40 transition-transform">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">溫馨春酒氛圍</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                以優雅場地與精緻餐點，陪你一起回顧今年成果、迎接新一年的豐盛。
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/70 p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-gold/40 transition-transform">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                <Diamond className="w-5 h-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">專屬鑽石時刻</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                精心設計的互動與橋段，只為讓每一位嘉賓都感受到被看見與被重視。
              </p>
            </div>
          </div>
        </section>

        {/* Timeline / Agenda Section */}
        <section className="max-w-4xl mx-auto px-1 sm:px-0">
          <div className="mb-6 text-left sm:text-center">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">當晚流程一覽</h2>
            <p className="text-sm text-muted-foreground">
              讓你清楚掌握每個重要時刻，安心安排當天行程。
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 md:gap-5">
            <div className="rounded-2xl border border-white/10 bg-background/80 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
              <div className="md:w-40">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs md:text-sm font-medium text-primary tabular-nums">
                  17:30–18:00
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm md:text-base font-semibold mb-1">賓客入場｜迎賓交流</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  報到、拍照與輕鬆交流，暖身建立第一波連結。
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/80 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
              <div className="md:w-40">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs md:text-sm font-medium text-primary tabular-nums">
                  18:30
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm md:text-base font-semibold mb-1">春酒正式開始</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  開場致詞、貴賓介紹，讓每位來賓都被隆重迎接。
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/80 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
              <div className="md:w-40">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs md:text-sm font-medium text-primary">
                  晚間時段
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm md:text-base font-semibold mb-1">餐敘交流＆精彩橋段</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  精緻餐點、互動環節與感謝時刻，在輕鬆氛圍中拉近彼此距離。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="max-w-3xl mx-auto text-center pb-6 px-2 sm:px-0">
          <div className="rounded-3xl border border-primary/20 bg-background/80 px-5 py-7 md:px-10 md:py-10 shadow-gold/40">
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-primary">
              限定席次・報名即將截止
            </p>
            <h2 className="mb-4 font-serif text-2xl md:text-3xl text-foreground">
              想在 2026 啟動更好的連結，就從這一晚開始。
            </h2>
            <p className="mb-6 text-sm md:text-base text-muted-foreground">
              如果你期待拓展人脈、加深夥伴關係，這場春酒會是很值得記錄的一晚。
            </p>

            <div className="flex flex-col items-center gap-3">
              <Link to="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="group gap-2 border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  立即保留你的席次
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              {!countdown.isExpired && (
                <p className="text-xs text-muted-foreground">
                  報名倒數 {countdown.days} 天 {countdown.hours.toString().padStart(2, '0')} 時{' '}
                  {countdown.minutes.toString().padStart(2, '0')} 分
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
