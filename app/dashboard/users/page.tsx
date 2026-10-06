'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { userConfig } from '@/lib/table-configs';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole, UserStatus } from '@/lib/types';
import {
  Search, Plus, ShieldCheck, MoreVertical, Edit, Trash2,
  UserPlus, Shield, Building2, MapPin, Mail, Phone, CheckCircle2,
  XCircle, Clock, Loader2, AlertCircle, X,
} from 'lucide-react';

const roleColors: Record<UserRole, string> = {
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

const statusColors: Record<UserStatus, string> = {
  active: 'text-success',
  pending: 'text-warning',
  suspended: 'text-destructive',
};

const statusIcons: Record<UserStatus, typeof CheckCircle2> = {
  active: CheckCircle2,
  pending: Clock,
  suspended: XCircle,
};

const allRoles: { name: UserRole; level: string; permissions: number }[] = [
  { name: 'SUPER_ADMIN', level: 'المنصة', permissions: 48 },
  { name: 'PLATFORM_ADMIN', level: 'المنصة', permissions: 42 },
  { name: 'MUNICIPALITY_ADMIN', level: 'البلدية', permissions: 36 },
  { name: 'MUNICIPALITY_MANAGER', level: 'البلدية', permissions: 28 },
  { name: 'OPERATIONS_MANAGER', level: 'العمليات', permissions: 22 },
  { name: 'DISPATCHER', level: 'العمليات', permissions: 18 },
  { name: 'SUPERVISOR', level: 'العمليات', permissions: 16 },
  { name: 'DRIVER', level: 'الميدان', permissions: 8 },
  { name: 'FIELD_WORKER', level: 'الميدان', permissions: 8 },
  { name: 'B2B_ADMIN', level: 'الأعمال', permissions: 12 },
  { name: 'RECYCLER_ADMIN', level: 'إعادة التدوير', permissions: 14 },
  { name: 'WEIGHBRIDGE_OPERATOR', level: 'العمليات', permissions: 6 },
  { name: 'ACCOUNTANT', level: 'المالية', permissions: 10 },
  { name: 'AUDITOR', level: 'المالية', permissions: 8 },
  { name: 'CITIZEN', level: 'العامة', permissions: 4 },
];

const roleOptions: UserRole[] = allRoles.map(r => r.name);
const statusOptions: ('ALL' | UserStatus)[] = ['ALL', 'active', 'pending', 'suspended'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  organization: string;
  zone: string;
  status: UserStatus;
}

const emptyForm: FormState = {
  name: '', email: '', phone: '', role: 'CITIZEN',
  organization: '', zone: '', status: 'active',
};

export default function UsersPage() {
  const { data: users, loading, error, create, update, remove } = useCrud<User>(userConfig);
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.organization.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter(u => u.status === 'active').length;
  const pendingCount = users.filter(u => u.status === 'pending').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      organization: user.organization,
      zone: user.zone,
      status: user.status,
    });
    setFormError(null);
    setShowModal(true);
    setActionMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }
    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        organization: form.organization.trim(),
        zone: form.zone.trim(),
        status: form.status,
        avatar: initials(form.name),
        lastActive: editing ? editing.lastActive : 'الآن',
      };

      if (editing) {
        const result = await update(editing.id, payload);
        if (!result) {
          setFormError('فشل تحديث المستخدم. تحقق من البيانات.');
          setSaving(false);
          return;
        }
        toast({ title: 'تم تحديث المستخدم', description: form.name });
      } else {
        const result = await create(payload);
        if (!result) {
          setFormError('فشل إنشاء المستخدم. ربما البريد مستخدم بالفعل.');
          setSaving(false);
          return;
        }
        toast({ title: 'تم إنشاء المستخدم', description: form.name });
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const ok = await remove(user.id);
    if (ok) {
      toast({ title: 'تم حذف المستخدم', description: user.name });
    } else {
      toast({ title: 'فشل حذف المستخدم', variant: 'destructive' });
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6 animate-fade-in" onClick={() => actionMenuId && setActionMenuId(null)}>
      <PageHeader title="المستخدمون والأدوار" description="إدارة حسابات المستخدمين وتعيين الأدوار والصلاحيات">
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> إضافة مستخدم
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المستخدمين', value: users.length.toLocaleString(), sub: 'عبر جميع الأدوار', icon: ShieldCheck, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'نشط', value: activeCount.toLocaleString(), sub: 'حسابات نشطة', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'بانتظار الموافقة', value: pendingCount.toLocaleString(), sub: 'بانتظار المراجعة', icon: Clock, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'موقوف', value: suspendedCount.toLocaleString(), sub: 'تم إلغاء الوصول', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' },
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
        <h3 className="font-display font-semibold text-foreground mb-1">نظرة عامة على الأدوار</h3>
        <p className="text-xs text-muted-foreground mb-4">مستويات الصلاحيات وعدد المستخدمين حسب الدور</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {allRoles.map((role) => {
            const count = users.filter(u => u.role === role.name).length;
            return (
              <div key={role.name} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors">
                <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', roleColors[role.name])}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-medium text-foreground truncate">{role.name}</div>
                  <div className="text-[10px] text-muted-foreground">{role.level} · {role.permissions} صلاحيات</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-foreground">{count}</div>
                  <div className="text-[10px] text-muted-foreground">مستخدمون</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد أو المؤسسة..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          <option value="ALL">كل الأدوار</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | UserStatus)}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'كل الحالات' : s === 'active' ? 'نشط' : s === 'pending' ? 'قيد الانتظار' : 'موقوف'}</option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>فشل تحميل المستخدمين: {error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin ml-2" />
          جارٍ تحميل المستخدمين...
        </div>
      )}

      {/* Users table */}
      {!loading && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">المستخدم</th>
                  <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">الدور</th>
                  <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">المؤسسة</th>
                  <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">المنطقة</th>
                  <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                  <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden xl:table-cell">آخر نشاط</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">لا يوجد مستخدمون مطابقون للمرشحات</td>
                  </tr>
                ) : (
                  filtered.map((user) => {
                    const StatusIcon = statusIcons[user.status];
                    return (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white text-xs font-semibold shrink-0">
                              {user.avatar || initials(user.name)}
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
                            <span>{user.status === 'active' ? 'نشط' : user.status === 'pending' ? 'قيد الانتظار' : 'موقوف'}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">{user.lastActive}</td>
                        <td className="px-3 py-3 relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === user.id ? null : user.id); }}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuId === user.id && (
                            <div className="absolute left-3 top-12 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEdit(user)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" /> تعديل
                              </button>
                              <button
                                onClick={() => { setConfirmDelete(user); setActionMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> حذف
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
            <span>عرض {filtered.length} من {users.length} مستخدم</span>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">
                {editing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: محمد أمين"
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@city.gov"
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">الهاتف</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+213 555 ..."
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">الدور</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
                >
                  <option value="active">نشط</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="suspended">موقوف</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">المؤسسة</label>
                <input
                  type="text"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  placeholder="مثال: بلدية الجزائر الوسط"
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">المنطقة</label>
                <input
                  type="text"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  placeholder="مثال: المنطقة 1"
                  className="w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'حفظ التغييرات' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card rounded-xl border border-border w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/15 text-destructive shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm">تأكيد الحذف</h3>
                <p className="text-xs text-muted-foreground mt-0.5">لا يمكن التراجع عن هذا الإجراء</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              هل أنت متأكد من حذف المستخدم <span className="font-medium text-foreground">{confirmDelete.name}</span> ({confirmDelete.email})؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
