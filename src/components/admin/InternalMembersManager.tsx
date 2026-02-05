import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useInternalMembers, type InternalMemberRow } from '@/hooks/useInternalMembers';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Trash2, Pencil, Download, Upload } from 'lucide-react';

const CSV_HEADER = '編號,姓名,專業別,電話';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',' || c === '，') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

export function InternalMembersManager() {
  const {
    data: members,
    isLoading,
    isError,
    refetch,
    addMember,
    addMemberPending,
    importMembers,
    importMembersPending,
    updateMember,
    updateMemberPending,
    deleteMember,
    deleteMemberPending,
  } = useInternalMembers();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<InternalMemberRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(newId, 10);
    if (Number.isNaN(id) || id < 1) {
      toast({ title: '請輸入有效的成員編號（正整數）', variant: 'destructive' });
      return;
    }
    const name = newName.trim();
    if (!name) {
      toast({ title: '請輸入成員姓名', variant: 'destructive' });
      return;
    }
    if (members.some((m) => m.id === id)) {
      toast({ title: `編號 ${id} 已存在`, variant: 'destructive' });
      return;
    }
    try {
      await addMember({
        id,
        name,
        specialty: newSpecialty.trim() || undefined,
        phone: newPhone.trim() || undefined,
      });
      toast({ title: '已新增成員', description: `${id}. ${name}` });
      setNewId('');
      setNewName('');
      setNewSpecialty('');
      setNewPhone('');
    } catch (err) {
      toast({
        title: '新增失敗',
        description: err instanceof Error ? err.message : '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId == null) return;
    try {
      await deleteMember(deleteTargetId);
      toast({ title: '已刪除成員' });
      setDeleteTargetId(null);
    } catch (err) {
      toast({
        title: '刪除失敗',
        description: err instanceof Error ? err.message : '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const handleExportCsv = () => {
    const bom = '\uFEFF';
    const rows = members.map((m) =>
      [m.id, `"${(m.name || '').replace(/"/g, '""')}"`, `"${(m.specialty || '').replace(/"/g, '""')}"`, `"${(m.phone || '').replace(/"/g, '""')}"`].join(',')
    );
    const csv = bom + CSV_HEADER + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `內部成員名單_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '已匯出 CSV' });
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((s) => s.trim());
    if (lines.length < 2) {
      toast({ title: 'CSV 至少需有標題列與一筆資料', variant: 'destructive' });
      return;
    }
    const dataRows: { id: number; name: string; specialty: string; phone: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const id = parseInt(cols[0] ?? '0', 10);
      const name = (cols[1] ?? '').replace(/^"|"$/g, '').trim();
      if (Number.isNaN(id) || id < 1 || !name) continue;
      dataRows.push({
        id,
        name,
        specialty: (cols[2] ?? '').replace(/^"|"$/g, '').trim(),
        phone: (cols[3] ?? '').replace(/^"|"$/g, '').trim(),
      });
    }
    if (dataRows.length === 0) {
      toast({ title: '沒有可匯入的有效資料列', variant: 'destructive' });
      return;
    }
    try {
      await importMembers(dataRows);
      toast({ title: '匯入完成', description: `已寫入 ${dataRows.length} 筆` });
    } catch (err) {
      toast({
        title: '匯入失敗',
        description: err instanceof Error ? err.message : '請檢查 CSV 格式',
        variant: 'destructive',
      });
    }
  };

  const openEdit = (m: InternalMemberRow) => {
    setEditTarget(m);
    setEditName(m.name);
    setEditSpecialty(m.specialty ?? '');
    setEditPhone(m.phone ?? '');
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) {
      toast({ title: '請輸入姓名', variant: 'destructive' });
      return;
    }
    try {
      await updateMember({
        id: editTarget.id,
        name,
        specialty: editSpecialty.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      toast({ title: '已更新成員' });
      setEditTarget(null);
    } catch (err) {
      toast({
        title: '更新失敗',
        description: err instanceof Error ? err.message : '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        此名單用於報名表「內部夥伴」選項與「來賓來源」選單。資料儲存於資料庫，新增或刪除後會即時更新。
      </p>

      {/* 匯入 / 匯出 CSV */}
      <div className="glass-card rounded-xl p-4 sm:p-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">批次作業</span>
        <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={isLoading || members.length === 0} className="gap-2">
          <Download className="w-4 h-4" />
          匯出 CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={importMembersPending}
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          {importMembersPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          匯入 CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCsv}
        />
        <span className="text-xs text-muted-foreground">
          CSV 格式：編號,姓名,專業別,電話（第一列為標題）。匯入時已存在編號會覆寫該筆資料。
        </span>
      </div>

      {/* 新增表單 */}
      <div className="glass-card rounded-xl p-4 sm:p-6">
        <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          新增成員
        </h3>
        <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <Label htmlFor="new-id">編號</Label>
            <Input
              id="new-id"
              type="number"
              min={1}
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="例：112"
              className="input-luxury mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-name">姓名</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="必填"
              className="input-luxury mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-specialty">專業別（選填）</Label>
            <Input
              id="new-specialty"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="例：包租代管-北投"
              className="input-luxury mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-phone">電話（選填）</Label>
            <Input
              id="new-phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="0912-345-678"
              className="input-luxury mt-1"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={addMemberPending} className="gap-2">
              {addMemberPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              新增
            </Button>
          </div>
        </form>
      </div>

      {/* 名單列表 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <h3 className="font-serif text-lg font-semibold p-4 sm:p-6 pb-0">目前名單</h3>
        {isError && (
          <div className="p-4 sm:p-6">
            <p className="text-sm text-destructive mb-2">無法載入名單（請確認資料表已建立）</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              重試
            </Button>
          </div>
        )}
        {!isError && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {!isError && !isLoading && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-medium w-20">編號</TableHead>
                  <TableHead className="font-medium">姓名</TableHead>
                  <TableHead className="font-medium hidden sm:table-cell">專業別</TableHead>
                  <TableHead className="font-medium hidden md:table-cell">電話</TableHead>
                  <TableHead className="font-medium text-right w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      尚無成員，請在上方新增。若您剛建立資料表，可先執行 migration 寫入一筆後再於此管理。
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.id}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                        {m.specialty || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{m.phone || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            disabled={updateMemberPending}
                            onClick={() => openEdit(m)}
                            title="編輯"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            disabled={deleteMemberPending}
                            onClick={() => setDeleteTargetId(m.id)}
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 編輯成員對話框 */}
      <Dialog open={editTarget != null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>編輯成員 {editTarget ? `（編號 ${editTarget.id}）` : ''}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">姓名</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="必填"
                className="input-luxury mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-specialty">專業別（選填）</Label>
              <Input
                id="edit-specialty"
                value={editSpecialty}
                onChange={(e) => setEditSpecialty(e.target.value)}
                placeholder="例：包租代管-北投"
                className="input-luxury mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">電話（選填）</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="0912-345-678"
                className="input-luxury mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button onClick={handleEditSave} disabled={updateMemberPending} className="gap-2">
              {updateMemberPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargetId != null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除此成員？</AlertDialogTitle>
            <AlertDialogDescription>
              編號 {deleteTargetId} 將從內部成員名單中移除，報名表與來賓來源選單將不再顯示此選項。已報名資料不會被修改。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMemberPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
