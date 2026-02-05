import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrations, useRegistrationStats } from '@/hooks/useRegistrations';
import { StatsCard } from '@/components/admin/StatsCard';
import { RegistrationTable } from '@/components/admin/RegistrationTable';
import { RegistrationDetailModal } from '@/components/admin/RegistrationDetailModal';
import { SeatingManager } from '@/components/admin/SeatingManager';
import { ManualRegistrationForm } from '@/components/admin/ManualRegistrationForm';
import { SystemSettingsPanel } from '@/components/admin/SystemSettingsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUnregisteredInternalMembers } from '@/lib/members';
import {
  Diamond,
  Users,
  CreditCard,
  AlertCircle,
  Crown,
  UserPlus,
  UserMinus,
  Clock,
  LogOut,
  Loader2,
  Utensils,
  Leaf,
} from 'lucide-react';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { data: registrations, isLoading, isError, refetch } = useRegistrations();
  const stats = useRegistrationStats();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [listPayStatusFilter, setListPayStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'internal' | 'external' | 'vip'>('all');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'waitlist'>('all');

  const goToListAndResetFilters = () => {
    setListPayStatusFilter('all');
    setListTypeFilter('all');
    setListStatusFilter('all');
    setActiveTab('list');
  };
  const goToListWithType = (type: 'all' | 'internal' | 'external' | 'vip') => {
    setListPayStatusFilter('all');
    setListTypeFilter(type);
    setListStatusFilter('all');
    setActiveTab('list');
  };
  const goToListWithStatus = (status: 'all' | 'waitlist') => {
    setListPayStatusFilter('all');
    setListTypeFilter('all');
    setListStatusFilter(status);
    setActiveTab('list');
  };

  const unregisteredInternalMembers = useMemo(
    () => getUnregisteredInternalMembers(registrations || []),
    [registrations]
  );

  // 漸進式載入：立即顯示頁面結構，資料載入中時顯示 skeleton
  return (
    <div className="min-h-screen marble-bg flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto w-full min-w-0 px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Diamond className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" strokeWidth={1.5} />
            <h1 className="font-serif text-base sm:text-xl font-semibold truncate">春酒報名管理</h1>
          </div>
          <Button variant="ghost" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex-1 w-full min-w-0 px-3 sm:px-4 py-6 sm:py-8">
        {isError && (
          <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">載入報名名單失敗（逾時或網路問題），請重試。</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
              重試
            </Button>
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-6">
          <StatsCard
            title="總報名人數"
            value={isLoading ? '—' : stats.totalHeadcount}
            icon={Users}
            color="gold"
            onClick={goToListAndResetFilters}
          />
          <StatsCard
            title="已付款"
            value={isLoading ? '—' : stats.paid}
            icon={CreditCard}
            color="green"
            onClick={() => { setListPayStatusFilter('paid'); setListTypeFilter('all'); setListStatusFilter('all'); setActiveTab('list'); }}
          />
          <StatsCard
            title="審核付款"
            value={isLoading ? '—' : stats.pending}
            icon={Clock}
            color="purple"
            onClick={() => { setListPayStatusFilter('pending'); setListTypeFilter('all'); setListStatusFilter('all'); setActiveTab('list'); }}
          />
          <StatsCard
            title="未付款"
            value={isLoading ? '—' : stats.unpaid}
            icon={AlertCircle}
            color="red"
            onClick={() => { setListPayStatusFilter('unpaid'); setListTypeFilter('all'); setListStatusFilter('all'); setActiveTab('list'); }}
          />
          <StatsCard
            title="VIP"
            value={isLoading ? '—' : stats.vip}
            icon={Crown}
            color="purple"
            onClick={() => goToListWithType('vip')}
          />
          <StatsCard
            title="外部來賓"
            value={isLoading ? '—' : stats.external}
            icon={UserPlus}
            color="blue"
            onClick={() => goToListWithType('external')}
          />
          <StatsCard
            title="內部夥伴"
            value={isLoading ? '—' : stats.internal}
            icon={Users}
            color="default"
            onClick={() => goToListWithType('internal')}
          />
          <StatsCard
            title="候補"
            value={isLoading ? '—' : stats.waitlist}
            icon={Clock}
            color="default"
            onClick={() => goToListWithStatus('waitlist')}
          />
        </div>

        {/* Internal members: registered vs not registered (by name match) */}
        <section className="mb-8 space-y-3">
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">
            內部成員報名狀況（依聯絡人姓名與名單比對，僅供參考）
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            <StatsCard
              title="已報名內部人數"
              value={isLoading ? '—' : stats.internalRegisteredCount}
              icon={Users}
              color="default"
              onClick={() => goToListWithType('internal')}
            />
            <button
              type="button"
              onClick={() => setShowUnregisteredModal(true)}
              className="glass-card rounded-xl p-4 text-left cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
              title="點擊查看未報名內部成員名單"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    未報名內部人數
                    <span className="ml-1 text-[10px] text-primary">（點擊查看名單）</span>
                  </p>
                  <p className="font-serif text-2xl font-semibold text-foreground leading-tight">
                    {isLoading ? '—' : stats.internalNotRegisteredCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 text-red-600">
                  <UserMinus className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* 未報名內部成員名單彈窗 */}
        <Dialog open={showUnregisteredModal} onOpenChange={setShowUnregisteredModal}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col min-w-0" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>未報名內部成員名單（依姓名比對，僅供參考）</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto flex-1 -mx-6 px-6">
              {unregisteredInternalMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">目前無未報名內部成員。</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {unregisteredInternalMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="font-mono font-medium w-10 text-muted-foreground">
                        {m.id}.
                      </span>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground truncate flex-1">{m.specialty}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              共 {unregisteredInternalMembers.length} 人（依聯絡人姓名與內部名單比對，姓名不符者不會列入）
            </p>
          </DialogContent>
        </Dialog>

        {/* Diet stats */}
        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">飲食需求統計（人數）</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            <StatsCard title="一般葷食" value={isLoading ? '—' : stats.dietNormal} icon={Utensils} color="default" />
            <StatsCard title="素食" value={isLoading ? '—' : stats.dietVegetarian} icon={Leaf} color="green" />
            <StatsCard title="不吃牛" value={isLoading ? '—' : stats.dietNoBeef} icon={Utensils} color="gold" />
            <StatsCard title="不吃豬" value={isLoading ? '—' : stats.dietNoPork} icon={Utensils} color="purple" />
            <StatsCard title="其他需求" value={isLoading ? '—' : stats.dietOther} icon={AlertCircle} color="red" />
          </div>
        </section>

        {/* Tabs */}
        <Tabs value={activeTab ?? 'list'} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted/50 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="list" className="text-xs sm:text-sm px-3 py-1.5">名單管理</TabsTrigger>
            <TabsTrigger value="add" className="text-xs sm:text-sm px-3 py-1.5">提交名單</TabsTrigger>
            <TabsTrigger value="seating" className="text-xs sm:text-sm px-3 py-1.5">座位安排</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm px-3 py-1.5">系統設定</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">載入報名名單中...</p>
              </div>
            ) : (
              <RegistrationTable
                registrations={registrations || []}
                onViewDetail={setSelectedRegistrationId}
                externalPayStatusFilter={listPayStatusFilter}
                onPayStatusFilterChange={(v) => setListPayStatusFilter(v)}
                externalTypeFilter={listTypeFilter}
                onTypeFilterChange={(v) => setListTypeFilter(v)}
                externalStatusFilter={listStatusFilter}
                onStatusFilterChange={(v) => setListStatusFilter(v)}
              />
            )}
          </TabsContent>

          <TabsContent value="add">
            <ManualRegistrationForm />
          </TabsContent>

          <TabsContent value="seating">
            <SeatingManager />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettingsPanel />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="w-full border-t border-border/40 bg-card/40">
        <div className="container mx-auto px-4 py-3 text-center text-[11px] sm:text-xs text-muted-foreground">
          2026年 華地產鑽石分會 資訊組 蔡濬瑒 製
        </div>
      </footer>

      {/* Detail Modal */}
      <RegistrationDetailModal
        registrationId={selectedRegistrationId}
        onClose={() => setSelectedRegistrationId(null)}
      />
    </div>
  );
}
