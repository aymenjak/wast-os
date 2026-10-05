'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import {
  Bot, Send, Sparkles, TrendingUp, AlertTriangle, MapPin,
  Truck, Recycle, Clock, Zap, Brain, ArrowRight, Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { zones, wasteByType, monthlyCollection } from '@/lib/mock-data';
import { useCrud } from '@/hooks/use-crud';
import { zoneConfig, wasteTypeConfig, monthlyConfig } from '@/lib/table-configs';
import type { ZoneData, WasteByTypeData, MonthlyCollectionData } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SuggestionQuestion {
  icon: LucideIcon;
  question: string;
  answer: string;
  category: string;
}

const suggestions: SuggestionQuestion[] = [
  {
    icon: MapPin,
    category: 'المناطق',
    question: 'كم نفايات أنتجت المنطقة 4 هذا الشهر؟',
    answer: 'المنطقة 4 — الجنوب أنتجت 350 طن هذا الشهر، بنسبة إعادة تدوير 61% (أقل من متوسط المدينة 68.2%). هذه المنطقة لديها أيضاً أكبر عدد من بلاغات المواطنين عند 67، وأقل التزام بمستوى الخدمة عند 89%. أوصي بزيادة وتيرة الجمع في المنطقة 4 وتعيين فريق إضافي لمعالجة تراكم البلاغات.',
  },
  {
    icon: AlertTriangle,
    category: 'البلاغات',
    question: 'ما هي المناطق الأكثر شكاوى؟',
    answer: 'بناءً على بيانات هذا الشهر، المنطقة 4 — الجنوب تتصدّر بـ 67 بلاغاً نشطاً (28.6% من إجمالي البلاغات)، تليها المنطقة 2 — الشمال بـ 58 بلاغاً. الأنواع الرئيسية للشكاوى في هذه المناطق هي الحاويات الفائضة والإلقاء غير القانوني. المنطقة 5 — الغرب لديها أقل بلاغات عند 36، مع نسبة التزام بالخدمة 97%.',
  },
  {
    icon: Truck,
    category: 'الأسطول',
    question: 'أي شاحنات لديها كفاءة ضعيفة؟',
    answer: 'الشاحنة TC-009 لديها أدنى كفاءة مسار عند 64%، حالياً في الصيانة لتغيير الزيت. TC-022 و TC-023 غير متصلتين. بين المركبات النشطة، TC-017 لديها أعلى استهلاك وقود نسبةً لحجم الجمع. أوصي بجدولة صيانة وقائية لـ TC-017 خلال الأيام السبعة المقبلة.',
  },
  {
    icon: TrendingUp,
    category: 'التنبؤ',
    question: 'توقع طلب الجمع غداً.',
    answer: 'بناءً على الأنماط التاريخية ومستويات الامتلاء الحالية، أتوقع حوالي 62 طن من النفايات ستحتاج جمعاً غداً. أعلى طلب سيكون في المنطقة 2 — الشمال (18 طن) والمنطقة 5 — الغرب (16 طن). أوصي بنشر 12 شاحنة على مسارات نشطة، مع 2 احتياطية للإرسال الطارئ. العائد المتوقع من إعادة التدوير: ~42 طن (68%).',
  },
  {
    icon: Recycle,
    category: 'إعادة التدوير',
    question: 'أي الشركات تنتج أكثر مواد قابلة لإعادة التدوير؟',
    answer: 'بناءً على سجلات جمع الأعمال، فندق الأوراسي يساهم بأكبر كمية من المواد القابلة لإعادة التدوير عند 8.4 طن/شهر (أساساً كرتون وزجاج). كارفور الجزائر ينتج 6.2 طن/شهر (بلاستيك وورق). أقترح عرض عقود إعادة تدوير محسّنة على هذه الشركات بحوافز تسعير قائمة على الحجم.',
  },
  {
    icon: AlertTriangle,
    category: 'الخدمة',
    question: 'أرني اختراقات مستوى الخدمة.',
    answer: 'حالياً هناك 4 اختراقات لمستوى الخدمة و 7 أوامر عمل معرضة للخطر. الاختراقات هي:\n\n1. WO-2024-0832 — تنظيف طارئ، المنطقة 4 — متأخر بـ 3 ساعات\n2. WO-2024-0819 — صيانة حاوية، المنطقة 2 — متأخر بساعة\n3. WO-2024-0841 — إلقاء غير قانوني، المنطقة 1 — متأخر بـ 45 دقيقة\n4. WO-2024-0805 — جمع أعمال، المنطقة 3 — متأخر بـ 20 دقيقة\n\nأوصي بالتصعيد الفوري إلى مدير العمليات.',
  },
];

const predictionCards = [
  {
    icon: Zap,
    title: 'تنبؤ بالفيضان',
    value: '8 حاويات',
    detail: 'متوقع تجاوز 90% امتلاء خلال 24 ساعة',
    color: 'text-warning bg-warning/10',
  },
  {
    icon: TrendingUp,
    title: 'توقع الحجم',
    value: '62 طن',
    detail: 'الطلب المتوقع على الجمع غداً',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Truck,
    title: 'تنبيه صيانة',
    value: '3 مركبات',
    detail: 'متوقع احتياجها للصيانة خلال 7 أيام',
    color: 'text-info bg-info/10',
  },
  {
    icon: AlertTriangle,
    title: 'كشف الحالات الشاذة',
    value: '2 مُعلّمة',
    detail: 'أنماط غير اعتيادية مكتشفة في المنطقة 4',
    color: 'text-destructive bg-destructive/10',
  },
];

