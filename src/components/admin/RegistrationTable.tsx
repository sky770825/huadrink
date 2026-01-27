import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { REGISTRATION_TYPE_LABELS } from '@/lib/constants';
import { Search, Download, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { Registration } from '@/types/registration';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/googleSheets';
import { useToast } from '@/hooks/use-toast';
import { useDeleteRegistration } from '@/hooks/useRegistrations';

interface RegistrationTableProps {
  registrations: Registration[];
  onViewDetail: (id: string) => void;
}

export function RegistrationTable({ registrations, onViewDetail }: RegistrationTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const deleteRegistration = useDeleteRegistration();

  const filtered = registrations.filter((reg) => {
    const matchesSearch = 
      reg.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      reg.ref_code.toLowerCase().includes(search.toLowerCase()) ||
      reg.phone.includes(search);
    
    const matchesType = typeFilter === 'all' || reg.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋姓名、公司、編號或手機..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-luxury"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] input-luxury">
            <SelectValue placeholder="類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="external">外部來賓</SelectItem>
            <SelectItem value="internal">內部夥伴</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToCSV} className="gap-2">
          <Download className="w-4 h-4" />
          匯出 CSV
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-medium">報名編號</TableHead>
              <TableHead className="font-medium">類型</TableHead>
              <TableHead className="font-medium">聯絡人</TableHead>
              <TableHead className="font-medium text-center">人數</TableHead>
              <TableHead className="font-medium">報名時間</TableHead>
              <TableHead className="font-medium text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  沒有符合條件的報名資料
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((reg) => (
                <TableRow key={reg.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-sm">{reg.ref_code}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(reg.type)}>
                      {reg.type === 'vip' ? 'VIP' : reg.type === 'internal' ? '內部' : '外部'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{reg.contact_name}</TableCell>
                  <TableCell className="text-center">{reg.headcount}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
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
