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
    category: 'Zones',
    question: 'How much waste did Zone 4 generate this month?',
    answer: 'Zone 4 — Sud generated 350 tons this month, with a recycling rate of 61% (below the city average of 68.2%). This zone also has the highest number of citizen reports at 67, and the lowest SLA compliance at 89%. I recommend increasing collection frequency in Zone 4 and assigning an additional team to address the report backlog.',
  },
  {
    icon: AlertTriangle,
    category: 'Reports',
    question: 'Which areas have the most complaints?',
    answer: 'Based on this month\u2019s data, Zone 4 — Sud leads with 67 active reports (28.6% of all reports), followed by Zone 2 — Nord with 58 reports. The primary complaint types in these zones are overflowing containers and illegal dumping. Zone 5 — Ouest has the fewest reports at 36, with a 97% SLA compliance rate.',
  },
  {
    icon: Truck,
    category: 'Fleet',
    question: 'Which trucks have poor efficiency?',
    answer: 'Truck TC-009 has the lowest route efficiency at 64%, currently in maintenance for an oil change. TC-022 and TC-023 are offline. Among active vehicles, TC-017 has the highest fuel consumption relative to collection volume. I recommend scheduling preventive maintenance for TC-017 within the next 7 days.',
  },
  {
    icon: TrendingUp,
    category: 'Forecasting',
    question: 'Predict tomorrow\u2019s collection demand.',
    answer: 'Based on historical patterns and current fill levels, I predict approximately 62 tons of waste will need collection tomorrow. The highest demand will be in Zone 2 — Nord (18t) and Zone 5 — Ouest (16t). I recommend deploying 12 trucks on active routes, with 2 held in reserve for emergency dispatch. Expected recycling yield: ~42 tons (68%).',
  },
  {
    icon: Recycle,
    category: 'Recycling',
    question: 'Which businesses generate the most recyclable material?',
    answer: 'Based on B2B collection records, Hotel El Aurassi contributes the most recyclable material at 8.4 tons/month (primarily cardboard and glass). Carrefour Alger generates 6.2 tons/month (plastic and paper). I suggest offering these businesses enhanced recycling contracts with volume-based pricing incentives.',
  },
  {
    icon: AlertTriangle,
    category: 'SLA',
    question: 'Show me SLA violations.',
    answer: 'There are currently 4 SLA breaches and 7 work orders at risk. The breaches are:\n\n1. WO-2024-0832 — Emergency cleanup, Zone 4 — overdue by 3 hours\n2. WO-2024-0819 — Container maintenance, Zone 2 — overdue by 1 hour\n3. WO-2024-0841 — Illegal dumping, Zone 1 — overdue by 45 minutes\n4. WO-2024-0805 — B2B collection, Zone 3 — overdue by 20 minutes\n\nI recommend immediate escalation to the operations manager.',
  },
];

const predictionCards = [
  {
    icon: Zap,
    title: 'Overflow Prediction',
    value: '8 containers',
    detail: 'Expected to exceed 90% fill within 24 hours',
    color: 'text-warning bg-warning/10',
  },
  {
    icon: TrendingUp,
    title: 'Volume Forecast',
    value: '62 tons',
    detail: 'Predicted collection demand for tomorrow',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Truck,
    title: 'Maintenance Alert',
    value: '3 vehicles',
    detail: 'Predicted to need service within 7 days',
    color: 'text-info bg-info/10',
  },
  {
    icon: AlertTriangle,
    title: 'Anomaly Detection',
    value: '2 flagged',
    detail: 'Unusual patterns detected in Zone 4',
    color: 'text-destructive bg-destructive/10',
  },
];

export default function AICopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hello! I\u2019m your Waste City OS AI Copilot. I can answer questions about waste operations, predict trends, identify issues, and recommend actions. Try asking me about zone performance, SLA violations, fleet efficiency, or collection forecasts.',
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
      <PageHeader title="AI Copilot" description="Ask questions, get predictions, and receive operational recommendations">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-accent/10 text-accent text-sm font-medium">
          <Brain className="w-4 h-4" /> AI-Powered
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
              <div className="font-display font-semibold text-foreground text-sm">Waste City OS Assistant</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online · Using authorized tenant data
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
                placeholder="Ask about operations, predictions, or recommendations..."
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
            <h3 className="font-display font-semibold text-foreground text-sm">Suggested Questions</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Click any question to ask the AI</p>
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
        <h3 className="font-display font-semibold text-foreground mb-1">AI Capabilities</h3>
        <p className="text-xs text-muted-foreground mb-4">Modular AI services with provider abstraction</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Sparkles, title: 'Report Classification', desc: 'Auto-categorize citizen reports by type, severity, and confidence' },
            { icon: Zap, title: 'Overflow Prediction', desc: 'Predict which containers will overflow based on fill patterns' },
            { icon: TrendingUp, title: 'Volume Forecasting', desc: 'Forecast waste generation by zone, season, and waste type' },
            { icon: Truck, title: 'Route Optimization', desc: 'Optimize collection routes using fill levels, traffic, and capacity' },
            { icon: AlertTriangle, title: 'Anomaly Detection', desc: 'Detect unusual patterns in waste generation, fuel use, or reports' },
            { icon: Recycle, title: 'Recycling Demand', desc: 'Predict recyclable material availability for marketplace planning' },
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
