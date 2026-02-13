import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { FormSection } from './FormCard';
import { REGISTRATION_TYPE_LABELS, EVENT_INFO } from '@/lib/constants';
import { getUnregisteredInternalMembers } from '@/lib/members';
import { useMembers } from '@/hooks/useMembers';
import type { RegistrationFormData } from '@/types/registration';
import { Calendar, Clock, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Step1FormProps {
  form: UseFormReturn<RegistrationFormData>;
  /** 已存在的報名名單，用以排除已報名的內部成員（與後台連動） */
  registrations?: Array<{ type: string; contact_name?: string | null }>;
}

export function Step1Form({ form, registrations = [] }: Step1FormProps) {
  const { members } = useMembers();
  const availableMembers = getUnregisteredInternalMembers(registrations, members);
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
            <MemberCombobox
              form={form}
              members={availableMembers}
              allMembers={members}
              watchMemberId={watchMemberId}
            />
          )}
        </div>
      </FormSection>
    </div>
  );
}

// 可搜尋的成員選擇組件（Combobox）- 優化大量成員的選擇體驗
interface MemberComboboxProps {
  form: UseFormReturn<RegistrationFormData>;
  members: Array<{ id: number; name: string; specialty: string }>;
  allMembers: Array<{ id: number; name: string; specialty: string }>;
  watchMemberId?: number;
}

function MemberCombobox({ form, members, allMembers, watchMemberId }: MemberComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedMember = watchMemberId
    ? allMembers.find((m) => m.id === watchMemberId)
    : null;

  return (
    <div>
      <h3 className="font-serif text-lg font-semibold text-foreground mb-4">
        選擇內部成員
      </h3>
      <FormField
        control={form.control}
        name="member_id"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>
              名稱與編號
              <span className="text-destructive ml-1">*</span>
            </FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      'w-full justify-between input-luxury',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    {selectedMember
                      ? `${selectedMember.id}. ${selectedMember.name}`
                      : '請選擇或搜尋內部成員'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command
                  filter={(value, search) => {
                    const member = members.find((m) => m.id.toString() === value);
                    if (!member) return 0;
                    const searchLower = search.toLowerCase();
                    const matchId = member.id.toString().includes(searchLower);
                    const matchName = member.name.toLowerCase().includes(searchLower);
                    const matchSpecialty = member.specialty.toLowerCase().includes(searchLower);
                    return matchId || matchName || matchSpecialty ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="搜尋編號、姓名或專業..." />
                  <CommandList>
                    {members.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        所有內部成員皆已報名
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>找不到符合的成員</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {members.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={member.id.toString()}
                              onSelect={(value) => {
                                const memberId = parseInt(value);
                                field.onChange(memberId);
                                const selected = allMembers.find((m) => m.id === memberId);
                                if (selected) {
                                  form.setValue('contact_name', selected.name);
                                }
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  watchMemberId === member.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {member.id}. {member.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {member.specialty}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
            {watchMemberId && (
              <p className="text-sm text-muted-foreground mt-2">
                已選擇：{members.find((m) => m.id === watchMemberId)?.name ?? allMembers.find((m) => m.id === watchMemberId)?.name}
              </p>
            )}
          </FormItem>
        )}
      />
    </div>
  );
}
