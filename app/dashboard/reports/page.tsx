'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Brain, Star, X, ChevronRight, Plus, Navigation,
} from 'lucide-react';

const statusOptions: (ReportStatus | 'ALL')[] = ['ALL', 'SUBMITTED', 'AI_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
const priorityOptions: (Priority | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

export default function ReportsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CitizenReport | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reports, setReports] = useState(citizenReports);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch = r.reportId.toLowerCase().includes(search.toLowerCase()) ||
        r.location.toLowerCase().includes(search.toLowerCase()) ||
        r.citizenName.toLowerCase().includes(search.toLowerCase()) ||
        reportTypeLabels[r.type].toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [reports, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter(r => r.status === 'RESOLVED').length;
    const active = reports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(r.status)).length;
    const critical = reports.filter(r => r.priority === 'CRITICAL').length;
    return { total, resolved, active, critical };
  }, [reports]);

  const updateReportStatus = (id: string, status: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status, resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : r.resolvedAt } : r));
    setSelected(prev => prev && prev.id === id ? { ...prev, status, resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : prev.resolvedAt } : prev);
  };

  const handleExport = () => {
    const headers = ['Report ID', 'Type', 'Citizen', 'Location', 'Priority', 'Status', 'Submitted'];
    const rows = filtered.map(r => [r.reportId, r.type, r.citizenName, r.location, r.priority, r.status, r.submittedAt]);
    const csv = [headers, ...rows].map(r2 => r2.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Citizen Reports" description="Track and manage waste-related reports submitted by citizens">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
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
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, location, citizen, or type..." className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'ALL')} className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
            {statusOptions.map((s) => (<option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | 'ALL')} className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
            {priorityOptions.map((p) => (<option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>))}
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
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm"><Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />No reports match your filters</td></tr>
              ) : (
                filtered.map((report) => (
                  <tr key={report.id} onClick={() => setSelected(report)} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{report.reportId}</td>
                    <td className="px-3 py-3 text-foreground">{reportTypeLabels[report.type]}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap">{report.citizenName}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{report.location}</td>
                    <td className="px-3 py-3"><PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} /></td>
                    <td className="px-3 py-3"><StatusBadge label={report.status.replace(/_/g, ' ')} className={reportStatusBadgeClass[report.status]} /></td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(report.submittedAt)}</td>
                    <td className="px-3 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {reports.length} reports</span>
        </div>
      </div>

      {selected && <ReportDrawer report={selected} onClose={() => setSelected(null)} onUpdateStatus={updateReportStatus} onViewMap={() => router.push('/dashboard/dispatch')} />}
      {showCreate && <CreateReportModal onClose={() => setShowCreate(false)} onCreate={(r) => { setReports(prev => [r, ...prev]); }} />}
    </div>
  );
}

function ReportDrawer({ report, onClose, onUpdateStatus, onViewMap }: { report: CitizenReport; onClose: () => void; onUpdateStatus: (id: string, status: ReportStatus) => void; onViewMap: () => void }) {
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
          <div className="flex flex-wrap gap-2">
            <PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} />
            <StatusBadge label={report.status.replace(/_/g, ' ')} className={reportStatusBadgeClass[report.status]} />
          </div>

          {report.hasPhoto && (
            <div className="aspect-video rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <div className="text-center"><Camera className="w-8 h-8 mx-auto mb-1 opacity-40" /><span className="text-xs">Citizen photo attached</span></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={User} label="Citizen" value={report.citizenName} />
            <InfoItem icon={MapPin} label="Location" value={report.location} />
            <InfoItem icon={MapPin} label="Zone" value={report.zone} />
            <InfoItem icon={Clock} label="Submitted" value={formatTimeAgo(report.submittedAt)} />
            {report.assignedTeam && <InfoItem icon={User} label="Team" value={report.assignedTeam} />}
            {report.estimatedResponse && <InfoItem icon={Clock} label="Est. Response" value={report.estimatedResponse} />}
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Description</div>
            <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
          </div>

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
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-3">Progress Timeline</div>
            <div className="space-y-3">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', step.done ? 'bg-success border-success' : 'bg-card border-border')}>
                      {step.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {i < timeline.length - 1 && <div className={cn('w-0.5 h-6', step.done ? 'bg-success' : 'bg-border')} />}
                  </div>
                  <div className="pt-0.5">
                    <div className={cn('text-sm', step.done ? 'text-foreground font-medium' : 'text-muted-foreground')}>{step.label}</div>
                    {step.time && <div className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(step.time)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.rating && (
            <div className="rounded-lg bg-success/5 border border-success/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-success fill-success" />
                <span className="text-xs font-medium text-success">Citizen Rating</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('w-4 h-4', i < report.rating! ? 'text-success fill-success' : 'text-muted')} />
                ))}
                <span className="text-sm font-medium ml-2">{report.rating}/5</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {report.status === 'SUBMITTED' && (
              <button onClick={() => onUpdateStatus(report.id, 'ASSIGNED')} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Verify & Assign</button>
            )}
            {report.status === 'ASSIGNED' && (
              <button onClick={() => onUpdateStatus(report.id, 'IN_PROGRESS')} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Mark In Progress</button>
            )}
            {report.status === 'IN_PROGRESS' && (
              <button onClick={() => onUpdateStatus(report.id, 'RESOLVED')} className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors">Mark Resolved</button>
            )}
            {report.status === 'RESOLVED' && (
              <div className="flex-1 h-9 rounded-lg bg-success/10 text-success text-sm font-medium flex items-center justify-center gap-2">
                <Star className="w-4 h-4 fill-success" /> Resolved
              </div>
            )}
            <button onClick={onViewMap} className="h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> View on Map
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function CreateReportModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: CitizenReport) => void }) {
  const [type, setType] = useState('overflowing_container');
  const [priority, setPriority] = useState('NORMAL');
  const [location, setLocation] = useState('');
  const [zone, setZone] = useState('Zone 1 — Centre');
  const [citizenName, setCitizenName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport: CitizenReport = {
      id: `r-${Date.now()}`,
      reportId: `WR-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      type: type as CitizenReport['type'],
      status: 'SUBMITTED',
      priority: priority as Priority,
      citizenName,
      location,
      zone,
      lat: 36.7538 + (Math.random() - 0.5) * 0.06,
      lng: 3.0588 + (Math.random() - 0.5) * 0.06,
      description,
      submittedAt: new Date().toISOString(),
      hasPhoto: false,
    };
    onCreate(newReport);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">New Citizen Report</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="overflowing_container">Overflowing Container</option>
                <option value="illegal_dumping">Illegal Dumping</option>
                <option value="missed_collection">Missed Collection</option>
                <option value="damaged_container">Damaged Container</option>
                <option value="waste_scattered">Waste Scattered</option>
                <option value="large_waste">Large Waste</option>
                <option value="hazardous_waste">Hazardous Waste</option>
                <option value="bad_smell">Bad Smell</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Citizen Name</label>
            <input type="text" required value={citizenName} onChange={(e) => setCitizenName(e.target.value)} placeholder="Citizen name" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Location</label>
            <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address or landmark" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Zone</label>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
              <option>Zone 1 — Centre</option><option>Zone 2 — Nord</option><option>Zone 3 — Est</option><option>Zone 4 — Sud</option><option>Zone 5 — Ouest</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." className="w-full h-24 p-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Submit Report</button>
          </div>
        </form>
      </div>
    </>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5"><Icon className="w-3 h-3" />{label}</div>
      <div className="text-sm font-medium text-foreground truncate">{value}</div>
    </div>
  );
}
