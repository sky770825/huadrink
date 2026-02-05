import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRegistrations, useUpdateRegistration } from '@/hooks/useRegistrations';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { REGISTRATION_TYPE_LABELS, SEAT_ZONE_LABELS } from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';
import { useMembers } from '@/hooks/useMembers';
import { Loader2, Wand2, Save } from 'lucide-react';
import type { Registration, SeatZone } from '@/types/registration';

export function SeatingManager() {
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

  const handleAutoAssign = async () => {
    if (!registrations) return;

    setIsAutoAssigning(true);

    try {
      const tables = parseInt(totalTables);
      const seatsLimit = parseInt(seatsPerTable);
      const tableSeats: number[] = new Array(tables).fill(0);

      // 1) 依「來賓來源」分組：有 inviter 的外部／VIP 同來源一組，其餘（內部或無 inviter）各自一組
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

      type AssignmentGroup = { regs: Registration[]; headcount: number };
      const groups: AssignmentGroup[] = [];
      for (const regs of inviterMap.values()) {
        groups.push({ regs, headcount: regs.reduce((s, r) => s + r.headcount, 0) });
      }
      for (const r of ungrouped) {
        groups.push({ regs: [r], headcount: r.headcount });
      }

      // 2) 排序：VIP → 內部 → 外部；同類型則人數多的組優先（較易整組排同一桌）
      const typeOrder = (r: Registration) => (r.type === 'vip' ? 0 : r.type === 'internal' ? 1 : 2);
      groups.sort((a, b) => {
        const ta = typeOrder(a.regs[0]);
        const tb = typeOrder(b.regs[0]);
        if (ta !== tb) return ta - tb;
        return b.headcount - a.headcount;
      });

      // 3) 逐組配桌：同來源盡量同一桌；一桌放不下則依序填滿下一桌
      for (const group of groups) {
        const seatZone: SeatZone =
          group.regs[0].type === 'vip' ? 'vip' : group.regs[0].type === 'internal' ? 'internal' : 'general';

        if (group.headcount <= seatsLimit) {
          // 整組可放一桌：找第一個能放得下的桌
          let assignedTable = -1;
          for (let t = 0; t < tables; t++) {
            if (tableSeats[t] + group.headcount <= seatsLimit) {
              assignedTable = t + 1;
              tableSeats[t] += group.headcount;
              break;
            }
          }
          if (assignedTable === -1) {
            const maxSpace = Math.max(...tableSeats.map((s, i) => seatsLimit - s));
            assignedTable = tableSeats.findIndex((s) => seatsLimit - s === maxSpace) + 1;
            tableSeats[assignedTable - 1] += group.headcount;
          }
          for (const reg of group.regs) {
            await updateRegistration.mutateAsync({
              id: reg.id,
              updates: { table_no: assignedTable, seat_zone: seatZone },
            });
          }
        } else {
          // 一桌放不下：同來源依序填滿桌（先填滿一桌再下一桌）
          let regIndex = 0;
          const regs = group.regs;
          while (regIndex < regs.length) {
            const reg = regs[regIndex];
            let assignedTable = -1;
            for (let t = 0; t < tables; t++) {
              if (tableSeats[t] + reg.headcount <= seatsLimit) {
                assignedTable = t + 1;
                tableSeats[t] += reg.headcount;
                break;
              }
            }
            if (assignedTable === -1) {
              const maxSpace = Math.max(...tableSeats.map((s, i) => seatsLimit - s));
              const t = tableSeats.findIndex((s) => seatsLimit - s === maxSpace);
              assignedTable = t + 1;
              tableSeats[t] += reg.headcount;
            }
            await updateRegistration.mutateAsync({
              id: reg.id,
              updates: { table_no: assignedTable, seat_zone: seatZone },
            });
            regIndex++;
          }
        }
      }

      toast({
        title: '自動分桌完成',
        description: `已依來賓來源盡量集中分配至 ${tables} 桌`,
      });
    } catch {
      toast({
        title: '分桌失敗',
        description: '請稍後再試',
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
            <span className="text-xs text-muted-foreground">同來源（邀請人）來賓會盡量排在同一桌</span>
          </div>
        </div>
      </div>

      {/* Table Overview */}
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

      {/* Unassigned */}
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
                <div className="flex items-center gap-3">
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
                  <span className="text-muted-foreground">({reg.company})</span>
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
  );
}
