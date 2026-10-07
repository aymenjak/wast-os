'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import {
  Search, Plus, ShieldCheck, MoreVertical, Edit, Trash2,
  UserPlus, Shield, Building2, MapPin, Mail, Phone, CheckCircle2,
  XCircle, Clock,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  organization: string;
  zone: string;
  status: 'active' | 'pending' | 'suspended';
  lastActive: string;
  avatar: string;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-destructive/15 text-destructive',
  PLATFORM_ADMIN: 'bg-destructive/15 text-destructive',
  MUNICIPALITY_ADMIN: 'bg-primary/15 text-primary',
  MUNICIPALITY_MANAGER: 'bg-primary/15 text-primary',
  OPERATIONS_MANAGER: 'bg-info/15 text-info',
  DISPATCHER: 'bg-info/15 text-info',
  SUPERVISOR: 'bg-accent/15 text-accent',
  DRIVER: 'bg-warning/15 text-warning',
  FIELD_WORKER: 'bg-warning/15 text-warning',
  B2B_ADMIN: 'bg-chart-4/15 text-chart-4',
  B2B_USER: 'bg-chart-4/15 text-chart-4',
  RECYCLER_ADMIN: 'bg-success/15 text-success',
  WEIGHBRIDGE_OPERATOR: 'bg-success/15 text-success',
  ACCOUNTANT: 'bg-muted text-muted-foreground',
  AUDITOR: 'bg-muted text-muted-foreground',
  CITIZEN: 'bg-muted text-muted-foreground',
};

const statusColors: Record<string, string> = {
  active: 'text-success',
  pending: 'text-warning',
  suspended: 'text-destructive',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  active: CheckCircle2,
  pending: Clock,
  suspended: XCircle,
};

const allRoles = [
  { name: 'SUPER_ADMIN', level: 'Platform', permissions: 48, users: 2 },
  { name: 'PLATFORM_ADMIN', level: 'Platform', permissions: 42, users: 3 },
  { name: 'MUNICIPALITY_ADMIN', level: 'Municipality', permissions: 36, users: 5 },
  { name: 'MUNICIPALITY_MANAGER', level: 'Municipality', permissions: 28, users: 8 },
  { name: 'OPERATIONS_MANAGER', level: 'Operations', permissions: 22, users: 6 },
  { name: 'DISPATCHER', level: 'Operations', permissions: 18, users: 12 },
  { name: 'SUPERVISOR', level: 'Operations', permissions: 16, users: 10 },
  { name: 'DRIVER', level: 'Field', permissions: 8, users: 50 },
  { name: 'FIELD_WORKER', level: 'Field', permissions: 8, users: 20 },
  { name: 'B2B_ADMIN', level: 'Business', permissions: 12, users: 100 },
  { name: 'RECYCLER_ADMIN', level: 'Recycling', permissions: 14, users: 5 },
  { name: 'WEIGHBRIDGE_OPERATOR', level: 'Operations', permissions: 6, users: 8 },
  { name: 'ACCOUNTANT', level: 'Finance', permissions: 10, users: 4 },
  { name: 'AUDITOR', level: 'Finance', permissions: 8, users: 3 },
  { name: 'CITIZEN', level: 'Public', permissions: 4, users: 12840 },
];

