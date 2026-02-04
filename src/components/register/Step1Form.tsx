import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from './FormCard';
import { REGISTRATION_TYPE_LABELS, EVENT_INFO } from '@/lib/constants';
import { MEMBERS, getUnregisteredInternalMembers } from '@/lib/members';
import type { RegistrationFormData } from '@/types/registration';
import { Calendar, Clock } from 'lucide-react';

interface Step1FormProps {
  form: UseFormReturn<RegistrationFormData>;
  /** 已存在的報名名單，用以排除已報名的內部成員（與後台連動） */
  registrations?: Array<{ type: string; contact_name?: string | null }>;
}

export function Step1Form({ form, registrations = [] }: Step1FormProps) {
  const availableMembers = getUnregisteredInternalMembers(registrations);
  const watchType = form.watch('type');
  const watchMemberId = form.watch('member_id');

  return (
    <div className="space-y-8">
      {/* Event Preview */}
      <FormSection title="活動資訊" description="請確認活動時間">
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-serif text-lg font-semibold text-foreground mb-1">
                    活動日期
                  </h4>
                  <p className="text-base text-muted-foreground">
                    {EVENT_INFO.date}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-serif text-lg font-semibold text-foreground mb-1">
                    活動時間
                  </h4>
                  <p className="text-base text-muted-foreground">
                    {EVENT_INFO.checkInTime} 入場
                  </p>
                  <p className="text-base text-muted-foreground">
                    {EVENT_INFO.startTime} 正式開始
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Type */}
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground mb-4">
              報名類型
            </h3>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        // 切換類型時清除成員選擇
                        if (value !== 'internal') {
                          form.setValue('member_id', undefined);
                        }
                      }}
                      value={field.value}
                      className="grid gap-3"
                    >
                      {Object.entries(REGISTRATION_TYPE_LABELS)
                        .filter(([value]) => value !== 'vip')
                        .map(([value, label]) => (
                          <label
                            key={value}
                            className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer transition-all hover:border-primary/30 hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                          >
                            <RadioGroupItem value={value} className="text-primary" />
                            <span className="text-sm font-medium">{label}</span>
                          </label>
                        ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Member Selection (for internal only) */}
          {watchType === 'internal' && (
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground mb-4">
                選擇內部成員
              </h3>
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      名稱與編號
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <Select
                      value={field.value !== undefined && field.value !== null ? field.value.toString() : ''}
                      onValueChange={(value) => {
                        if (value) {
                          const memberId = parseInt(value);
                          field.onChange(memberId);
                          // 自動填充姓名到 contact_name
                          const member = MEMBERS.find(m => m.id === memberId);
                          if (member) {
                            form.setValue('contact_name', member.name);
                          }
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="input-luxury">
                          <SelectValue placeholder="請選擇內部成員" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {availableMembers.length === 0 ? (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            所有內部成員皆已報名
                          </div>
                        ) : (
                          availableMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {member.id}. {member.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {member.specialty}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {watchMemberId && (
                      <p className="text-sm text-muted-foreground mt-2">
                        已選擇：{availableMembers.find(m => m.id === watchMemberId)?.name ?? MEMBERS.find(m => m.id === watchMemberId)?.name}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}
