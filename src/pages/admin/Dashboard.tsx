import { useState } from 'react';
import { useRequireAdmin, useAuth } from '@/hooks/useAuth';
import { useRegistrations, useRegistrationStats } from '@/hooks/useRegistrations';
import { StatsCard } from '@/components/admin/StatsCard';
import { RegistrationTable } from '@/components/admin/RegistrationTable';
import { RegistrationDetailModal } from '@/components/admin/RegistrationDetailModal';
import { SeatingManager } from '@/components/admin/SeatingManager';
import { ManualRegistrationForm } from '@/components/admin/ManualRegistrationForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Diamond, Users, CreditCard, AlertCircle, Crown, UserPlus, Clock, LogOut, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const { isLoading: authLoading } = useRequireAdmin();
  const { signOut } = useAuth();
  const { data: registrations, isLoading } = useRegistrations();
  const stats = useRegistrationStats();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen marble-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen marble-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Diamond className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="font-serif text-xl font-semibold">春酒報名管理</h1>
          </div>
          <Button variant="ghost" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4 mb-6">
          <StatsCard title="總報名人數" value={stats.totalHeadcount} icon={Users} color="gold" />
          <StatsCard title="已付款" value={stats.paid} icon={CreditCard} color="green" />
          <StatsCard title="未付款" value={stats.unpaid} icon={AlertCircle} color="red" />
          <StatsCard title="VIP" value={stats.vip} icon={Crown} color="purple" />
          <StatsCard title="外部來賓" value={stats.external} icon={UserPlus} color="blue" />
          <StatsCard title="內部夥伴" value={stats.internal} icon={Users} color="default" />
          <StatsCard title="候補" value={stats.waitlist} icon={Clock} color="default" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="list">名單管理</TabsTrigger>
            <TabsTrigger value="add">提交名單</TabsTrigger>
            <TabsTrigger value="seating">座位安排</TabsTrigger>
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
