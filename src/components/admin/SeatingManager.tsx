import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useRegistrations, useUpdateRegistration } from '@/hooks/useRegistrations';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { REGISTRATION_TYPE_LABELS, SEAT_ZONE_LABELS } from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';
import { huadrink } from '@/lib/supabase-huadrink';
import { useMembers } from '@/hooks/useMembers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wand2, Save, ImageDown, RotateCcw, List, LayoutGrid, Table } from 'lucide-react';
import type { Registration, SeatZone } from '@/types/registration';

export type SeatingDisplayMode = 'list' | 'diagram' | 'overview';

function formatRegLabel(reg: Registration, members: { id: number; name: string }[]): string {
  const name =
    reg.type === 'internal'
      ? (() => {
          const member = getMemberByContactName(reg.contact_name, members);
          return member ? `${member.id}. ${reg.contact_name}` : reg.contact_name;
        })()
      : reg.contact_name;
  const inviter =
    (reg.type === 'external' || reg.type === 'vip') && reg.inviter?.trim()
      ? `（由 ${reg.inviter.trim()} 邀請）`
      : '';
  return `${name}${inviter} ×${reg.headcount}`;
}

const REGISTRATIONS_QUERY_KEY = ['registrations'] as const;

export function SeatingManager() {
  const queryClient = useQueryClient();
  const { data: registrations, isLoading } = useRegistrations();
  const { data: settings } = useSystemSettings();
  const updateRegistration = useUpdateRegistration();
  const updateSetting = useUpdateSystemSetting();
  const { toast } = useToast();
  const { members } = useMembers();

  const [totalTables, setTotalTables] = useState(settings?.total_tables?.toString() || '10');
  const [seatsPerTable, setSeatsPerTable] = useState(settings?.seats_per_table?.toString() || '10');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [draggingRegId, setDraggingRegId] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [displayMode, setDisplayMode] = useState<SeatingDisplayMode>('list');
  const seatingExportRef = useRef<HTMLDivElement>(null);

  const activeRegistrations = registrations?.filter((r) => r.status !== 'waitlist') || [];

  const handleSaveSettings = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'total_tables', value: totalTables });
      await updateSetting.mutateAsync({ key: 'seats_per_table', value: seatsPerTable });
      toast({ title: '設定已儲存' });
    } catch {
      toast({ title: '儲存失敗', variant: 'destructive' });
    }
  };

  /**
   * 自動分桌（僅在此按鈕觸發時套用）：
   * 邀請人本人與其受邀來賓必須安排在同一桌（併桌），不能拆到其他桌次。
   * 手動拖曳、選擇桌號等操作不受此條件限制。
   * 使用樂觀更新 + 並行請求，畫面即時反應。
   */
  const handleAutoAssign = async () => {
    if (!registrations) return;

    setIsAutoAssigning(true);
    const tables = parseInt(totalTables);
    const seatsLimit = parseInt(seatsPerTable);

    try {
      const tableSeats: number[] = new Array(tables).fill(0);

      // 1) 依「來賓來源」分組：有 inviter 的外部／VIP 與「邀請人本人」同組（併桌），其餘各自一組
      const inviterMap = new Map<string, Registration[]>();
      const ungrouped: Registration[] = [];
      for (const r of activeRegistrations) {
        if ((r.type === 'external' || r.type === 'vip') && r.inviter?.trim()) {
          const key = r.inviter.trim();
          if (!inviterMap.has(key)) inviterMap.set(key, []);
          inviterMap.get(key)!.push(r);
        } else {
          ungrouped.push(r);
        }
      }

      const usedRegIds = new Set<string>();
      for (const [inviterName, guestRegs] of inviterMap) {
        const inviterReg = activeRegistrations.find(
          (r) => r.type === 'internal' && r.contact_name.trim() === inviterName
        );
        if (inviterReg) {
          guestRegs.unshift(inviterReg);
          usedRegIds.add(inviterReg.id);
        }
      }

      type AssignmentGroup = { regs: Registration[]; headcount: number };
      const groups: AssignmentGroup[] = [];
      for (const regs of inviterMap.values()) {
        groups.push({ regs, headcount: regs.reduce((s, r) => s + r.headcount, 0) });
      }
      for (const r of ungrouped) {
        if (usedRegIds.has(r.id)) continue;
        groups.push({ regs: [r], headcount: r.headcount });
      }

      const typeOrder = (r: Registration) => (r.type === 'vip' ? 0 : r.type === 'internal' ? 1 : 2);
      groups.sort((a, b) => {
        const ta = typeOrder(a.regs[0]);
        const tb = typeOrder(b.regs[0]);
        if (ta !== tb) return ta - tb;
        return b.headcount - a.headcount;
      });

      // 2) 計算所有分配結果，產出更新清單（不發請求）
      const updates: { id: string; table_no: number; seat_zone: SeatZone }[] = [];
      const tableSeatsCopy = [...tableSeats];

      for (const group of groups) {
        const seatZone: SeatZone =
          group.regs[0].type === 'vip' ? 'vip' : group.regs[0].type === 'internal' ? 'internal' : 'general';

        if (group.headcount <= seatsLimit) {
          let assignedTable = -1;
          for (let t = 0; t < tables; t++) {
            if (tableSeatsCopy[t] + group.headcount <= seatsLimit) {
              assignedTable = t + 1;
              tableSeatsCopy[t] += group.headcount;
              break;
            }
          }
          if (assignedTable === -1) {
            const maxSpace = Math.max(...tableSeatsCopy.map((s, i) => seatsLimit - s));
            assignedTable = tableSeatsCopy.findIndex((s) => seatsLimit - s === maxSpace) + 1;
            tableSeatsCopy[assignedTable - 1] += group.headcount;
          }
          for (const reg of group.regs) {
            updates.push({ id: reg.id, table_no: assignedTable, seat_zone: seatZone });
          }
        } else {
          let regIndex = 0;
          const regs = group.regs;
          while (regIndex < regs.length) {
            const reg = regs[regIndex];
            let assignedTable = -1;
            for (let t = 0; t < tables; t++) {
              if (tableSeatsCopy[t] + reg.headcount <= seatsLimit) {
                assignedTable = t + 1;
                tableSeatsCopy[t] += reg.headcount;
                break;
              }
            }
            if (assignedTable === -1) {
              const maxSpace = Math.max(...tableSeatsCopy.map((s) => seatsLimit - s));
              const t = tableSeatsCopy.findIndex((s) => seatsLimit - s === maxSpace);
              assignedTable = t + 1;
              tableSeatsCopy[t] += reg.headcount;
            }
            updates.push({ id: reg.id, table_no: assignedTable, seat_zone: seatZone });
            regIndex++;
          }
        }
      }

      const updatesMap = new Map(updates.map((u) => [u.id, u]));

      // 3) 樂觀更新：先改 cache，畫面立即更新
      const nextRegistrations = registrations.map((r) => {
        const u = updatesMap.get(r.id);
        if (!u) return r;
        return { ...r, table_no: u.table_no, seat_zone: u.seat_zone };
      });
      queryClient.setQueryData(REGISTRATIONS_QUERY_KEY, nextRegistrations);

      // 4) 多筆 update 以 Promise.all 並行送出；筆數極多時可考慮改為 RPC 批次
      const results = await Promise.all(
        updates.map((u) =>
          huadrink
            .from('registrations')
            .update({ table_no: u.table_no, seat_zone: u.seat_zone })
            .eq('id', u.id)
            .select('id')
        )
      );
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw new Error(firstError.error.message);
      const notWritten = results.filter((r) => !Array.isArray(r.data) || r.data.length !== 1);
      if (notWritten.length > 0) {
        throw new Error(
          `有 ${notWritten.length} 筆未成功寫入資料庫（可能為權限或連線問題），請重新登入管理後台後再試。`
        );
      }

      queryClient.invalidateQueries({ queryKey: REGISTRATIONS_QUERY_KEY });
      toast({
        title: '自動分桌完成',
        description: `邀請人與其來賓優先同一桌，已分配至 ${tables} 桌`,
      });
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: REGISTRATIONS_QUERY_KEY });
      const message = err instanceof Error ? err.message : '請稍後再試';
      toast({
        title: '分桌失敗',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleTableChange = async (regId: string, tableNo: string) => {
    try {
      await updateRegistration.mutateAsync({
        id: regId,
        updates: { table_no: tableNo ? parseInt(tableNo) : null },
      });
    } catch {
      toast({ title: '更新失敗', variant: 'destructive' });
    }
  };

  const handleRemoveFromTable = async (regId: string) => {
    try {
      await updateRegistration.mutateAsync({
        id: regId,
        updates: { table_no: null, seat_zone: null },
      });
      toast({ title: '已移除座位' });
    } catch {
      toast({ title: '移除失敗', variant: 'destructive' });
    }
  };

  const handleDropToTable = async (tableNo: number | null) => {
    if (!draggingRegId) return;
    try {
      await updateRegistration.mutateAsync({
        id: draggingRegId,
        updates: {
          table_no: tableNo,
        },
      });
    } catch {
      toast({ title: '更新失敗', variant: 'destructive' });
    } finally {
      setDraggingRegId(null);
    }
  };

  const handleResetSeating = async () => {
    const toReset = activeRegistrations.filter((r) => r.table_no != null);
    if (toReset.length === 0) {
      toast({ title: '目前沒有已分配的桌次', variant: 'destructive' });
      setShowResetConfirm(false);
      return;
    }
    setIsResetting(true);
    setShowResetConfirm(false);
    const toResetIds = Array.from(new Set(toReset.map((r) => r.id)));
    const toResetIdSet = new Set(toResetIds);
    try {
      // 樂觀更新：先清空桌次，畫面立即更新
      const nextRegistrations = (registrations ?? []).map((r) =>
        toResetIdSet.has(r.id) ? { ...r, table_no: undefined, seat_zone: undefined } : r
      );
      queryClient.setQueryData(REGISTRATIONS_QUERY_KEY, nextRegistrations);

      // 重設桌次：.in('id', ids).update() 單一批次寫入，對 DB 友善；回傳筆數檢查確保寫入成功
      const { data, error } = await huadrink
        .from('registrations')
        .update({ table_no: null, seat_zone: null })
        .in('id', toResetIds)
        .select('id');

      if (error) throw new Error(error.message);
      const updatedCount = Array.isArray(data) ? data.length : 0;
      if (updatedCount !== toResetIds.length) {
        throw new Error(
          `僅更新 ${updatedCount} 筆，預期 ${toResetIds.length} 筆。請重新登入管理後台後再試，或聯絡管理員。`
        );
      }

      queryClient.invalidateQueries({ queryKey: REGISTRATIONS_QUERY_KEY });
      toast({ title: '已重設桌次', description: `已將 ${toReset.length} 筆改為尚未分桌` });
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: REGISTRATIONS_QUERY_KEY });
      const message = err instanceof Error ? err.message : '請稍後再試';
      toast({ title: '重設失敗', description: message, variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportSeatingImage = async () => {
    const el = seatingExportRef.current;
    if (!el) return;
    setIsExportingImage(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#fafafa',
        logging: false,
        onclone: (_doc, clonedEl) => {
          // 匯出用：避免圖片中文字被遮擋或裁切，確保文字完整顯示
          clonedEl.style.backgroundColor = '#fafafa';
          clonedEl.querySelectorAll('[data-radix-collection-item], [role="listbox"]').forEach((n) => ((n as HTMLElement).style.display = 'none'));
          clonedEl.querySelectorAll('.truncate').forEach((n) => {
            const e = n as HTMLElement;
            e.classList.remove('truncate');
            e.style.overflow = 'visible';
            e.style.whiteSpace = 'normal';
            e.style.maxWidth = 'none';
          });
          clonedEl.querySelectorAll('[class*="glass-card"]').forEach((n) => {
            const e = n as HTMLElement;
            e.style.background = '#ffffff';
            e.style.backdropFilter = 'none';
          });
          clonedEl.querySelectorAll('button').forEach((btn) => {
            const b = btn as HTMLElement;
            if (b.closest('[data-slot="select-trigger"]') || b.textContent?.trim() === '移除') {
              b.style.display = 'none';
            }
          });
          clonedEl.querySelectorAll('[data-slot="select-trigger"]').forEach((n) => {
            const e = n as HTMLElement;
            e.style.display = 'none';
          });
          clonedEl.querySelectorAll('.flex.items-center.justify-between').forEach((row) => {
            const r = row as HTMLElement;
            const first = r.querySelector('.font-medium')?.parentElement;
            if (first && (first as HTMLElement).style) {
              (first as HTMLElement).style.minWidth = '0';
              (first as HTMLElement).style.overflow = 'visible';
              (first as HTMLElement).style.flex = '1';
            }
          });
        },
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const modeLabel = displayMode === 'list' ? '列表' : displayMode === 'diagram' ? '圖形式' : '一覽表';
      a.download = `座位安排_${modeLabel}_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast({ title: '已下載座位圖' });
    } catch {
      toast({ title: '匯出失敗', variant: 'destructive' });
    } finally {
      setIsExportingImage(false);
    }
  };

  // Group registrations by table
  const tableGroups: Record<number, Registration[]> = {};
  activeRegistrations.forEach((reg) => {
    const table = reg.table_no || 0;
    if (!tableGroups[table]) tableGroups[table] = [];
    tableGroups[table].push(reg);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Settings */}
      <div className="glass-card rounded-xl p-4 sm:p-6">
        <h3 className="font-serif text-lg sm:text-xl font-semibold mb-3 sm:mb-4">桌數設定</h3>
        <div className="flex flex-wrap gap-3 sm:gap-4 items-end">
          <div>
            <Label>總桌數</Label>
            <Input
              type="number"
              value={totalTables}
              onChange={(e) => setTotalTables(e.target.value)}
              className="w-24 input-luxury"
            />
          </div>
          <div>
            <Label>每桌人數上限</Label>
            <Input
              type="number"
              value={seatsPerTable}
              onChange={(e) => setSeatsPerTable(e.target.value)}
              className="w-24 input-luxury"
            />
          </div>
          <Button variant="outline" onClick={handleSaveSettings} className="gap-2">
            <Save className="w-4 h-4" />
            儲存設定
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAutoAssign}
              disabled={isAutoAssigning}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isAutoAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              自動分桌
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportSeatingImage}
              disabled={isExportingImage}
              className="gap-2"
            >
              {isExportingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageDown className="w-4 h-4" />
              )}
              下載座位圖
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              disabled={isResetting || activeRegistrations.every((r) => r.table_no == null)}
              className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
            >
              <RotateCcw className="w-4 h-4" />
              重設桌次
            </Button>
            <span className="text-xs text-muted-foreground">邀請人與其來賓優先排同一桌</span>
          </div>
        </div>
      </div>

      {/* 顯示模式切換（下載座位圖會依目前模式匯出） */}
      <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as SeatingDisplayMode)}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-medium text-muted-foreground">顯示方式</span>
          <TabsList className="h-9">
            <TabsTrigger value="list" className="gap-1.5 text-xs sm:text-sm">
              <List className="w-4 h-4" />
              列表式
            </TabsTrigger>
            <TabsTrigger value="diagram" className="gap-1.5 text-xs sm:text-sm">
              <LayoutGrid className="w-4 h-4" />
              圖形式
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <Table className="w-4 h-4" />
              一覽表
            </TabsTrigger>
          </TabsList>
        </div>

        <div ref={seatingExportRef} className="mt-0">
          {displayMode === 'list' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Array.from({ length: parseInt(totalTables) }, (_, i) => i + 1).map((tableNum) => {
                  const tableRegs = tableGroups[tableNum] || [];
                  const totalSeats = tableRegs.reduce((sum, r) => sum + r.headcount, 0);
                  return (
                    <div
                      key={tableNum}
                      className={`glass-card rounded-xl p-4 transition-colors ${
                        draggingRegId ? 'border border-dashed border-primary/40' : ''
                      }`}
                      onDragOver={(e) => {
                        if (draggingRegId) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        void handleDropToTable(tableNum);
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-serif text-lg font-semibold">第 {tableNum} 桌</h4>
                        <Badge variant={totalSeats >= parseInt(seatsPerTable) ? 'destructive' : 'secondary'}>
                          {totalSeats} / {seatsPerTable}
                        </Badge>
                      </div>
                      {tableRegs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">尚無安排</p>
                      ) : (
                        <div className="space-y-2">
                          {tableRegs.map((reg) => (
                            <div
                              key={reg.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm cursor-move"
                              draggable
                              onDragStart={() => setDraggingRegId(reg.id)}
                              onDragEnd={() => setDraggingRegId(null)}
                            >
                              <div>
                                <span className="font-medium">
                                  {reg.type === 'internal'
                                    ? (() => {
                                        const member = getMemberByContactName(reg.contact_name, members);
                                        return member ? `${member.id}. ${reg.contact_name}` : reg.contact_name;
                                      })()
                                    : reg.contact_name}
                                </span>
                                {(reg.type === 'external' || reg.type === 'vip') && reg.inviter?.trim() && (
                                  <span className="text-muted-foreground text-xs ml-2">由 {reg.inviter.trim()} 邀請</span>
                                )}
                                <span className="text-muted-foreground ml-2">×{reg.headcount}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {reg.type === 'vip' ? 'VIP' : reg.type === 'internal' ? '內部' : '外部'}
                                </Badge>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="text-[11px] px-2"
                                  onClick={() => void handleRemoveFromTable(reg.id)}
                                >
                                  移除
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {tableGroups[0] && tableGroups[0].length > 0 && (
                <div
                  className="glass-card rounded-xl p-4 sm:p-6 min-w-0"
                  onDragOver={(e) => {
                    if (draggingRegId) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleDropToTable(null);
                  }}
                >
                  <h3 className="font-serif text-xl font-semibold mb-4">尚未分桌</h3>
                  <div className="space-y-3">
                    {tableGroups[0].map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-move"
                        draggable
                        onDragStart={() => setDraggingRegId(reg.id)}
                        onDragEnd={() => setDraggingRegId(null)}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="outline">
                            {reg.type === 'vip' ? 'VIP' : reg.type === 'internal' ? '內部' : '外部'}
                          </Badge>
                          <span className="font-medium">
                            {reg.type === 'internal'
                              ? (() => {
                                  const member = getMemberByContactName(reg.contact_name, members);
                                  return member ? `${member.id}. ${reg.contact_name}` : reg.contact_name;
                                })()
                              : reg.contact_name}
                          </span>
                          {(reg.type === 'external' || reg.type === 'vip') ? (
                            <span className="text-muted-foreground text-sm">
                              {reg.inviter?.trim() ? `由 ${reg.inviter.trim()} 邀請` : '(未填邀請人)'}
                            </span>
                          ) : (
                            reg.company?.trim() && (
                              <span className="text-muted-foreground text-sm">({reg.company})</span>
                            )
                          )}
                          <span className="text-muted-foreground">×{reg.headcount}</span>
                        </div>
                        <Select
                          value={reg.table_no?.toString() || ''}
                          onValueChange={(v) => handleTableChange(reg.id, v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="選擇桌號" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: parseInt(totalTables) }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                第 {num} 桌
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {displayMode === 'diagram' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: parseInt(totalTables) }, (_, i) => i + 1).map((tableNum) => {
                  const tableRegs = tableGroups[tableNum] || [];
                  const totalSeats = tableRegs.reduce((sum, r) => sum + r.headcount, 0);
                  return (
                    <div
                      key={tableNum}
                      className="rounded-2xl border-2 border-primary/20 bg-muted/20 p-4 text-center min-h-[120px] flex flex-col"
                    >
                      <div className="font-serif font-semibold text-lg mb-2">第 {tableNum} 桌</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {totalSeats} / {seatsPerTable} 人
                      </div>
                      <div className="flex-1 space-y-1 text-sm text-left">
                        {tableRegs.length === 0 ? (
                          <span className="text-muted-foreground">尚無安排</span>
                        ) : (
                          tableRegs.map((reg) => (
                            <div key={reg.id} className="truncate" title={formatRegLabel(reg, members)}>
                              {formatRegLabel(reg, members)}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {tableGroups[0] && tableGroups[0].length > 0 && (
                <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4">
                  <h3 className="font-serif text-lg font-semibold mb-3">尚未分桌</h3>
                  <div className="flex flex-wrap gap-2">
                    {tableGroups[0].map((reg) => (
                      <span key={reg.id} className="text-sm px-2 py-1 rounded bg-muted/50">
                        {formatRegLabel(reg, members)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {displayMode === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left font-medium p-3 w-24">桌號</th>
                      <th className="text-left font-medium p-3 w-20">人數</th>
                      <th className="text-left font-medium p-3">參與者</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: parseInt(totalTables) }, (_, i) => i + 1).map((tableNum) => {
                      const tableRegs = tableGroups[tableNum] || [];
                      const totalSeats = tableRegs.reduce((sum, r) => sum + r.headcount, 0);
                      return (
                        <tr key={tableNum} className="border-b last:border-b-0">
                          <td className="p-3 font-medium">第 {tableNum} 桌</td>
                          <td className="p-3 text-muted-foreground">{totalSeats} / {seatsPerTable}</td>
                          <td className="p-3">
                            {tableRegs.length === 0
                              ? '—'
                              : tableRegs.map((reg) => formatRegLabel(reg, members)).join('；')}
                          </td>
                        </tr>
                      );
                    })}
                    {tableGroups[0] && tableGroups[0].length > 0 && (
                      <tr className="bg-amber-500/5 border-b-0">
                        <td className="p-3 font-medium">尚未分桌</td>
                        <td className="p-3 text-muted-foreground">
                          {tableGroups[0].reduce((s, r) => s + r.headcount, 0)}
                        </td>
                        <td className="p-3">
                          {tableGroups[0].map((reg) => formatRegLabel(reg, members)).join('；')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Tabs>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重設所有桌次？</AlertDialogTitle>
            <AlertDialogDescription>
              已分配的人員將全部改為「尚未分桌」，桌次與座位區會清空。您之後可重新手動或自動分桌。此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSeating}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              確定重設
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
