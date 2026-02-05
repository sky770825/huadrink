import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { REGISTRATION_TYPE_LABELS, EVENT_INFO } from '@/lib/constants';
import { getMemberByContactName } from '@/lib/members';
import { useMembers } from '@/hooks/useMembers';
import type { Registration } from '@/types/registration';
import { Link } from 'react-router-dom';

interface SuccessPageProps {
  registration: Registration;
}

export function SuccessPage({ registration }: SuccessPageProps) {
  const { toast } = useToast();
  const { members } = useMembers();

  return (
    <div className="min-h-screen marble-bg py-12 md:py-20">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="glass-card rounded-2xl p-8 md:p-12 text-center animate-fade-in-up">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-green-500/10">
              <CheckCircle className="w-12 h-12 text-green-500" strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-2">
            報名成功
          </h1>
          <p className="text-muted-foreground mb-8">
            感謝您的報名，我們已收到您的資料
          </p>

          {/* Reference Code */}
          <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 mb-8">
            <p className="text-sm text-muted-foreground mb-2">您的報名編號</p>
            <p className="font-serif text-2xl md:text-3xl font-semibold text-primary tracking-wider">
              {registration.ref_code}
            </p>
          </div>

          {/* Summary */}
          <div className="text-left space-y-4 mb-8">
            <h3 className="font-serif text-xl font-semibold text-foreground">
              報名摘要
            </h3>
            <div className="p-4 rounded-xl bg-muted/30 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">報名類型</span>
                <span className="font-medium">{REGISTRATION_TYPE_LABELS[registration.type]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">參加人數</span>
                <span className="font-medium">{registration.headcount} 人</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">聯絡人</span>
                <span className="font-medium">
                  {registration.type === 'internal'
                    ? (() => {
                        const member = getMemberByContactName(registration.contact_name, members);
                        return member
                          ? `編號 ${member.id} － ${registration.contact_name}`
                          : registration.contact_name;
                      })()
                    : registration.contact_name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">報名狀態</span>
                <span className="font-medium text-green-600">
                  已報名
                </span>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <Link to="/">
            <Button variant="ghost" className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              返回首頁
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
