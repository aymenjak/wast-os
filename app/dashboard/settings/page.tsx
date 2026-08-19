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
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'localization', label: 'Localization', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Cpu },
  { id: 'waste-types', label: 'Waste Types', icon: Recycle },
  { id: 'sla', label: 'SLA Configuration', icon: FileText },
  { id: 'billing', label: 'Billing & Tax', icon: CreditCard },
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
      <PageHeader title="Settings" description="Configure your platform, organization, and system preferences" />

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
            <SettingsCard icon={Building2} title="Organization" description="Configure your municipality and tenant details">
              <div className="space-y-4 py-4">
                <FieldInput label="Organization Name" value="Alger Centre Municipality" />
                <FieldInput label="Country" value="Algeria" />
                <FieldInput label="Wilaya" value="Wilaya d'Alger (16)" />
                <FieldInput label="Municipality Code" value="DZ-16-16001" />
                <FieldInput label="Contact Email" value="admin@mairie-alger.dz" />
                <FieldInput label="Contact Phone" value="+213 21 12 34 56" />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'notifications' && (
            <SettingsCard icon={Bell} title="Notifications" description="Manage when and how you receive alerts">
              <div className="divide-y divide-border">
                <SettingRow title="New Report Alerts" description="Get notified when a citizen submits a new report">
                  <Toggle enabled={notifSettings.pushReport} onChange={() => setNotifSettings(p => ({ ...p, pushReport: !p.pushReport }))} />
                </SettingRow>
                <SettingRow title="SLA Escalations" description="Alerts when SLA is at risk or breached">
                  <Toggle enabled={notifSettings.pushSla} onChange={() => setNotifSettings(p => ({ ...p, pushSla: !p.pushSla }))} />
                </SettingRow>
                <SettingRow title="IoT Container Alerts" description="Fill level, temperature, and sensor offline alerts">
                  <Toggle enabled={notifSettings.pushIot} onChange={() => setNotifSettings(p => ({ ...p, pushIot: !p.pushIot }))} />
                </SettingRow>
                <SettingRow title="Daily Email Summary" description="Receive a daily operations summary at 8:00 AM">
                  <Toggle enabled={notifSettings.emailDaily} onChange={() => setNotifSettings(p => ({ ...p, emailDaily: !p.emailDaily }))} />
                </SettingRow>
                <SettingRow title="Weekly Email Report" description="Comprehensive weekly performance report every Monday">
                  <Toggle enabled={notifSettings.emailWeekly} onChange={() => setNotifSettings(p => ({ ...p, emailWeekly: !p.emailWeekly }))} />
                </SettingRow>
                <SettingRow title="SMS for Critical Alerts" description="Text message for critical priority reports and SLA breaches">
                  <Toggle enabled={notifSettings.smsCritical} onChange={() => setNotifSettings(p => ({ ...p, smsCritical: !p.smsCritical }))} />
                </SettingRow>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'localization' && (
            <SettingsCard icon={Globe} title="Localization" description="Language, timezone, and regional settings">
              <div className="space-y-4 py-4">
                <FieldSelect label="Default Language" value="English" options={['English', 'Français', 'العربية']} />
                <FieldSelect label="RTL Support" value="Auto-detect" options={['Auto-detect', 'Always RTL', 'Always LTR']} />
                <FieldSelect label="Timezone" value="Africa/Algiers (GMT+1)" options={['Africa/Algiers (GMT+1)', 'Europe/Paris (GMT+1)', 'UTC']} />
                <FieldSelect label="Date Format" value="DD/MM/YYYY" options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} />
                <FieldSelect label="Currency" value="DZD (Algerian Dinar)" options={['DZD (Algerian Dinar)', 'EUR (Euro)', 'USD (US Dollar)']} />
                <FieldSelect label="Measurement Units" value="Metric (kg, km)" options={['Metric (kg, km)', 'Imperial (lb, mi)']} />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'security' && (
            <SettingsCard icon={Shield} title="Security" description="Authentication, access control, and audit settings">
              <div className="divide-y divide-border">
                <SettingRow title="Two-Factor Authentication" description="Require 2FA for all admin and manager accounts">
                  <Toggle enabled={securitySettings.twoFactor} onChange={() => setSecuritySettings(p => ({ ...p, twoFactor: !p.twoFactor }))} />
                </SettingRow>
                <SettingRow title="Session Timeout" description="Automatically log out inactive users after 30 minutes">
                  <Toggle enabled={securitySettings.sessionTimeout} onChange={() => setSecuritySettings(p => ({ ...p, sessionTimeout: !p.sessionTimeout }))} />
                </SettingRow>
                <SettingRow title="Audit Logging" description="Log all sensitive actions with user, timestamp, and changes">
                  <Toggle enabled={securitySettings.auditLog} onChange={() => setSecuritySettings(p => ({ ...p, auditLog: !p.auditLog }))} />
                </SettingRow>
                <SettingRow title="IP Restriction" description="Restrict admin access to specific IP addresses">
                  <Toggle enabled={securitySettings.ipRestriction} onChange={() => setSecuritySettings(p => ({ ...p, ipRestriction: !p.ipRestriction }))} />
                </SettingRow>
                <SettingRow title="Password Expiry" description="Force password reset every 90 days">
                  <Toggle enabled={securitySettings.passwordExpiry} onChange={() => setSecuritySettings(p => ({ ...p, passwordExpiry: !p.passwordExpiry }))} />
                </SettingRow>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'integrations' && (
            <SettingsCard icon={Cpu} title="Integrations" description="Connect external services via provider interfaces">
              <div className="divide-y divide-border">
                <IntegrationRow icon={Map} title="Map Provider" provider="OpenStreetMap" connected={integrations.mapProvider} onToggle={() => setIntegrations(p => ({ ...p, mapProvider: !p.mapProvider }))} />
                <IntegrationRow icon={Bell} title="SMS Provider" provider="Not configured (mock)" connected={integrations.smsProvider} onToggle={() => setIntegrations(p => ({ ...p, smsProvider: !p.smsProvider }))} />
                <IntegrationRow icon={FileText} title="Email Provider" provider="SMTP Relay" connected={integrations.emailProvider} onToggle={() => setIntegrations(p => ({ ...p, emailProvider: !p.emailProvider }))} />
                <IntegrationRow icon={Cpu} title="IoT Platform" provider="MQTT Broker" connected={integrations.iotPlatform} onToggle={() => setIntegrations(p => ({ ...p, iotPlatform: !p.iotPlatform }))} />
                <IntegrationRow icon={Cpu} title="AI Provider" provider="Mock AI Engine" connected={integrations.aiProvider} onToggle={() => setIntegrations(p => ({ ...p, aiProvider: !p.aiProvider }))} />
                <IntegrationRow icon={CreditCard} title="Payment Provider" provider="Not configured (mock)" connected={integrations.paymentProvider} onToggle={() => setIntegrations(p => ({ ...p, paymentProvider: !p.paymentProvider }))} />
              </div>
            </SettingsCard>
          )}

          {activeSection === 'waste-types' && (
            <SettingsCard icon={Recycle} title="Waste Types" description="Configure waste categories available in the system">
              <div className="py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['General', 'Organic', 'Plastic', 'Paper', 'Cardboard', 'Glass', 'Metal', 'Electronic', 'Construction', 'Medical', 'Hazardous', 'Large Waste', 'Used Oil', 'Other'].map((type) => (
                    <div key={type} className="flex items-center gap-2 p-2.5 rounded-lg border border-border">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm text-foreground flex-1">{type}</span>
                      <Check className="w-3.5 h-3.5 text-success" />
                    </div>
                  ))}
                </div>
                <button className="mt-4 flex items-center gap-1.5 px-3 h-8 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors w-full justify-center">
                  + Add Custom Category
                </button>
              </div>
            </SettingsCard>
          )}

          {activeSection === 'sla' && (
            <SettingsCard icon={FileText} title="SLA Configuration" description="Define response time targets by priority level">
              <div className="space-y-3 py-4">
                {[
                  { priority: 'CRITICAL', response: '30 min', resolution: '4 hr', color: 'bg-destructive/15 text-destructive' },
                  { priority: 'HIGH', response: '2 hr', resolution: '12 hr', color: 'bg-warning/15 text-warning' },
                  { priority: 'NORMAL', response: '24 hr', resolution: '72 hr', color: 'bg-info/15 text-info' },
                  { priority: 'LOW', response: '72 hr', resolution: '7 days', color: 'bg-muted text-muted-foreground' },
                ].map((sla) => (
                  <div key={sla.priority} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium font-mono', sla.color)}>
                      {sla.priority}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Response Time: </span>
                        <span className="font-medium text-foreground">{sla.response}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Resolution Time: </span>
                        <span className="font-medium text-foreground">{sla.resolution}</span>
                      </div>
                    </div>
                    <button className="text-xs text-primary hover:underline">Edit</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border text-xs text-muted-foreground">
                <Bell className="w-3.5 h-3.5" />
                Supervisors are notified when SLA is at risk. Automatic escalation occurs on breach.
              </div>
            </SettingsCard>
          )}

          {activeSection === 'billing' && (
            <SettingsCard icon={CreditCard} title="Billing & Tax" description="Invoice settings, tax rules, and payment terms">
              <div className="space-y-4 py-4">
                <FieldInput label="Invoice Prefix" value="INV-2024-" />
                <FieldSelect label="Default Payment Terms" value="Net 30" options={['Net 15', 'Net 30', 'Net 45', 'Net 60']} />
                <FieldInput label="Late Payment Penalty (%)" value="2.5" />
                <FieldInput label="VAT Rate (%)" value="19" />
                <FieldSelect label="Tax Calculation" value="Per-item" options={['Per-item', 'Subtotal', 'Exempt']} />
                <FieldSelect label="Currency" value="DZD" options={['DZD', 'EUR', 'USD']} />
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
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
            <Check className="w-3.5 h-3.5" /> Active
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Inactive</span>
        )}
        <Toggle enabled={connected} onChange={onToggle} />
      </div>
    </div>
  );
}
