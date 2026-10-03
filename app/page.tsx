'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Recycle, ArrowLeft, MapPin, Truck, AlertCircle, BarChart3,
  Brain, Users, Building2, Shield, Zap, Globe, CheckCircle2,
  Navigation, Trash2, Bell, FileText, ArrowUpLeft,
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
              <div className="font-display font-semibold text-foreground text-sm tracking-tight">وست سيتي أو إس</div>
              <div className="text-[10px] text-muted-foreground tracking-wider hidden sm:block">منصة إدارة النفايات الذكية</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
            <a href="#modules" className="hover:text-foreground transition-colors">الوحدات</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">سير العمل</a>
            <a href="#roles" className="hover:text-foreground transition-colors">الأدوار</a>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            تسجيل الدخول <ArrowLeft className="w-4 h-4" />
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
            نظام التشغيل لمنظومة نفايات مدينتك
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.2]">
            نظام التشغيل لمنظومة
            <span className="text-primary"> نفايات المدينة</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed">
            يربط المواطنين والبلديات والشركات وسائقي الشاحنات وفرق الميدان ومرافق إعادة التدوير وأساطيل السيارات وإنترنت الأشياء والذكاء الاصطناعي في منصة موحدة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              دخول لوحة التحكم <ArrowLeft className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 h-12 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors"
            >
              استكشف المميزات
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
            {[
              { value: '1,847 طن', label: 'نفايات تُدار شهرياً' },
              { value: '68.2%', label: 'نسبة إعادة التدوير' },
              { value: '94.1%', label: 'الالتزام بمستوى الخدمة' },
              { value: '47 دقيقة', label: 'متوسط وقت الاستجابة' },
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
              كل ما تحتاجه المدينة لإدارة النفايات
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              من بلاغات المواطنين إلى إرسال الأسطول، من الفوترة إلى التنبؤات الذكية — كل ذلك في منصة واحدة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: AlertCircle, title: 'بلاغات المواطنين', desc: 'يبلّغ المواطنون عن المشاكل بالصور وتحديد الموقع. يصنّف الذكاء الاصطناعي ويرتّب البلاغات تلقائياً.', color: 'text-info bg-info/10' },
              { icon: Bell, title: 'نظام أوامر العمل', desc: 'كل عملية ميدانية تصبح أمر عمل مُتعقّب مع مراقبة مستوى الخدمة والتصعيد.', color: 'text-primary bg-primary/10' },
              { icon: MapPin, title: 'خريطة الإرسال المباشرة', desc: 'خريطة لحظية للشاحنات والحاويات والبلاغات والحادثات مع التصفية والتجميع.', color: 'text-accent bg-accent/10' },
              { icon: Truck, title: 'إدارة الأسطول', desc: 'تتبع المركبات والسائقين والوقود والمسافة والصيانة والوثائق في مكان واحد.', color: 'text-warning bg-warning/10' },
              { icon: Trash2, title: 'حاويات ذكية', desc: 'مراقبة مستوى الامتلاء والوزن وبيانات المستشعرات. تنبيهات قبل امتلاء الحاويات.', color: 'text-success bg-success/10' },
              { icon: Brain, title: 'مساعد الذكاء الاصطناعي', desc: 'اطرح أسئلة، احصل على تنبؤات، حسّن المسارات، واكتشف الحالات الشاذة بمساعدة الذكاء.', color: 'text-chart-4 bg-chart-4/10' },
              { icon: BarChart3, title: 'الإحصائيات وESG', desc: 'لوحات شاملة للعمليات والمالية والنفايات والتقارير البيئية.', color: 'text-info bg-info/10' },
              { icon: Building2, title: 'بوابة الأعمال', desc: 'تطلب الشركات عمليات الجمع وتتابع السجل وتستعرض الفواتير وتراقب نسب إعادة التدوير.', color: 'text-primary bg-primary/10' },
              { icon: Shield, title: 'أمان متعدد المستأجرين', desc: 'تحكم بالصلاحيات حسب الدور، عزل المستأجرين، سجلات تدقيق، وصلاحيات من جانب الخادم.', color: 'text-destructive bg-destructive/10' },
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
              من البلاغ إلى الحل
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              دورة حياة إدارة النفايات كاملة، متعقّبة من البداية إلى النهاية.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

            {[
              { icon: AlertCircle, title: 'المواطن يبلّغ عن مشكلة', desc: 'صورة + تحديد الموقع + وصف عبر تطبيق الهاتف', side: 'left' },
              { icon: Brain, title: 'الذكاء يصنّف ويرتّب', desc: 'التصنيف، الخطورة، الثقة، وكشف المكرر', side: 'right' },
              { icon: FileText, title: 'إنشاء أمر عمل', desc: 'توليد أمر عمل تلقائي مع تحديد مستوى الخدمة', side: 'left' },
              { icon: Navigation, title: 'إرسال الفريق', desc: 'تعيين أقرب فريق متاح مع تحسين المسار', side: 'right' },
              { icon: CheckCircle2, title: 'الحل والإثبات', desc: 'صور قبل/بعد، التحقق بالموقع، إيصال الإنجاز', side: 'left' },
              { icon: BarChart3, title: 'تحديث لوحة التحكم', desc: 'تغذية المؤشرات والإحصائيات وتقييم المواطن في النظام', side: 'right' },
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
                      step.side === 'right' ? 'lg:text-right' : 'lg:text-left'
                    )}>
                      <div className="flex items-center gap-3 mb-2" style={{ justifyContent: step.side === 'left' ? 'flex-start' : 'flex-end' }}>
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
              مصمم لكل أصحاب المصلحة
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              تحكم بالصلاحيات حسب الدور مع أذونات دقيقة لكل نوع مستخدم.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              'مدير عام', 'مدير البلدية', 'مدير العمليات', 'مرسل الأسطول',
              'مشرف', 'سائق', 'عامل ميداني', 'مدير أعمال',
              'مستخدم أعمال', 'مدير إعادة تدوير', 'مشغّل ميزان', 'محاسب',
              'مدقق', 'مواطن', 'مدير المنصة', 'مدير البلدية',
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
          <div className="relative rounded-3xl bg-gradient-to-bl from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                جاهز لتحويل عمليات النفايات في مدينتك؟
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                شغّل لوحة التحكم لاستكشاف المنصة كاملة ببيانات تجريبية واقعية.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 mt-6"
              >
                تسجيل الدخول للبدء <ArrowUpLeft className="w-4 h-4" />
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
            <span className="font-display font-semibold text-sm text-foreground">وست سيتي أو إس</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> عربي / فرنسي / إنجليزي</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> صلاحيات + متعدد المستأجرين</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> مدعوم بالذكاء</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
