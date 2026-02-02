import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Save } from 'lucide-react';
import type { SystemSettings } from '@/types/registration';

/** 將 ISO 字串轉成 datetime-local 的 value（YYYY-MM-DDTHH:mm） */
function toDatetimeLocal(iso: string): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** 將 datetime-local 的 value 轉成 ISO 字串（保留本地時間，以 +08:00 儲存） */
function fromDatetimeLocal(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}:${sec}+08:00`;
}

const REGISTRATION_MODE_LABELS: Record<string, string> = {
  open: '開放報名',
  closed: '關閉報名',
  waitlist: '候補登記',
};

export function SystemSettingsPanel() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  const { toast } = useToast();

  const [registrationMode, setRegistrationMode] = useState<SystemSettings['registration_mode']>('open');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (settings) {
      setRegistrationMode(settings.registration_mode);
      setDeadline(toDatetimeLocal(settings.deadline));
    }
  }, [settings]);

  const handleSave = async () => {
    const deadlineValue = deadline?.trim() ? fromDatetimeLocal(deadline) : '';
    if (!deadlineValue) {
      toast({
        title: '請填寫報名截止時間',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }
    try {
      await updateSetting.mutateAsync({ key: 'registration_mode', value: registrationMode });
      await updateSetting.mutateAsync({ key: 'deadline', value: deadlineValue });
      toast({
        title: '已儲存',
        description: '系統設定已更新，前台將依新報名時間與狀態顯示。',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-primary shrink-0" />
        <h2 className="font-serif text-xl md:text-2xl font-semibold">系統設定</h2>
      </div>

      <div className="space-y-6 max-w-xl">
        <div>
          <Label className="text-sm font-medium">報名狀態</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            控制前台是否開放報名、僅候補或關閉。與報名截止時間共同決定前台顯示。
          </p>
          <Select
            value={registrationMode}
            onValueChange={(v) => setRegistrationMode(v as SystemSettings['registration_mode'])}
          >
            <SelectTrigger className="input-luxury w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{REGISTRATION_MODE_LABELS.open}</SelectItem>
              <SelectItem value="closed">{REGISTRATION_MODE_LABELS.closed}</SelectItem>
              <SelectItem value="waitlist">{REGISTRATION_MODE_LABELS.waitlist}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">報名截止時間</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            前台倒數與「報名截止」顯示依此時間。儲存後首頁與報名頁會更新。
          </p>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input-luxury w-full sm:w-[240px]"
          />
          {deadline && (
            <p className="text-xs text-muted-foreground mt-2">
              目前設定：{new Date(fromDatetimeLocal(deadline)).toLocaleString('zh-TW')}
            </p>
          )}
        </div>

        <Button
          onClick={() => void handleSave()}
          disabled={updateSetting.isPending}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {updateSetting.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          儲存設定
        </Button>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border/50">
          若儲存後前台未更新，請確認 Supabase 的 system_settings 表已有 key 為 registration_mode、deadline 的資料列（可手動新增或於 SQL Editor 執行 INSERT）。
        </p>
      </div>
    </div>
  );
}
