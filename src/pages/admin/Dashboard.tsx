import { useState, useMemo } from 'react';
import { useRequireAdmin, useAuth } from '@/hooks/useAuth';
import { useRegistrations, useRegistrationStats } from '@/hooks/useRegistrations';
import { StatsCard } from '@/components/admin/StatsCard';
import { RegistrationTable } from '@/components/admin/RegistrationTable';
import { RegistrationDetailModal } from '@/components/admin/RegistrationDetailModal';
import { SeatingManager } from '@/components/admin/SeatingManager';
import { ManualRegistrationForm } from '@/components/admin/ManualRegistrationForm';
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
  const { isLoading: authLoading } = useRequireAdmin();
  const { signOut } = useAuth();
  const { data: registrations, isLoading } = useRegistrations();
  const stats = useRegistrationStats();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);

  const unregisteredInternalMembers = useMemo(
    () => getUnregisteredInternalMembers(registrations || []),
    [registrations]
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen marble-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4 mb-6">
          <StatsCard title="總報名人數" value={stats.totalHeadcount} icon={Users} color="gold" />
          <StatsCard title="已付款" value={stats.paid} icon={CreditCard} color="green" />
          <StatsCard title="未付款" value={stats.unpaid} icon={AlertCircle} color="red" />
          <StatsCard title="VIP" value={stats.vip} icon={Crown} color="purple" />
          <StatsCard title="外部來賓" value={stats.external} icon={UserPlus} color="blue" />
          <StatsCard title="內部夥伴" value={stats.internal} icon={Users} color="default" />
          <StatsCard title="候補" value={stats.waitlist} icon={Clock} color="default" />
        </div>

        {/* Internal members: registered vs not registered (by name match) */}
        <section className="mb-8 space-y-3">
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">
            內部成員報名狀況（依聯絡人姓名與名單比對，僅供參考）
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
            <StatsCard
              title="已報名內部人數"
              value={stats.internalRegisteredCount}
              icon={Users}
              color="default"
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
                    {stats.internalNotRegisteredCount}
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
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col min-w-0">
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
            <StatsCard title="一般葷食" value={stats.dietNormal} icon={Utensils} color="default" />
            <StatsCard title="素食" value={stats.dietVegetarian} icon={Leaf} color="green" />
            <StatsCard title="不吃牛" value={stats.dietNoBeef} icon={Utensils} color="gold" />
            <StatsCard title="不吃豬" value={stats.dietNoPork} icon={Utensils} color="purple" />
            <StatsCard title="其他需求" value={stats.dietOther} icon={AlertCircle} color="red" />
          </div>
        </section>

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted/50 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="list" className="text-xs sm:text-sm px-3 py-1.5">名單管理</TabsTrigger>
            <TabsTrigger value="add" className="text-xs sm:text-sm px-3 py-1.5">提交名單</TabsTrigger>
            <TabsTrigger value="seating" className="text-xs sm:text-sm px-3 py-1.5">座位安排</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <RegistrationTable
              registrations={registrations || []}
              onViewDetail={setSelectedRegistrationId}
            />
          </TabsContent>

          <TabsContent value="add">
            <ManualRegistrationForm />
          </TabsContent>

          <TabsContent value="seating">
            <SeatingManager />
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
