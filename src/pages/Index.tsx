import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Diamond, ArrowRight, CalendarDays, Clock, Users, Star, MapPin, Car, ExternalLink, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prefetchPaymentEligible } from '@/hooks/useRegistrations';
import { prefetchInternalMembers } from '@/hooks/useMembers';
import { Progress } from '@/components/ui/progress';
import { EVENT_INFO, EVENT_CAPACITY, VENUE_INFO } from '@/lib/constants';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useRegistrationStats } from '@/hooks/useRegistrations';
import { formatDeadlineDisplay } from '@/lib/utils';

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
};

function CountdownUnit({ value, label, pad = 0 }: { value: number; label: string; pad?: number }) {
  const display = pad ? value.toString().padStart(pad, '0') : value.toString();
  return (
    <div className="flex flex-col items-center min-w-[2.75rem] px-2 py-1.5 rounded-lg bg-background/80 border border-primary/10">
      <span className="font-serif text-lg font-semibold tabular-nums text-primary leading-none">{display}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export default function Index() {
  const queryClient = useQueryClient();
  const { data: settings } = useSystemSettings();
  const onPaymentLinkHover = useCallback(() => {
    prefetchPaymentEligible(queryClient);
    prefetchInternalMembers(queryClient);
  }, [queryClient]);
  const stats = useRegistrationStats();
  const deadlineSource = settings?.deadline || EVENT_INFO.deadline;
  const deadlineDisplay = (settings?.deadline ? formatDeadlineDisplay(settings.deadline) : null) ?? EVENT_INFO.deadlineDisplay;

  const totalFilled = stats.totalHeadcount;
  const remaining = Math.max(0, EVENT_CAPACITY - totalFilled);
  const externalAndVip = stats.external + stats.vip;
  const progressPercent = Math.min(100, (totalFilled / EVENT_CAPACITY) * 100);

  const [countdown, setCountdown] = useState<CountdownState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const deadlineMs = new Date(deadlineSource).getTime();
    if (!deadlineSource || Number.isNaN(deadlineMs)) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = deadlineMs - now;

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
  }, [deadlineSource]);

  return (
    <div className="min-h-screen marble-bg flex flex-col overflow-x-hidden">
      <main className="container mx-auto flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 space-y-10 lg:space-y-16">
        {/* 首屏一體：標題、時間、按鈕、截止／倒數、邀約進度同一張卡，減少框架感 */}
        <section className="max-w-3xl mx-auto text-center animate-fade-in-up px-2 sm:px-0 min-w-0">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-background/95 px-5 py-8 sm:px-10 sm:py-10 shadow-soft">
            <div className="p-3 rounded-full bg-primary/10 inline-flex mb-6">
              <Diamond className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-semibold text-foreground mb-3 leading-tight break-words">
              {EVENT_INFO.title}
            </h1>
            <div className="gold-line max-w-xs mx-auto my-6" />
            <p className="flex items-center justify-center gap-2 text-lg sm:text-xl text-muted-foreground font-light">
              <CalendarDays className="w-5 h-5 text-primary/80 shrink-0" />
              {EVENT_INFO.date}
            </p>
            <p className="flex items-center justify-center gap-2 text-base sm:text-lg text-muted-foreground font-light mt-1">
              <Clock className="w-5 h-5 text-primary/80 shrink-0" />
              {EVENT_INFO.checkInTime} 入場｜{EVENT_INFO.startTime} 正式開始
            </p>

            {/* 先情境：邀約進度與剩餘名額，再行動：報名／繳費／截止 */}
            <div className="mt-8 pt-6 border-t border-primary/10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">邀約進度</h2>
              </div>
              <p className="text-center text-xs sm:text-sm text-muted-foreground mb-4">內外部成員與剩餘名額即時更新</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="rounded-lg bg-background/70 border border-primary/10 px-3 py-2.5 sm:px-4 sm:py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-primary/90 mb-0.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">內部夥伴</span>
                  </div>
                  <p className="font-serif text-xl sm:text-2xl font-semibold tabular-nums text-foreground">{stats.internal}</p>
                  <p className="text-[10px] text-muted-foreground">人</p>
                </div>
                <div className="rounded-lg bg-background/70 border border-primary/10 px-3 py-2.5 sm:px-4 sm:py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-primary/90 mb-0.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">外部／來賓</span>
                  </div>
                  <p className="font-serif text-xl sm:text-2xl font-semibold tabular-nums text-foreground">{externalAndVip}</p>
                  <p className="text-[10px] text-muted-foreground">人</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                  <span className="text-muted-foreground">已報名</span>
                  <span className="font-semibold tabular-nums text-foreground">{totalFilled} / {EVENT_CAPACITY} 人</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 transition-all duration-700 ease-out" />
              </div>
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-primary/90 mb-0.5">剩餘名額</p>
                <p className="font-serif text-3xl sm:text-4xl font-bold tabular-nums text-primary">{remaining} <span className="text-sm font-normal text-muted-foreground">人</span></p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-primary/10 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="group gap-2 px-8 py-5 text-base md:text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold">
                  立即報名
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/payment" onMouseEnter={onPaymentLinkHover}>
                <Button size="lg" variant="outline" className="gap-2 px-8 py-5 text-base md:text-lg border-primary/40 hover:bg-primary/10">
                  繳費付款
                </Button>
              </Link>
              <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base">
                <span className="text-muted-foreground whitespace-nowrap">報名截止</span>
                <span className="font-serif font-semibold text-foreground">{deadlineDisplay}</span>
                {countdown.isExpired ? (
                  <span className="inline-flex px-3 py-1 rounded-lg bg-destructive/10 text-destructive font-medium text-sm">已截止</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 tabular-nums font-medium text-foreground">
                    <CountdownUnit value={countdown.days} label="天" />
                    <CountdownUnit value={countdown.hours} label="時" pad={2} />
                    <CountdownUnit value={countdown.minutes} label="分" pad={2} />
                    <CountdownUnit value={countdown.seconds} label="秒" pad={2} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Highlight Section */}
        <section className="max-w-5xl mx-auto px-1 sm:px-0 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
        <section className="max-w-5xl mx-auto px-1 sm:px-0 min-w-0">
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

        {/* Venue & Transportation Section */}
        <section className="max-w-5xl mx-auto px-1 sm:px-0 min-w-0">
          <div className="mb-6 text-left sm:text-center">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">活動地點</h2>
            <p className="text-sm text-muted-foreground">
              場地與停車資訊，方便當天規劃交通。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-background/80 overflow-hidden">
            {/* 場地名稱 + 地圖按鈕 */}
            <div className="px-4 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <MapPin className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {VENUE_INFO.name}
                    <span className="text-sm font-normal text-muted-foreground ml-1">（{VENUE_INFO.nameAlt}）</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {VENUE_INFO.address}
                    {VENUE_INFO.addressNote && (
                      <span className="text-foreground/80">【{VENUE_INFO.addressNote}】</span>
                    )}
                  </p>
                </div>
              </div>
              <a
                href={VENUE_INFO.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-colors text-sm font-medium shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                開啟地圖
              </a>
            </div>

            {/* 停車場 */}
            <div className="px-4 py-3 md:px-6 md:py-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Car className="w-4 h-4 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">停車場</span>
                <p className="text-sm md:text-base font-medium text-foreground mt-0.5">
                  {VENUE_INFO.parking}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {VENUE_INFO.parkingNote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="max-w-3xl mx-auto text-center pb-6 px-2 sm:px-0 min-w-0">
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
      <footer className="w-full border-t border-border/40 bg-background/60">
        <div className="container mx-auto px-4 py-6 text-center text-[11px] sm:text-xs text-muted-foreground">
          2026年 華地產鑽石分會 資訊組 蔡濬瑒 製
        </div>
      </footer>
    </div>
  );
}
