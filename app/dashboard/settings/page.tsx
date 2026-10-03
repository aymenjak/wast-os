'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import {
  Settings, Building2, Bell, Globe, Shield, Database,
  Map, Truck, Recycle, CreditCard, FileText, Cpu,
  Check, ChevronRight, type LucideIcon,
} from 'lucide-react';

interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

const sections: SettingsSection[] = [
  { id: 'organization', label: 'المؤسسة', icon: Building2 },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'localization', label: 'التوطين', icon: Globe },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'integrations', label: 'التكاملات', icon: Cpu },
  { id: 'waste-types', label: 'أنواع النفايات', icon: Recycle },
  { id: 'sla', label: 'إعداد الخدمة', icon: FileText },
  { id: 'billing', label: 'الفوترة والضريبة', icon: CreditCard },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors shrink-0',
        enabled ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
          enabled && 'translate-x-5'
        )}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('organization');

  const [notifSettings, setNotifSettings] = useState({
    pushReport: true,
    pushSla: true,
    pushIot: true,
    emailDaily: false,
    emailWeekly: true,
    smsCritical: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: true,
    sessionTimeout: true,
    auditLog: true,
    ipRestriction: false,
    passwordExpiry: true,
  });

  const [integrations, setIntegrations] = useState({
    mapProvider: true,
    smsProvider: false,
    emailProvider: true,
    iotPlatform: true,
    aiProvider: true,
    paymentProvider: false,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="الإعدادات" description="تكوين منصتك ومؤسستك وتفضيلات النظام" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{section.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3">
          {activeSection === 'organization' && (
            <SettingsCard icon={Building2} title="المؤسسة" description="تكوين بلديتك وتفاصيل المستأجر">
              <div className="space-y-4 py-4">
                <FieldInput label="اسم المؤسسة" value="بلدية الجزائر الوسط" />
                <FieldInput label="الدولة" value="الجزائر" />
                <FieldInput label="الولاية" value="ولاية الجزائر (16)" />
                <FieldInput label="رمز البلدية" value="DZ-16-16001" />
                <FieldInput label="البريد الإلكتروني" value="admin@mairie-alger.dz" />
                <FieldInput label="الهاتف" value="+213 21 12 34 56" />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">حفظ التغييرات</button>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'notifications' && (
            <SettingsCard icon={Bell} title="الإشعارات" description="إدارة وقت وكيفية استلام التنبيهات">
              <div className="divide-y divide-border">
                <SettingRow title="تنبيهات البلاغات الجديدة" description="الحصول على إشعار عند إرسال مواطن لبلاغ جديد">
                  <Toggle enabled={notifSettings.pushReport} onChange={() => setNotifSettings(p => ({ ...p, pushReport: !p.pushReport }))} />
                </SettingRow>
                <SettingRow title="تصعيد الخدمة" description="تنبيهات عند تعرض مستوى الخدمة للخطر أو اختراقه">
                  <Toggle enabled={notifSettings.pushSla} onChange={() => setNotifSettings(p => ({ ...p, pushSla: !p.pushSla }))} />
                </SettingRow>
                <SettingRow title="تنبيهات حاويات إنترنت الأشياء" description="تنبيهات مستوى الامتلاء ودرجة الحرارة وانقطاع المستشعر">
                  <Toggle enabled={notifSettings.pushIot} onChange={() => setNotifSettings(p => ({ ...p, pushIot: !p.pushIot }))} />
                </SettingRow>
                <SettingRow title="ملخص يومي بالبريد" description="استلام ملخص عمليات يومي عند الساعة 8:00 صباحاً">
                  <Toggle enabled={notifSettings.emailDaily} onChange={() => setNotifSettings(p => ({ ...p, emailDaily: !p.emailDaily }))} />
                </SettingRow>
                <SettingRow title="تقرير أسبوعي بالبريد" description="تقرير أداء أسبوعي شامل كل اثنين">
                  <Toggle enabled={notifSettings.emailWeekly} onChange={() => setNotifSettings(p => ({ ...p, emailWeekly: !p.emailWeekly }))} />
                </SettingRow>
                <SettingRow title="رسائل قصيرة للتنبيهات الحرجة" description="رسالة نصية للبلاغات ذات الأولوية الحرجة واختراقات الخدمة">
                  <Toggle enabled={notifSettings.smsCritical} onChange={() => setNotifSettings(p => ({ ...p, smsCritical: !p.smsCritical }))} />
                </SettingRow>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'localization' && (
            <SettingsCard icon={Globe} title="التوطين" description="اللغة والمنطقة الزمنية والإعدادات الإقليمية">
              <div className="space-y-4 py-4">
                <FieldSelect label="اللغة الافتراضية" value="العربية" options={['العربية', 'Français', 'English']} />
                <FieldSelect label="دعم RTL" value="كشف تلقائي" options={['كشف تلقائي', 'دائماً RTL', 'دائماً LTR']} />
                <FieldSelect label="المنطقة الزمنية" value="أفريقيا/الجزائر (GMT+1)" options={['أفريقيا/الجزائر (GMT+1)', 'أوروبا/باريس (GMT+1)', 'UTC']} />
                <FieldSelect label="تنسيق التاريخ" value="DD/MM/YYYY" options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} />
                <FieldSelect label="العملة" value="دج (دينار جزائري)" options={['دج (دينار جزائري)', 'EUR (يورو)', 'USD (دولار)']} />
                <FieldSelect label="وحدات القياس" value="متري (كغ، كم)" options={['متري (كغ، كم)', 'إمبراطوري (رطل، ميل)']} />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">حفظ التغييرات</button>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'security' && (
            <SettingsCard icon={Shield} title="الأمان" description="المصادقة والتحكم في الوصول وإعدادات التدقيق">
              <div className="divide-y divide-border">
                <SettingRow title="المصادقة الثنائية" description="طلب 2FA لجميع حسابات المديرين والمشرفين">
                  <Toggle enabled={securitySettings.twoFactor} onChange={() => setSecuritySettings(p => ({ ...p, twoFactor: !p.twoFactor }))} />
                </SettingRow>
                <SettingRow title="انتهاء الجلسة" description="تسجيل خروج تلقائي للمستخدمين غير النشطين بعد 30 دقيقة">
                  <Toggle enabled={securitySettings.sessionTimeout} onChange={() => setSecuritySettings(p => ({ ...p, sessionTimeout: !p.sessionTimeout }))} />
                </SettingRow>
                <SettingRow title="تسجيل التدقيق" description="تسجيل جميع الإجراءات الحساسة مع المستخدم والوقت والتغييرات">
                  <Toggle enabled={securitySettings.auditLog} onChange={() => setSecuritySettings(p => ({ ...p, auditLog: !p.auditLog }))} />
                </SettingRow>
                <SettingRow title="تقييد IP" description="تقييد وصول المديرين إلى عناوين IP محددة">
                  <Toggle enabled={securitySettings.ipRestriction} onChange={() => setSecuritySettings(p => ({ ...p, ipRestriction: !p.ipRestriction }))} />
                </SettingRow>
                <SettingRow title="انتهاء كلمة المرور" description="فرض تغيير كلمة المرور كل 90 يوماً">
                  <Toggle enabled={securitySettings.passwordExpiry} onChange={() => setSecuritySettings(p => ({ ...p, passwordExpiry: !p.passwordExpiry }))} />
                </SettingRow>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'integrations' && (
            <SettingsCard icon={Cpu} title="التكاملات" description="ربط الخدمات الخارجية عبر واجهات المزودين">
              <div className="divide-y divide-border">
                <IntegrationRow icon={Map} title="مزود الخريطة" provider="OpenStreetMap" connected={integrations.mapProvider} onToggle={() => setIntegrations(p => ({ ...p, mapProvider: !p.mapProvider }))} />
                <IntegrationRow icon={Bell} title="مزود الرسائل القصيرة" provider="غير مُعد (وهمي)" connected={integrations.smsProvider} onToggle={() => setIntegrations(p => ({ ...p, smsProvider: !p.smsProvider }))} />
                <IntegrationRow icon={FileText} title="مزود البريد" provider="SMTP Relay" connected={integrations.emailProvider} onToggle={() => setIntegrations(p => ({ ...p, emailProvider: !p.emailProvider }))} />
                <IntegrationRow icon={Cpu} title="منصة إنترنت الأشياء" provider="MQTT Broker" connected={integrations.iotPlatform} onToggle={() => setIntegrations(p => ({ ...p, iotPlatform: !p.iotPlatform }))} />
                <IntegrationRow icon={Cpu} title="مزود الذكاء" provider="محرك وهمي" connected={integrations.aiProvider} onToggle={() => setIntegrations(p => ({ ...p, aiProvider: !p.aiProvider }))} />
                <IntegrationRow icon={CreditCard} title="مزود الدفع" provider="غير مُعد (وهمي)" connected={integrations.paymentProvider} onToggle={() => setIntegrations(p => ({ ...p, paymentProvider: !p.paymentProvider }))} />
              </div>
            </SettingsCard>
          )}

          {activeSection === 'waste-types' && (
            <SettingsCard icon={Recycle} title="أنواع النفايات" description="تكوين فئات النفايات المتاحة في النظام">
              <div className="py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['عامة', 'عضوية', 'بلاستيك', 'ورق', 'كرتون', 'زجاج', 'معدن', 'إلكترونية', 'إنشائية', 'طبية', 'خطرة', 'نفايات كبيرة', 'زيوت مستعملة', 'أخرى'].map((type) => (
                    <div key={type} className="flex items-center gap-2 p-2.5 rounded-lg border border-border">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm text-foreground flex-1">{type}</span>
                      <Check className="w-3.5 h-3.5 text-success" />
                    </div>
                  ))}
                </div>
                <button className="mt-4 flex items-center gap-1.5 px-3 h-8 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors w-full justify-center">
                  + إضافة فئة مخصصة
                </button>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'sla' && (
            <SettingsCard icon={FileText} title="إعداد مستوى الخدمة" description="تحديد أوقات الاستجابة حسب مستوى الأولوية">
              <div className="space-y-3 py-4">
                {[
                  { priority: 'CRITICAL', response: '30 دقيقة', resolution: '4 ساعات', color: 'bg-destructive/15 text-destructive' },
                  { priority: 'HIGH', response: 'ساعتان', resolution: '12 ساعة', color: 'bg-warning/15 text-warning' },
                  { priority: 'NORMAL', response: '24 ساعة', resolution: '72 ساعة', color: 'bg-info/15 text-info' },
                  { priority: 'LOW', response: '72 ساعة', resolution: '7 أيام', color: 'bg-muted text-muted-foreground' },
                ].map((sla) => (
                  <div key={sla.priority} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium font-mono', sla.color)}>
                      {sla.priority}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">وقت الاستجابة: </span>
                        <span className="font-medium text-foreground">{sla.response}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">وقت الحل: </span>
                        <span className="font-medium text-foreground">{sla.resolution}</span>
                      </div>
                    </div>
                    <button className="text-xs text-primary hover:underline">تعديل</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border text-xs text-muted-foreground">
                <Bell className="w-3.5 h-3.5" />
                يتم إشعار المشرفين عند تعرض مستوى الخدمة للخطر. يحدث التصعيد التلقائي عند الاختراق.
              </div>
            </SettingsCard>
          )}

          {activeSection === 'billing' && (
            <SettingsCard icon={CreditCard} title="الفوترة والضريبة" description="إعدادات الفواتير وقواعد الضريبة وشروط الدفع">
              <div className="space-y-4 py-4">
                <FieldInput label="بادئة الفاتورة" value="INV-2024-" />
                <FieldSelect label="شروط الدفع الافتراضية" value="صافي 30" options={['صافي 15', 'صافي 30', 'صافي 45', 'صافي 60']} />
                <FieldInput label="غرامة التأخير (%)" value="2.5" />
                <FieldInput label="نسبة الضريبة (%)" value="19" />
                <FieldSelect label="حساب الضريبة" value="لكل عنصر" options={['لكل عنصر', 'المجموع الفرعي', 'معفى']} />
                <FieldSelect label="العملة" value="دج" options={['دج', 'EUR', 'USD']} />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">حفظ التغييرات</button>
              </div>
            </SettingsCard>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, description, children }: { icon: typeof Settings; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldInput({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        type="text"
        defaultValue={value}
        className="w-full h-9 px-3 text-sm bg-muted/30 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
      />
    </div>
  );
}

function FieldSelect({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <select className="w-full h-9 px-3 text-sm bg-muted/30 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
        {options.map((opt) => (
          <option key={opt} value={opt} selected={opt === value}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function IntegrationRow({ icon: Icon, title, provider, connected, onToggle }: { icon: typeof Map; title: string; provider: string; connected: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', connected ? 'bg-success/10' : 'bg-muted')}>
          <Icon className={cn('w-5 h-5', connected ? 'text-success' : 'text-muted-foreground')} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{provider}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {connected ? (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <Check className="w-3.5 h-3.5" /> نشط
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">غير نشط</span>
        )}
        <Toggle enabled={connected} onChange={onToggle} />
      </div>
    </div>
  );
}
