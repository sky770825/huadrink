import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { REGISTRATION_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Trash2, Copy, Wallet, Loader2 } from 'lucide-react';
import { getPaymentProofUrl } from '@/lib/utils';
import { PaymentProofDialog, type PaymentProofContext } from '@/components/admin/PaymentProofDialog';
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
import { useDeleteRegistration, useUpdateRegistration, useRegistration } from '@/hooks/useRegistrations';

interface RegistrationTableProps {
  registrations: Registration[];
  onViewDetail: (id: string) => void;
  /** 由外部（如 StatsCard 點擊）控制付款狀態篩選 */
  externalPayStatusFilter?: 'all' | 'paid' | 'unpaid' | 'pending';
  onPayStatusFilterChange?: (v: 'all' | 'paid' | 'unpaid' | 'pending') => void;
  /** 由外部控制類型篩選（內部/外部/VIP） */
  externalTypeFilter?: 'all' | 'internal' | 'external' | 'vip';
  onTypeFilterChange?: (v: 'all' | 'internal' | 'external' | 'vip') => void;
  /** 由外部控制狀態篩選（候補等） */
  externalStatusFilter?: 'all' | 'waitlist';
  onStatusFilterChange?: (v: 'all' | 'waitlist') => void;
}

export function RegistrationTable({
  registrations,
  onViewDetail,
  externalPayStatusFilter,
  onPayStatusFilterChange,
  externalTypeFilter,
  onTypeFilterChange,
  externalStatusFilter,
  onStatusFilterChange,
}: RegistrationTableProps) {
  const [search, setSearch] = useState('');
  const [internalTypeFilter, setInternalTypeFilter] = useState<string>('all');
  const typeFilter = externalTypeFilter ?? internalTypeFilter;
  const setTypeFilter = onTypeFilterChange ?? setInternalTypeFilter;
  const [internalPayStatusFilter, setInternalPayStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all');
  const payStatusFilter = externalPayStatusFilter ?? internalPayStatusFilter;
  const setPayStatusFilter = onPayStatusFilterChange ?? setInternalPayStatusFilter;
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'waitlist'>('all');
  const statusFilter = externalStatusFilter ?? internalStatusFilter;
  const setStatusFilter = onStatusFilterChange ?? setInternalStatusFilter;
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'duplicates'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const deleteRegistration = useDeleteRegistration();
  const updateRegistration = useUpdateRegistration();
  const [isSettingAllUnpaid, setIsSettingAllUnpaid] = useState(false);
  const [updatingPayStatusId, setUpdatingPayStatusId] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  /** 需 fetch 才能取得 base64 的報名 id，列表不載入 base64 以加速 */
  const [proofRegIdToFetch, setProofRegIdToFetch] = useState<string | null>(null);
  /** 憑證對應的報名者資訊，供審核時核對 */
  const [proofViewingContext, setProofViewingContext] = useState<PaymentProofContext | null>(null);
  const { data: proofRegData, refetch: refetchProof } = useRegistration(proofRegIdToFetch || '', { includePayProofBase64: true });
  /** 欲改為未付款的報名（需確認後一併清除付款憑證） */
  const [pendingUnpaidReg, setPendingUnpaidReg] = useState<Registration | null>(null);

  const duplicateIds = getDuplicateGroupIds(registrations);

  useEffect(() => {
    setCurrentPage(1);
  }, [payStatusFilter, typeFilter, statusFilter]);

  const filtered = registrations.filter((reg) => {
    const matchesSearch =
      reg.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      reg.ref_code.toLowerCase().includes(search.toLowerCase()) ||
      reg.phone.includes(search);

    const matchesType = typeFilter === 'all' || reg.type === typeFilter;

    const matchesPayStatus =
      payStatusFilter === 'all' || reg.pay_status === payStatusFilter;

    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;

    const isDuplicate = duplicateIds.has(reg.id);
    const matchesDuplicate =
      duplicateFilter === 'all' || (duplicateFilter === 'duplicates' && isDuplicate);

    return matchesSearch && matchesType && matchesPayStatus && matchesStatus && matchesDuplicate;
  });

  /** 預設照序號排序：內部夥伴依成員編號，其餘依報名編號 */
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aInternal = a.type === 'internal';
    const bInternal = b.type === 'internal';
    if (aInternal && bInternal) {
      const memberA = getMemberByContactName(a.contact_name);
      const memberB = getMemberByContactName(b.contact_name);
      const idA = memberA?.id ?? 9999;
      const idB = memberB?.id ?? 9999;
      return idA - idB;
    }
    if (aInternal !== bInternal) return aInternal ? -1 : 1;
    return (a.ref_code || '').localeCompare(b.ref_code || '');
  });

  const unpaidList = registrations.filter((r) => r.pay_status === 'unpaid');
  const pendingList = registrations.filter((r) => r.pay_status === 'pending');

  const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
  const paginatedData = sortedFiltered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    downloadCSV(sortedFiltered, `報名名單_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
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

  const handleTogglePayStatus = (reg: Registration) => {
    // 從「已付款」改為「尚未付款」時需確認，並一併清除資料庫中的付款憑證
    if (reg.pay_status === 'paid') {
      setPendingUnpaidReg(reg);
      return;
    }
    void doUpdatePayStatus(reg.id, 'paid', undefined);
  };

  const doUpdatePayStatus = async (
    id: string,
    nextStatus: 'paid' | 'unpaid',
    clearProof?: { pay_proof_url: null; pay_proof_base64: null; pay_proof_last5: null }
  ) => {
    setUpdatingPayStatusId(id);
    try {
      await updateRegistration.mutateAsync({
        id,
        updates: clearProof ? { pay_status: nextStatus, ...clearProof } : { pay_status: nextStatus },
      });
      toast({
        title: '已更新',
        description: `付款狀態已改為「${PAYMENT_STATUS_LABELS[nextStatus]}」`,
        duration: 3000,
      });
      setPendingUnpaidReg(null);
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

  const handleConfirmPaidToUnpaid = () => {
    if (!pendingUnpaidReg) return;
    const { id } = pendingUnpaidReg;
    void doUpdatePayStatus(id, 'unpaid', {
      pay_proof_url: null,
      pay_proof_base64: null,
      pay_proof_last5: null,
    });
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

      {/* 快速審核：已提交付款待審核名單 */}
      {pendingList.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-medium">
            待審核：<span className="text-primary">{pendingList.length}</span> 筆已提交付款憑證，等待確認
          </span>
          <Button
            variant={payStatusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setPayStatusFilter('pending');
              setCurrentPage(1);
            }}
          >
            快速查看審核名單
          </Button>
        </div>
      )}

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
        <Select value={payStatusFilter} onValueChange={(v) => setPayStatusFilter(v as 'all' | 'paid' | 'unpaid' | 'pending')}>
          <SelectTrigger className="w-full sm:w-[130px] input-luxury min-w-0">
            <SelectValue placeholder="付款狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="paid">已付款</SelectItem>
            <SelectItem value="unpaid">尚未付款 {unpaidList.length > 0 ? `(${unpaidList.length})` : ''}</SelectItem>
            <SelectItem value="pending">審核付款 {pendingList.length > 0 ? `(${pendingList.length})` : ''}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'waitlist')}>
          <SelectTrigger className="w-full sm:w-[110px] input-luxury min-w-0">
            <SelectValue placeholder="狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="waitlist">候補</SelectItem>
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePayStatus(reg)}
                        disabled={updatingPayStatusId === reg.id}
                        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                        title="點擊切換付款狀態並儲存"
                      >
                        {updatingPayStatusId === reg.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground inline" />
                        ) : (
                          <Badge
                            variant={reg.pay_status === 'paid' ? 'default' : reg.pay_status === 'pending' ? 'secondary' : 'outline'}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            {PAYMENT_STATUS_LABELS[reg.pay_status] || reg.pay_status}
                          </Badge>
                        )}
                      </button>
                      {(reg.pay_proof_url || reg.pay_proof_last5) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const ctx: PaymentProofContext = {
                              contact_name: reg.contact_name,
                              ref_code: reg.ref_code,
                              pay_proof_last5: reg.pay_proof_last5 ?? undefined,
                            };
                            setProofViewingContext(ctx);
                            const url = getPaymentProofUrl(reg);
                            if (url) {
                              setProofRegIdToFetch(null); // 避免混用 fetch 結果
                              setProofImageUrl(url);
                            } else {
                              setProofImageUrl(null);   // 避免混用前一次的 URL
                              setProofRegIdToFetch(reg.id);
                            }
                          }}
                          title="查看付款憑證"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                    </div>
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
            共 {sortedFiltered.length} 筆資料
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

      <PaymentProofDialog
        open={!!proofImageUrl || !!proofRegIdToFetch}
        onOpenChange={(open) => {
          if (!open) {
            setProofImageUrl(null);
            setProofRegIdToFetch(null);
            setProofViewingContext(null);
          }
        }}
        imageUrl={proofImageUrl ?? (proofRegData ? getPaymentProofUrl(proofRegData) : null)}
        isLoading={!!proofRegIdToFetch && !proofRegData}
        context={proofViewingContext ?? (proofRegData ? { contact_name: proofRegData.contact_name, ref_code: proofRegData.ref_code, pay_proof_last5: proofRegData.pay_proof_last5 ?? undefined } : null)}
        onRetry={!!proofRegIdToFetch ? () => refetchProof() : undefined}
      />

      {/* 已付款 → 尚未付款：確認後一併清除資料庫中的付款憑證 */}
      <AlertDialog open={!!pendingUnpaidReg} onOpenChange={(open) => !open && setPendingUnpaidReg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定改為「尚未付款」？</AlertDialogTitle>
            <AlertDialogDescription>
              此報名目前為「已付款」。若改為「尚未付款」，系統將同時刪除該筆的付款憑證（圖片與末五碼），且無法復原。確定要變更嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPaidToUnpaid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              確定變更
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
