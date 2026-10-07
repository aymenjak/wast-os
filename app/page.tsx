'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Recycle, ArrowRight, MapPin, Truck, AlertCircle, BarChart3,
  Brain, Users, Building2, Shield, Zap, Globe, CheckCircle2,
  Navigation, Trash2, Bell, FileText, ArrowUpRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-foreground text-sm tracking-tight">WASTE CITY OS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider hidden sm:block">Smart Waste Platform</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#modules" className="hover:text-foreground transition-colors">Modules</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
            <a href="#roles" className="hover:text-foreground transition-colors">Roles</a>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Launch Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <span className="relative w-2 h-2 rounded-full bg-primary">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
            </span>
            Operating system for your city's waste ecosystem
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
            The operating system for a city's
            <span className="text-primary"> waste ecosystem</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed">
            Connecting citizens, municipalities, businesses, waste companies, drivers,
            field teams, recyclers, fleet, IoT, and AI into one unified platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Explore the Command Center <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 h-12 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
            >
              See Features
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
            {[
              { value: '1,847t', label: 'Waste managed monthly' },
              { value: '68.2%', label: 'Recycling rate' },
              { value: '94.1%', label: 'SLA compliance' },
              { value: '47 min', label: 'Avg response time' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-display font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Everything a city needs to manage waste
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              From citizen reporting to fleet dispatch, from billing to AI predictions — all in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: AlertCircle, title: 'Citizen Reporting', desc: 'Citizens report problems with photos and GPS. AI classifies and prioritizes automatically.', color: 'text-info bg-info/10' },
              { icon: Bell, title: 'Work Order System', desc: 'Every operational action becomes a tracked work order with SLA monitoring and escalation.', color: 'text-primary bg-primary/10' },
              { icon: MapPin, title: 'Live Dispatch Map', desc: 'Real-time map of trucks, containers, reports, and incidents with filtering and clustering.', color: 'text-accent bg-accent/10' },
              { icon: Truck, title: 'Fleet Management', desc: 'Track vehicles, drivers, fuel, mileage, maintenance, and documents in one place.', color: 'text-warning bg-warning/10' },
              { icon: Trash2, title: 'Smart Containers', desc: 'Monitor fill levels, weight, and sensor data. Get alerts before containers overflow.', color: 'text-success bg-success/10' },
              { icon: Brain, title: 'AI Copilot', desc: 'Ask questions, get predictions, optimize routes, and detect anomalies with AI assistance.', color: 'text-chart-4 bg-chart-4/10' },
              { icon: BarChart3, title: 'Analytics & ESG', desc: 'Comprehensive dashboards for operations, finance, waste, and environmental reporting.', color: 'text-info bg-info/10' },
              { icon: Building2, title: 'B2B Portal', desc: 'Businesses request collections, track history, view invoices, and monitor recycling rates.', color: 'text-primary bg-primary/10' },
              { icon: Shield, title: 'Multi-Tenant Security', desc: 'Role-based access, tenant isolation, audit logs, and server-side authorization.', color: 'text-destructive bg-destructive/10' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                  <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl mb-4', feature.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-20 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              From report to resolution
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              The complete lifecycle of waste management, tracked end-to-end.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

            {[
              { icon: AlertCircle, title: 'Citizen Reports Problem', desc: 'Photo + GPS + description submitted via mobile app', side: 'left' },
              { icon: Brain, title: 'AI Classifies & Prioritizes', desc: 'Category, severity, confidence, and duplicate detection', side: 'right' },
              { icon: FileText, title: 'Work Order Created', desc: 'Automatic work order generation with SLA assignment', side: 'left' },
              { icon: Navigation, title: 'Team Dispatched', desc: 'Nearest available team assigned with route optimization', side: 'right' },
              { icon: CheckCircle2, title: 'Resolution & Proof', desc: 'Before/after photos, GPS verification, completion receipt', side: 'left' },
              { icon: BarChart3, title: 'Dashboard Updates', desc: 'KPIs, analytics, and citizen rating feed back into the system', side: 'right' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className={cn(
                  'relative flex items-center gap-6 mb-8 lg:mb-4',
                  step.side === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
                )}>
                  <div className="lg:w-1/2 lg:px-8">
                    <div className={cn(
                      'bg-card rounded-xl border border-border p-5 hover:border-primary/20 transition-colors',
                      step.side === 'right' ? 'lg:text-left' : 'lg:text-right'
                    )}>
                      <div className="flex items-center gap-3 mb-2" style={{ justifyContent: step.side === 'left' ? 'flex-end' : 'flex-start' }}>
                        <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 z-10 hidden lg:flex">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="lg:w-1/2" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="py-20 px-4 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Built for every stakeholder
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Role-based access control with granular permissions for every type of user.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              'Super Admin', 'Municipality Admin', 'Operations Manager', 'Dispatcher',
              'Supervisor', 'Driver', 'Field Worker', 'B2B Admin',
              'B2B User', 'Recycler Admin', 'Weighbridge Operator', 'Accountant',
              'Auditor', 'Citizen', 'Platform Admin', 'Municipality Manager',
            ].map((role) => (
              <div key={role} className="flex items-center gap-2 bg-card rounded-lg border border-border px-4 py-3 hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-12 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Ready to transform your city's waste operations?
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Launch the dashboard to explore the full platform with realistic demo data.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 mt-6"
              >
                Launch Command Center <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Recycle className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-semibold text-sm text-foreground">WASTE CITY OS</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> EN / FR / AR</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> RBAC + Multi-Tenant</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> AI-Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
