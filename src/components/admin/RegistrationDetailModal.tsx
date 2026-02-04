import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRegistration, useUpdateRegistration } from '@/hooks/useRegistrations';
import { useToast } from '@/hooks/use-toast';
import { REGISTRATION_TYPE_LABELS, DIET_TYPE_LABELS, PAYMENT_STATUS_LABELS, SEAT_ZONE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';
import { Loader2, Save, ExternalLink, CreditCard, Eye } from 'lucide-react';
import { getPaymentProofUrl } from '@/lib/utils';
import { PaymentProofButton } from '@/components/admin/PaymentProofDialog';
import { format } from 'date-fns';
import type { PaymentStatus, SeatZone } from '@/types/registration';

interface RegistrationDetailModalProps {
  registrationId: string | null;
  onClose: () => void;
}

export function RegistrationDetailModal({ registrationId, onClose }: RegistrationDetailModalProps) {
  const { data: registration, isLoading } = useRegistration(registrationId || '');
  const updateMutation = useUpdateRegistration();
  const { toast } = useToast();

  const [payStatus, setPayStatus] = useState<PaymentStatus | ''>('');
  const [seatZone, setSeatZone] = useState<SeatZone | ''>('');
  const [tableNo, setTableNo] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');

  // Initialize form when registration loads
  if (registration && payStatus === '') {
    setPayStatus(registration.pay_status);
    setSeatZone(registration.seat_zone || '');
    setTableNo(registration.table_no?.toString() || '');
    setAdminNote(registration.admin_note || '');
  }

  const handleSave = async () => {
    if (!registrationId) return;

    try {
      await updateMutation.mutateAsync({
        id: registrationId,
        updates: {
          pay_status: payStatus as PaymentStatus,
          seat_zone: seatZone as SeatZone || null,
          table_no: tableNo ? parseInt(tableNo) : null,
          admin_note: adminNote || null,
        },
      });

      toast({
        title: '儲存成功',
        description: '報名資料已更新',
        duration: 3000,
      });
      handleClose();
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: '請稍後再試',
        variant: 'destructive',
        duration: 4000,
      });
    }
  };

  const handleClose = () => {
    setPayStatus('');
    setSeatZone('');
    setTableNo('');
    setAdminNote('');
    onClose();
  };

  return (
    <Dialog open={!!registrationId} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden min-w-0" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">報名詳情</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : registration ? (
          <div className="space-y-6">
            {/* Reference Code */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">報名編號</p>
              <p className="font-mono text-lg font-semibold text-primary">
                {registration.ref_code}
              </p>
            </div>

            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">報名類型</Label>
                <p className="font-medium">{REGISTRATION_TYPE_LABELS[registration.type]}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">參加人數</Label>
                <p className="font-medium">{registration.headcount} 人</p>
              </div>
              <div>
                <Label className="text-muted-foreground">聯絡人</Label>
                <p className="font-medium">
                  {registration.type === 'internal' ? (() => {
                    const member = getMemberByContactName(registration.contact_name);
                    return member
                      ? `編號 ${member.id} － ${registration.contact_name}`
                      : registration.contact_name;
                  })() : registration.contact_name}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">手機</Label>
                <p className="font-medium">{registration.phone}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{registration.email || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">LINE ID</Label>
                <p className="font-medium">{registration.line_id || '-'}</p>
              </div>
            </div>

            <Separator />

            {/* Attendees */}
            {registration.attendee_list && registration.attendee_list.length > 0 && (
              <>
                <div>
                  <Label className="text-muted-foreground mb-2 block">同行名單</Label>
                  <div className="space-y-2">
                    {registration.attendee_list.map((attendee, index) => (
                      <div key={index} className="flex gap-4 p-2 rounded-lg bg-muted/30">
                        <span className="font-medium">{attendee.name}</span>
                        {attendee.phone && (
                          <span className="text-muted-foreground">{attendee.phone}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Diet & Notes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">飲食需求</Label>
                <p className="font-medium">
                  {DIET_TYPE_LABELS[registration.diet]}
                  {registration.diet_other && ` - ${registration.diet_other}`}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">同意拍照</Label>
                <Badge variant={registration.photo_consent ? 'default' : 'secondary'}>
                  {registration.photo_consent ? '同意' : '不同意'}
                </Badge>
              </div>
              {registration.allergy_note && (
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground">過敏/備註</Label>
                  <p className="font-medium">{registration.allergy_note}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* 收款說明 */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">收款／核准</p>
                <p className="text-muted-foreground">
                  確認收到款項後，請將付款狀態改為「已付款」並點擊儲存；或直接點「確認已收款」一鍵核准。
                </p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">付款方式</Label>
                <p className="font-medium">{PAYMENT_METHOD_LABELS[registration.pay_method]}</p>
              </div>
              {registration.pay_proof_last5 && (
                <div>
                  <Label className="text-muted-foreground">匯款末五碼</Label>
                  <p className="font-mono font-medium">{registration.pay_proof_last5}</p>
                </div>
              )}
              {(getPaymentProofUrl(registration) || registration.pay_proof_last5) && (
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground">付款憑證</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <PaymentProofButton
                      imageUrl={getPaymentProofUrl(registration)}
                      registrationId={registration.id}
                      context={{ contact_name: registration.contact_name, ref_code: registration.ref_code, pay_proof_last5: registration.pay_proof_last5 ?? undefined }}
                    />
                  </div>
                </div>
              )}
            </div>


            <Separator />

            {/* Editable Fields */}
            <div className="space-y-4 p-4 rounded-xl bg-muted/20">
              <h4 className="font-serif text-lg font-semibold">管理設定</h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>付款狀態</Label>
                  <div className="flex items-center gap-2">
                    <Select value={payStatus} onValueChange={(v) => setPayStatus(v as PaymentStatus)}>
                    <SelectTrigger className="input-luxury">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">已付款</SelectItem>
                      <SelectItem value="unpaid">尚未付款</SelectItem>
                      <SelectItem value="pending">審核付款</SelectItem>
                    </SelectContent>
                  </Select>
                    {(payStatus === 'unpaid' || payStatus === 'pending') && (
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 shrink-0"
                        disabled={updateMutation.isPending}
                        onClick={async () => {
                          if (!registrationId) return;
                          try {
                            await updateMutation.mutateAsync({
                              id: registrationId,
                              updates: {
                                pay_status: 'paid',
                                seat_zone: seatZone as SeatZone || null,
                                table_no: tableNo ? parseInt(tableNo) : null,
                                admin_note: adminNote || null,
                              },
                            });
                            setPayStatus('paid');
                            toast({
                              title: '已核准收款',
                              description: '付款狀態已改為「已付款」。',
                              duration: 3000,
                            });
                            handleClose();
                          } catch (e) {
                            toast({
                              title: '更新失敗',
                              description: e instanceof Error ? e.message : '請稍後再試',
                              variant: 'destructive',
                              duration: 4000,
                            });
                          }
                        }}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        確認已收款
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label>座位區</Label>
                  <Select value={seatZone} onValueChange={(v) => setSeatZone(v as SeatZone)}>
                    <SelectTrigger className="input-luxury">
                      <SelectValue placeholder="選擇座位區" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP區</SelectItem>
                      <SelectItem value="general">一般區</SelectItem>
                      <SelectItem value="internal">內部區</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>桌號</Label>
                  <Input
                    type="number"
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                    placeholder="輸入桌號"
                    className="input-luxury"
                  />
                </div>
              </div>

              <div>
                <Label>管理備註</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="內部備註，不會顯示給報名者"
                  className="input-luxury min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground">
              <p>報名時間：{format(new Date(registration.created_at), 'yyyy/MM/dd HH:mm:ss')}</p>
              <p>最後更新：{format(new Date(registration.updated_at), 'yyyy/MM/dd HH:mm:ss')}</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                儲存
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">找不到報名資料</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
