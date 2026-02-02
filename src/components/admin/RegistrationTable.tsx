import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { REGISTRATION_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Trash2, Copy, Wallet, Loader2 } from 'lucide-react';
import type { Registration } from '@/types/registration';

/** 同一人重複報名：以聯絡人姓名 + 手機正規化後為 key，回傳該 key 對應的報名 id 列表（僅保留有重複的） */
function getDuplicateGroupIds(registrations: Registration[]): Set<string> {
  const keyToIds = new Map<string, string[]>();
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
  registrations.forEach((reg) => {
    const key = `${norm(reg.contact_name)}|${(reg.phone || '').trim()}`;
    if (!keyToIds.has(key)) keyToIds.set(key, []);
    keyToIds.get(key)!.push(reg.id);
  });
  const duplicateIds = new Set<string>();
  keyToIds.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
  });
  return duplicateIds;
}
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/googleSheets';
import { useToast } from '@/hooks/use-toast';
import { useDeleteRegistration, useUpdateRegistration } from '@/hooks/useRegistrations';

interface RegistrationTableProps {
  registrations: Registration[];
  onViewDetail: (id: string) => void;
}

export function RegistrationTable({ registrations, onViewDetail }: RegistrationTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [payStatusFilter, setPayStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'duplicates'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const deleteRegistration = useDeleteRegistration();
  const updateRegistration = useUpdateRegistration();
  const [isSettingAllUnpaid, setIsSettingAllUnpaid] = useState(false);
  const [updatingPayStatusId, setUpdatingPayStatusId] = useState<string | null>(null);

  const duplicateIds = getDuplicateGroupIds(registrations);

  const filtered = registrations.filter((reg) => {
    const matchesSearch =
      reg.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      reg.ref_code.toLowerCase().includes(search.toLowerCase()) ||
      reg.phone.includes(search);

    const matchesType = typeFilter === 'all' || reg.type === typeFilter;

    const matchesPayStatus =
      payStatusFilter === 'all' || reg.pay_status === payStatusFilter;

    const isDuplicate = duplicateIds.has(reg.id);
    const matchesDuplicate =
      duplicateFilter === 'all' || (duplicateFilter === 'duplicates' && isDuplicate);

    return matchesSearch && matchesType && matchesPayStatus && matchesDuplicate;
  });

  const unpaidList = registrations.filter((r) => r.pay_status === 'unpaid');

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    downloadCSV(filtered, `報名名單_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    toast({
      title: '匯出成功',
      description: 'CSV 檔案已下載',
    });
  };

  const exportUnpaidCSV = () => {
    downloadCSV(unpaidList, `未付款名單_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    toast({
      title: '已匯出未付款名單',
      description: `共 ${unpaidList.length} 筆，可依聯絡人催款`,
    });
  };

  const handleSetAllUnpaid = async () => {
    if (registrations.length === 0) return;
    setIsSettingAllUnpaid(true);
    try {
      let updated = 0;
      for (const reg of registrations) {
        await updateRegistration.mutateAsync({
          id: reg.id,
          updates: { pay_status: 'unpaid' },
        });
        updated += 1;
      }
      toast({
        title: '已全部改為未付款',
        description: `共 ${updated} 筆報名的付款狀態已改為「未付款」。`,
      });
    } catch (error) {
      console.error('Set all unpaid error:', error);
      toast({
        title: '更新失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSettingAllUnpaid(false);
    }
  };

  const handleTogglePayStatus = async (reg: Registration) => {
    const nextStatus = reg.pay_status === 'paid' ? 'unpaid' : 'paid';
    setUpdatingPayStatusId(reg.id);
    try {
      await updateRegistration.mutateAsync({
        id: reg.id,
        updates: { pay_status: nextStatus },
      });
      toast({
        title: '已更新',
        description: `付款狀態已改為「${PAYMENT_STATUS_LABELS[nextStatus]}」`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: '更新失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setUpdatingPayStatusId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRegistration.mutateAsync(id);
      toast({
        title: '已刪除',
        description: '報名資料已成功刪除',
      });
    } catch (error) {
      console.error('Delete registration error:', error);
      toast({
        title: '刪除失敗',
        description: error instanceof Error ? error.message : '刪除時發生錯誤，請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'vip': return 'default';
      case 'internal': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* 收款說明 */}
      <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-muted-foreground break-words">
        <span className="font-medium text-foreground">收款流程：</span>
        篩選「未付款」→ 點該筆「查看」→ 確認收到款項後點「確認已收款」一鍵核准，或將付款狀態改為「已付款」並儲存。
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="搜尋姓名、公司、編號或手機..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-luxury w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px] input-luxury min-w-0">
            <SelectValue placeholder="類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="external">外部來賓</SelectItem>
            <SelectItem value="internal">內部夥伴</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payStatusFilter} onValueChange={(v) => setPayStatusFilter(v as 'all' | 'paid' | 'unpaid')}>
          <SelectTrigger className="w-full sm:w-[130px] input-luxury min-w-0">
            <SelectValue placeholder="付款狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="paid">已付款</SelectItem>
            <SelectItem value="unpaid">未付款 {unpaidList.length > 0 ? `(${unpaidList.length})` : ''}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={duplicateFilter} onValueChange={(v) => setDuplicateFilter(v as 'all' | 'duplicates')}>
          <SelectTrigger className="w-full sm:w-[140px] input-luxury min-w-0">
            <SelectValue placeholder="重複" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="duplicates">
              僅重複報名 {duplicateIds.size > 0 ? `(${duplicateIds.size})` : ''}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToCSV} className="gap-2">
          <Download className="w-4 h-4" />
          匯出 CSV
        </Button>
        <Button
          variant="outline"
          onClick={exportUnpaidCSV}
          className="gap-2"
          disabled={unpaidList.length === 0}
          title="匯出未付款名單，方便催款"
        >
          <Wallet className="w-4 h-4" />
          匯出未付款
        </Button>
        <Button
          variant="outline"
          onClick={() => void handleSetAllUnpaid()}
          className="gap-2"
          disabled={registrations.length === 0 || isSettingAllUnpaid}
          title="將所有報名的付款狀態改為「未付款」"
        >
          {isSettingAllUnpaid ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          全部改為未付款
        </Button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden min-w-0">
        <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-medium">報名編號</TableHead>
              <TableHead className="font-medium">類型</TableHead>
              <TableHead className="font-medium">聯絡人</TableHead>
              <TableHead className="font-medium text-center">人數</TableHead>
              <TableHead className="font-medium">付款狀態</TableHead>
              <TableHead className="font-medium">報名時間</TableHead>
              <TableHead className="font-medium text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  沒有符合條件的報名資料
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((reg) => {
                const isDuplicate = duplicateIds.has(reg.id);
                return (
                <TableRow
                  key={reg.id}
                  className={`hover:bg-muted/20 ${isDuplicate ? 'bg-amber-500/5' : ''}`}
                >
                  <TableCell className="font-mono text-sm">{reg.ref_code}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={getTypeBadgeVariant(reg.type)}>
                        {reg.type === 'vip' ? 'VIP' : reg.type === 'internal' ? '內部' : '外部'}
                      </Badge>
                      {isDuplicate && (
                        <Badge variant="destructive" className="text-xs">
                          <Copy className="w-3 h-3 mr-0.5" />
                          重複
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {reg.type === 'internal' ? (() => {
                      const member = getMemberByContactName(reg.contact_name);
                      return member
                        ? `${member.id}. ${reg.contact_name}`
                        : reg.contact_name;
                    })() : reg.contact_name}
                  </TableCell>
                  <TableCell className="text-center">{reg.headcount}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => void handleTogglePayStatus(reg)}
                      disabled={updatingPayStatusId === reg.id}
                      className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                      title="點擊切換付款狀態並儲存"
                    >
                      {updatingPayStatusId === reg.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground inline" />
                      ) : (
                        <Badge
                          variant={reg.pay_status === 'paid' ? 'default' : 'secondary'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {PAYMENT_STATUS_LABELS[reg.pay_status] || reg.pay_status}
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(reg.created_at), 'MM/dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-center flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetail(reg.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(reg.id)}
                      disabled={deleteRegistration.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {filtered.length} 筆資料
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