export default function AICopilotPage() {
  const { data: zones } = useCrud<ZoneData>(zoneConfig);
  const { data: wasteByType } = useCrud<WasteByTypeData>(wasteTypeConfig);
  const { data: monthlyCollection } = useCrud<MonthlyCollectionData>(monthlyConfig);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'مرحباً! أنا مساعد NEXVO الذكي. يمكنني الإجابة عن أسئلتك حول عمليات النفايات، التنبؤ بالاتجاهات، تحديد المشاكل، وتقديم توصيات. جرّب السؤال عن أداء المناطق، اختراقات الخدمة، كفاءة الأسطول، أو توقعات الجمع.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const findAnswer = (question: string): string => {
    const lower = question.toLowerCase();
    const match = suggestions.find(s => lower.includes(s.question.toLowerCase().split(' ').slice(0, 3).join(' ')));
    if (match) return match.answer;

    if (lower.includes('zone') && lower.includes('waste')) {
      const total = zones.reduce((sum, z) => sum + z.wasteCollected, 0);
      return `This month, the city generated ${total} tons of waste across all zones. Zone 5 — Ouest leads with 487 tons, followed by Zone 2 — Nord at 410 tons. Zone 3 — Est has the lowest output at 280 tons.`;
    }
    if (lower.includes('fuel')) {
      return 'Fuel consumption increased by 8.3% this month, primarily due to extended routes in Zone 4 and Zone 2. Truck TC-017 shows the highest fuel-to-collection ratio. I recommend optimizing the Zone 4 route sequence to reduce total distance by approximately 12%.';
    }
    if (lower.includes('recycl')) {
      return `The city\u2019s overall recycling rate is 68.2%, with ${wasteByType[0].tons} tons of organic waste, ${wasteByType[1].tons} tons of plastic, and ${wasteByType[2].tons} tons of paper recovered this month. Organic and plastic waste account for over 50% of all recyclable material.`;
    }
    if (lower.includes('report') || lower.includes('complaint')) {
      return 'There are 234 active citizen reports. The most common type is overflowing containers (34%), followed by illegal dumping (22%). Zone 4 has the most reports at 67, with a response time averaging 62 minutes — above the city average of 47 minutes.';
    }
    return 'I can help you analyze waste operations, fleet performance, citizen reports, SLA compliance, recycling rates, and more. Try one of the suggested questions below, or ask about specific zones, vehicles, or time periods.';
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const answer = findAnswer(text);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="مساعد الذكاء" description="اطرح أسئلة، احصل على تنبؤات، وتلقّ توصيات تشغيلية">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-accent/10 text-accent text-sm font-medium">
          <Brain className="w-4 h-4" /> مدعوم بالذكاء
        </div>
      </PageHeader>

      {/* Prediction cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {predictionCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-card rounded-xl border border-border p-4">
              <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg mb-3', card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-display font-semibold text-foreground">{card.value}</div>
              <div className="text-xs font-medium text-foreground mt-0.5">{card.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{card.detail}</div>
            </div>
          );
        })}
      </div>

      {/* Chat interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat panel */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col" style={{ height: '560px' }}>
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-foreground text-sm">مساعد NEXVO</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> متصل · يستخدم بيانات المستأجر المصرّح بها
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-primary to-accent' : 'bg-muted'
                )}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <span className="text-xs font-medium text-muted-foreground">SA</span>}
                </div>
                <div className={cn(
                  'max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line',
                  msg.role === 'assistant'
                    ? 'bg-muted/50 text-foreground'
                    : 'bg-primary text-primary-foreground'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل عن العمليات، التنبؤات، أو التوصيات..."
                className="flex-1 h-10 px-4 text-sm bg-muted/50 rounded-lg border border-transparent focus:border-primary/30 focus:bg-background focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Suggested questions */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-warning" />
            <h3 className="font-display font-semibold text-foreground text-sm">أسئلة مقترحة</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">انقر على أي سؤال لطرحه على المساعد</p>
          <div className="space-y-2 max-h-[460px] overflow-y-auto scrollbar-thin">
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => sendMessage(s.question)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{s.category}</div>
                    <div className="text-xs font-medium text-foreground leading-relaxed">{s.question}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI capabilities */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">قدرات الذكاء</h3>
        <p className="text-xs text-muted-foreground mb-4">خدمات ذكاء اصطناعي نمطية مع تجريد المزود</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Sparkles, title: 'تصنيف البلاغات', desc: 'تصنيف تلقائي لبلاغات المواطنين حسب النوع والخطورة والثقة' },
            { icon: Zap, title: 'تنبؤ بالفيضان', desc: 'التنبؤ بالحاويات التي ستفيض بناءً على أنماط الامتلاء' },
            { icon: TrendingUp, title: 'توقع الحجم', desc: 'توقع توليد النفايات حسب المنطقة والموسم ونوع النفايات' },
            { icon: Truck, title: 'تحسين المسارات', desc: 'تحسين مسارات الجمع باستخدام مستويات الامتلاء والمرور والسعة' },
            { icon: AlertTriangle, title: 'كشف الحالات الشاذة', desc: 'كشف الأنماط غير الاعتيادية في توليد النفايات أو استهلاك الوقود أو البلاغات' },
            { icon: Recycle, title: 'طلب إعادة التدوير', desc: 'التنبؤ بتوفر المواد القابلة لإعادة التدوير لتخطيط السوق' },
          ].map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 shrink-0">
                  <Icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{cap.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cap.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