const users: User[] = [
  { id: 'u1', name: 'Yacine Belkacem', email: 'y.belkacem@wastecity.dz', phone: '+213 555 12 34 56', role: 'SUPER_ADMIN', organization: 'Waste City OS', zone: 'All Zones', status: 'active', lastActive: '2 min ago', avatar: 'YB' },
  { id: 'u2', name: 'Amira Haddad', email: 'a.haddad@mairie-alger.dz', phone: '+213 555 23 45 67', role: 'MUNICIPALITY_ADMIN', organization: 'Alger Centre', zone: 'Zone 1-5', status: 'active', lastActive: '15 min ago', avatar: 'AH' },
  { id: 'u3', name: 'Karim Mansouri', email: 'k.mansouri@wastecity.dz', phone: '+213 555 34 56 78', role: 'OPERATIONS_MANAGER', organization: 'Alger Centre', zone: 'Zone 1-3', status: 'active', lastActive: '1 hr ago', avatar: 'KM' },
  { id: 'u4', name: 'Fatima Zohra Boumediene', email: 'fz.boumediene@wastecity.dz', phone: '+213 555 45 67 89', role: 'DISPATCHER', organization: 'Alger Centre', zone: 'Zone 1-5', status: 'active', lastActive: '5 min ago', avatar: 'FB' },
  { id: 'u5', name: 'Rachid Cherif', email: 'r.cherif@wastecity.dz', phone: '+213 555 56 78 90', role: 'DRIVER', organization: 'EcoCollect SARL', zone: 'Zone 2', status: 'active', lastActive: '3 min ago', avatar: 'RC' },
  { id: 'u6', name: 'Nadia Brahimi', email: 'n.brahimi@wastecity.dz', phone: '+213 555 67 89 01', role: 'FIELD_WORKER', organization: 'EcoCollect SARL', zone: 'Zone 4', status: 'active', lastActive: '22 min ago', avatar: 'NB' },
  { id: 'u7', name: 'Omar Saadi', email: 'o.saadi@elaurassi.dz', phone: '+213 555 78 90 12', role: 'B2B_ADMIN', organization: 'Hotel El Aurassi', zone: 'Zone 1', status: 'active', lastActive: '2 hr ago', avatar: 'OS' },
  { id: 'u8', name: 'Leila Khelifi', email: 'l.khelifi@recycle-alger.dz', phone: '+213 555 89 01 23', role: 'RECYCLER_ADMIN', organization: 'Recycle Alger', zone: 'Zone 3', status: 'active', lastActive: '45 min ago', avatar: 'LK' },
  { id: 'u9', name: 'Sofiane Merabet', email: 's.merabet@wastecity.dz', phone: '+213 555 90 12 34', role: 'WEIGHBRIDGE_OPERATOR', organization: 'Transfer Station Est', zone: 'Zone 3', status: 'active', lastActive: '10 min ago', avatar: 'SM' },
  { id: 'u10', name: 'Wassila Toumi', email: 'w.toumi@wastecity.dz', phone: '+213 555 01 23 45', role: 'ACCOUNTANT', organization: 'Alger Centre', zone: 'All Zones', status: 'active', lastActive: '3 hr ago', avatar: 'WT' },
  { id: 'u11', name: 'Nabil Bouzid', email: 'n.bouzid@audit-dz.com', phone: '+213 555 12 34 50', role: 'AUDITOR', organization: 'External Audit', zone: 'All Zones', status: 'pending', lastActive: '1 day ago', avatar: 'NB' },
  { id: 'u12', name: 'Imene Ould Ali', email: 'i.ouldali@mairie-alger.dz', phone: '+213 555 23 45 60', role: 'MUNICIPALITY_MANAGER', organization: 'Alger Centre', zone: 'Zone 1-5', status: 'active', lastActive: '30 min ago', avatar: 'IO' },
];

const roleOptions = ['ALL', ...allRoles.map(r => r.name)];
const statusOptions = ['ALL', 'active', 'pending', 'suspended'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.organization.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Users & Roles" description="Manage user accounts, role assignments, and permissions">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Shield className="w-4 h-4" /> Configure Roles
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: '13,076', sub: 'Across all roles', icon: ShieldCheck, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Active Today', value: '847', sub: 'Currently online', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Pending Approval', value: '23', sub: 'Awaiting admin review', icon: Clock, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'Suspended', value: '5', sub: 'Access revoked', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bg, s.border)}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn('text-2xl font-display font-semibold', s.color)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div className="text-xs font-medium text-foreground">{s.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Role overview */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">Role Overview</h3>
        <p className="text-xs text-muted-foreground mb-4">Permission levels and user counts by role</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {allRoles.map((role) => (
            <div key={role.name} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors">
              <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', roleColors[role.name])}>
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono font-medium text-foreground truncate">{role.name}</div>
                <div className="text-[10px] text-muted-foreground">{role.level} · {role.permissions} permissions</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-foreground">{role.users.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">users</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or organization..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Users table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Role</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Organization</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">Zone</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden xl:table-cell">Last Active</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No users match your filters</td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const StatusIcon = statusIcons[user.status];
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white text-xs font-semibold shrink-0">
                            {user.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{user.name}</div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono', roleColors[user.role])}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate">{user.organization}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{user.zone}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('flex items-center gap-1.5 text-xs font-medium', statusColors[user.status])}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="capitalize">{user.status}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">{user.lastActive}</td>
                      <td className="px-3 py-3">
                        <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {users.length} users</span>
        </div>
      </div>
    </div>
  );
}
