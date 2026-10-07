'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, PriorityBadge } from '@/components/dashboard/badges';
import {
  citizenReports,
  reportTypeLabels,
  priorityBadgeClass,
  reportStatusBadgeClass,
  formatTimeAgo,
} from '@/lib/mock-data';
import type { ReportStatus, Priority, CitizenReport } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Search, Filter, Download, MapPin, Clock, User, Camera,
  Brain, Star, X, ChevronRight, Plus,
} from 'lucide-react';

const statusOptions: (ReportStatus | 'ALL')[] = ['ALL', 'SUBMITTED', 'AI_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
const priorityOptions: (Priority | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CitizenReport | null>(null);

  const filtered = useMemo(() => {
    return citizenReports.filter((r) => {
      const matchesSearch = r.reportId.toLowerCase().includes(search.toLowerCase()) ||
        r.location.toLowerCase().includes(search.toLowerCase()) ||
        r.citizenName.toLowerCase().includes(search.toLowerCase()) ||
        reportTypeLabels[r.type].toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    const total = citizenReports.length;
    const resolved = citizenReports.filter(r => r.status === 'RESOLVED').length;
    const active = citizenReports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(r.status)).length;
    const critical = citizenReports.filter(r => r.priority === 'CRITICAL').length;
    return { total, resolved, active, critical };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Citizen Reports" description="Track and manage waste-related reports submitted by citizens">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Reports', value: counts.total, color: 'text-foreground', bg: 'bg-card' },
          { label: 'Active', value: counts.active, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Resolved', value: counts.resolved, color: 'text-success', bg: 'bg-success/5' },
          { label: 'Critical', value: counts.critical, color: 'text-destructive', bg: 'bg-destructive/5' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl border border-border p-4', s.bg)}>
            <div className={cn('text-2xl font-display font-semibold', s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, location, citizen, or type..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'ALL')}
            className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'ALL')}
            className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Report ID</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Type</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Citizen</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Location</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Priority</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">Submitted</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No reports match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelected(report)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{report.reportId}</td>
                    <td className="px-3 py-3 text-foreground">{reportTypeLabels[report.type]}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap">{report.citizenName}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{report.location}</td>
                    <td className="px-3 py-3">
                      <PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        label={report.status.replace(/_/g, ' ')}
                        className={reportStatusBadgeClass[report.status]}
                      />
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(report.submittedAt)}</td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {citizenReports.length} reports</span>
          <div className="flex gap-1">
            <button className="px-2.5 py-1 rounded border border-border hover:bg-muted transition-colors" disabled>Prev</button>
            <button className="px-2.5 py-1 rounded border border-border bg-primary text-primary-foreground">1</button>
            <button className="px-2.5 py-1 rounded border border-border hover:bg-muted transition-colors">2</button>
            <button className="px-2.5 py-1 rounded border border-border hover:bg-muted transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <ReportDrawer report={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ReportDrawer({ report, onClose }: { report: CitizenReport; onClose: () => void }) {
  const timeline = [
    { label: 'Submitted', time: report.submittedAt, done: true },
    { label: 'AI Review', time: report.submittedAt, done: !['SUBMITTED'].includes(report.status) },
    { label: 'Verified', time: report.submittedAt, done: ['VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'RESOLVED'].includes(report.status) },
    { label: 'Assigned', time: report.assignedTeam ? report.submittedAt : '', done: ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'RESOLVED'].includes(report.status) },
    { label: 'In Progress', time: '', done: ['IN_PROGRESS', 'RESOLVED'].includes(report.status) },
    { label: 'Resolved', time: report.resolvedAt || '', done: report.status === 'RESOLVED' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 inset-y-0 w-full sm:max-w-md bg-card border-l border-border z-50 overflow-y-auto scrollbar-thin animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{report.reportId}</div>
            <h2 className="font-display text-lg font-semibold mt-0.5">{reportTypeLabels[report.type]}</h2>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} />
            <StatusBadge label={report.status.replace(/_/g, ' ')} className={reportStatusBadgeClass[report.status]} />
          </div>

          {/* Photo placeholder */}
          {report.hasPhoto && (
            <div className="aspect-video rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Camera className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <span className="text-xs">Citizen photo attached</span>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={User} label="Citizen" value={report.citizenName} />
            <InfoItem icon={MapPin} label="Location" value={report.location} />
            <InfoItem icon={MapPin} label="Zone" value={report.zone} />
            <InfoItem icon={Clock} label="Submitted" value={formatTimeAgo(report.submittedAt)} />
            {report.assignedTeam && <InfoItem icon={User} label="Team" value={report.assignedTeam} />}
            {report.estimatedResponse && <InfoItem icon={Clock} label="Est. Response" value={report.estimatedResponse} />}
          </div>

          {/* Description */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Description</div>
            <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
          </div>

          {/* AI Analysis */}
          {report.aiConfidence && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-accent">AI Analysis</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confidence Score</span>
                  <span className="font-medium">{Math.round(report.aiConfidence * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${report.aiConfidence * 100}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium capitalize">{report.type.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-3">Progress Timeline</div>
            <div className="space-y-3">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      step.done ? 'bg-success border-success' : 'bg-card border-border'
                    )}>
                      {step.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={cn('w-0.5 h-6', step.done ? 'bg-success' : 'bg-border')} />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <div className={cn('text-sm', step.done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {step.label}
                    </div>
                    {step.time && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(step.time)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rating */}
          {report.rating && (
            <div className="rounded-lg bg-success/5 border border-success/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-success fill-success" />
                <span className="text-xs font-medium text-success">Citizen Rating</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn('w-4 h-4', i < report.rating! ? 'text-success fill-success' : 'text-muted')}
                  />
                ))}
                <span className="text-sm font-medium ml-2">{report.rating}/5</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {report.status === 'SUBMITTED' && (
              <button className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Verify & Assign
              </button>
            )}
            {report.status === 'ASSIGNED' && (
              <button className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Mark In Progress
              </button>
            )}
            {report.status === 'IN_PROGRESS' && (
              <button className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors">
                Mark Resolved
              </button>
            )}
            <button className="h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              View on Map
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-medium text-foreground truncate">{value}</div>
    </div>
  );
}
