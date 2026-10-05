import type {
  CitizenReport,
  WorkOrder,
  Container,
  Vehicle,
  KpiData,
  ZoneData,
  WasteByTypeData,
  MonthlyCollectionData,
  ActivityFeedItem,
  ReportType,
  ReportStatus,
  Priority,
  WasteType,
  Business,
  Contract,
  CollectionRequest,
  Invoice,
  Payment,
  RecyclerCenter,
  MaterialInventory,
  MarketplaceListing,
  Driver,
  Route,
  WeighbridgeTransaction,
  AuditLogEntry,
  EcoProfile,
  InvoiceStatus,
  Subscription,
  PlanFeature,
} from './types';

export const reportTypeLabels: Record<ReportType, string> = {
  overflowing_container: 'حاوية تفيض',
  illegal_dumping: 'إلقاء غير قانوني',
  missed_collection: 'جمع فائت',
  damaged_container: 'حاوية تالفة',
  waste_scattered: 'نفايات متناثرة',
  large_waste: 'نفايات كبيرة',
  hazardous_waste: 'نفايات خطرة',
  bad_smell: 'رائحة كريهة',
  other: 'أخرى',
};

export const statusLabels: Record<ReportStatus, string> = {
  SUBMITTED: 'مُرسل',
  RECEIVED: 'مستلم',
  AI_REVIEW: 'مراجعة الذكاء',
  VERIFIED: 'موثّق',
  ASSIGNED: 'مُسند',
  EN_ROUTE: 'في الطريق',
  IN_PROGRESS: 'قيد التنفيذ',
  RESOLVED: 'تم الحل',
  REJECTED: 'مرفوض',
  DUPLICATE: 'مكرر',
  CLOSED: 'مغلق',
};

export const priorityLabels: Record<Priority, string> = {
  CRITICAL: 'حرج',
  HIGH: 'عالي',
  NORMAL: 'عادي',
  LOW: 'منخفض',
};

export const wasteTypeLabels: Record<WasteType, string> = {
  GENERAL: 'عامة',
  ORGANIC: 'عضوية',
  PLASTIC: 'بلاستيك',
  PAPER: 'ورق',
  CARDBOARD: 'كرتون',
  GLASS: 'زجاج',
  METAL: 'معدن',
  ELECTRONIC: 'إلكترونية',
  CONSTRUCTION: 'إنشاءات',
  MEDICAL: 'طبية',
  HAZARDOUS: 'خطرة',
  LARGE_WASTE: 'نفايات كبيرة',
  USED_OIL: 'زيت مستعمل',
  OTHER: 'أخرى',
};

export const priorityBadgeClass: Record<Priority, string> = {
  CRITICAL: 'bg-destructive/15 text-destructive border-destructive/20',
  HIGH: 'bg-warning/15 text-warning border-warning/20',
  NORMAL: 'bg-info/15 text-info border-info/20',
  LOW: 'bg-muted text-muted-foreground border-border',
};

export const reportStatusBadgeClass: Record<ReportStatus, string> = {
  SUBMITTED: 'bg-muted text-muted-foreground',
  RECEIVED: 'bg-info/15 text-info',
  AI_REVIEW: 'bg-accent/15 text-accent',
  VERIFIED: 'bg-chart-2/15 text-chart-2',
  ASSIGNED: 'bg-warning/15 text-warning',
  EN_ROUTE: 'bg-warning/15 text-warning',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  RESOLVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/15 text-destructive',
  DUPLICATE: 'bg-muted text-muted-foreground',
  CLOSED: 'bg-muted text-muted-foreground',
};

export const vehicleStatusBadgeClass: Record<string, string> = {
  AVAILABLE: 'bg-success/15 text-success',
  ON_ROUTE: 'bg-primary/15 text-primary',
  LOADING: 'bg-warning/15 text-warning',
  MAINTENANCE: 'bg-destructive/15 text-destructive',
  OFFLINE: 'bg-muted text-muted-foreground',
};

export const containerStatusBadgeClass: Record<string, string> = {
  ACTIVE: 'bg-success/15 text-success',
  FULL: 'bg-warning/15 text-warning',
  DAMAGED: 'bg-destructive/15 text-destructive',
  MAINTENANCE: 'bg-info/15 text-info',
  REMOVED: 'bg-muted text-muted-foreground',
};

export const slaStatusClass: Record<string, string> = {
  ON_TRACK: 'text-success',
  AT_RISK: 'text-warning',
  BREACHED: 'text-destructive',
};

export const kpiData: KpiData[] = [
  {
    label: 'النفايات المجموعة',
    value: '1,847 t',
    change: 12.4,
    trend: 'up',
    icon: 'trash2',
    sparkline: [120, 145, 132, 168, 155, 180, 175, 190, 210, 205, 225, 240],
  },
  {
    label: 'نسبة إعادة التدوير',
    value: '68.2%',
    change: 5.1,
    trend: 'up',
    icon: 'recycle',
    sparkline: [55, 58, 56, 60, 62, 61, 64, 65, 66, 67, 68, 68],
  },
  {
    label: 'البلاغات النشطة',
    value: '234',
    change: -8.3,
    trend: 'down',
    icon: 'alertCircle',
    sparkline: [310, 295, 280, 270, 265, 260, 255, 250, 245, 240, 238, 234],
  },
  {
    label: 'الالتزام بمستوى الخدمة',
    value: '94.1%',
    change: 2.7,
    trend: 'up',
    icon: 'checkCircle2',
    sparkline: [88, 89, 90, 91, 90, 92, 92, 93, 93, 94, 94, 94],
  },
  {
    label: 'الأسطول النشط',
    value: '28 / 30',
    change: 3.2,
    trend: 'up',
    icon: 'truck',
    sparkline: [24, 25, 26, 25, 27, 26, 28, 27, 28, 28, 28, 28],
  },
  {
    label: 'متوسط الاستجابة',
    value: '47 min',
    change: -15.2,
    trend: 'down',
    icon: 'timer',
    sparkline: [72, 68, 65, 62, 58, 55, 52, 50, 49, 48, 47, 47],
  },
];

export const zones: ZoneData[] = [
  { zone: 'المنطقة 1 — الوسط', reports: 42, wasteCollected: 320, recyclingRate: 72, slaCompliance: 96 },
  { zone: 'المنطقة 2 — الشمال', reports: 58, wasteCollected: 410, recyclingRate: 65, slaCompliance: 92 },
  { zone: 'المنطقة 3 — الشرق', reports: 31, wasteCollected: 280, recyclingRate: 70, slaCompliance: 95 },
  { zone: 'المنطقة 4 — الجنوب', reports: 67, wasteCollected: 350, recyclingRate: 61, slaCompliance: 89 },
  { zone: 'المنطقة 5 — الغرب', reports: 36, wasteCollected: 487, recyclingRate: 74, slaCompliance: 97 },
];

export const wasteByType: WasteByTypeData[] = [
  { type: 'عضوية', tons: 580, color: 'hsl(var(--chart-1))' },
  { type: 'بلاستيك', tons: 340, color: 'hsl(var(--chart-2))' },
  { type: 'ورق', tons: 280, color: 'hsl(var(--chart-3))' },
  { type: 'زجاج', tons: 210, color: 'hsl(var(--chart-4))' },
  { type: 'معدن', tons: 165, color: 'hsl(var(--chart-5))' },
  { type: 'أخرى', tons: 272, color: 'hsl(var(--muted-foreground))' },
];

export const monthlyCollection: MonthlyCollectionData[] = [
  { month: 'جانفي', collected: 1450, recycled: 920, landfilled: 530 },
  { month: 'فيفري', collected: 1520, recycled: 980, landfilled: 540 },
  { month: 'مارس', collected: 1610, recycled: 1050, landfilled: 560 },
  { month: 'أفريل', collected: 1580, recycled: 1020, landfilled: 560 },
  { month: 'ماي', collected: 1700, recycled: 1120, landfilled: 580 },
  { month: 'جوان', collected: 1750, recycled: 1180, landfilled: 570 },
  { month: 'جويلية', collected: 1820, recycled: 1240, landfilled: 580 },
  { month: 'أوت', collected: 1847, recycled: 1260, landfilled: 587 },
];

export const activityFeed: ActivityFeedItem[] = [
  { id: '1', type: 'report', message: 'بلاغ جديد من مواطن: حاوية تفيض في شارع ديدوش مراد', time: 'قبل دقيقتين', priority: 'HIGH' },
  { id: '2', type: 'workorder', message: 'أمر عمل #WO-2024-0847 مُسند إلى فريق ألفا', time: 'قبل 8 دقائق', priority: 'NORMAL' },
  { id: '3', type: 'collection', message: 'الشاحنة TC-014 أكملت الجمع في المنطقة 3 — 1.2 طن', time: 'قبل 15 دقيقة' },
  { id: '4', type: 'alert', message: 'تنبيه إنترنت الأشياء: الحاوية #CN-0421 مستوى الامتلاء 92%', time: 'قبل 22 دقيقة', priority: 'HIGH' },
  { id: '5', type: 'vehicle', message: 'المركبة TC-009 دخلت الصيانة — تغيير الزيت مجدول', time: 'قبل 35 دقيقة' },
  { id: '6', type: 'report', message: 'البلاغ #RPT-3210 حُلّ من فريق برافو — تقييم: 5/5', time: 'قبل 48 دقيقة' },
  { id: '7', type: 'workorder', message: 'تحذير مستوى الخدمة: أمر عمل #WO-2024-0832 معرض للاختراق', time: 'قبل ساعة', priority: 'HIGH' },
  { id: '8', type: 'invoice', message: 'فاتورة #INV-2024-0512 صادرة إلى فندق الأوراسي — 45,000 دج', time: 'قبل ساعة' },
  { id: '9', type: 'collection', message: 'تذكرة ميزان مُنشأة: الوزن الصافي 8.4 طن', time: 'قبل ساعتين' },
  { id: '10', type: 'report', message: 'الذكاء الاصطناعي صنّف 12 بلاغاً جديداً — 3 مُعلّمة كمكررة', time: 'قبل ساعتين' },
];

const reportTypes: ReportType[] = [
  'overflowing_container', 'illegal_dumping', 'missed_collection',
  'damaged_container', 'waste_scattered', 'large_waste', 'hazardous_waste', 'bad_smell',
];

const reportStatuses: ReportStatus[] = [
  'SUBMITTED', 'AI_REVIEW', 'VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'RESOLVED',
];

const priorities: Priority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

const streets = [
  'Rue Didouche Mourad', 'Boulevard Mohamed Khemisti', "Rue Larbi Ben M'hidi",
  'Avenue Pasteur', "Rue d'Isly", 'Boulevard de la Libération',
  'Rue Ben Boulaïd', 'Avenue du 1er Novembre', 'Rue Hassiba Ben Bouali',
  'Boulevard Taleb Abderrahmane',
];

const zonesList = ['المنطقة 1 — الوسط', 'المنطقة 2 — الشمال', 'المنطقة 3 — الشرق', 'المنطقة 4 — الجنوب', 'المنطقة 5 — الغرب'];

const names = [
  'Yacine Belkacem', 'Amira Haddad', 'Karim Mansouri', 'Fatima Zohra Boumediene',
  'Rachid Cherif', 'Nadia Brahimi', 'Omar Saadi', 'Leila Khelifi',
  'Sofiane Merabet', 'Wassila Toumi', 'Nabil Bouzid', 'Imene Ould Ali',
  'Toufik Larbi', 'Sara Benali', 'Mohamed Tahar', 'Djamila Ferhat',
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seedRandom(42);

export const citizenReports: CitizenReport[] = Array.from({ length: 48 }, (_, i) => {
  const type = reportTypes[Math.floor(rand() * reportTypes.length)];
  const status = reportStatuses[Math.floor(rand() * reportStatuses.length)];
  const priority = priorities[Math.floor(rand() * priorities.length)];
  const zone = zonesList[Math.floor(rand() * zonesList.length)];
  const street = streets[Math.floor(rand() * streets.length)];
  const name = names[Math.floor(rand() * names.length)];
  const hoursAgo = Math.floor(rand() * 72) + 1;
  const submittedAt = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  const isResolved = status === 'RESOLVED';

  return {
    id: `rpt-${i + 1}`,
    reportId: `RPT-${(1024 + i).toString().padStart(4, '0')}`,
    type,
    status,
    priority,
    citizenName: name,
    location: street,
    zone,
    lat: 36.7538 + (rand() - 0.5) * 0.08,
    lng: 3.0588 + (rand() - 0.5) * 0.08,
    description: `${reportTypeLabels[type]} في ${street}. المنطقة بحاجة إلى اهتمام فوري.`,
    submittedAt,
    assignedTeam: status !== 'SUBMITTED' && status !== 'AI_REVIEW' ? `فريق ${['ألفا', 'برافو', 'تشارلي', 'دلتا'][Math.floor(rand() * 4)]}` : undefined,
    estimatedResponse: status !== 'RESOLVED' ? `${Math.floor(rand() * 4) + 1} hr` : undefined,
    resolvedAt: isResolved ? new Date(Date.now() - (hoursAgo - 2) * 3600000).toISOString() : undefined,
    rating: isResolved ? Math.floor(rand() * 2) + 4 : undefined,
    aiConfidence: Math.round(rand() * 30 + 70) / 100,
    hasPhoto: rand() > 0.2,
  };
});

const woTypes: WorkOrder['type'][] = [
  'citizen_complaint', 'b2b_collection', 'container_maintenance',
  'emergency_cleanup', 'scheduled_route', 'illegal_dumping',
];

const woStatuses: WorkOrder['status'][] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];

const slaStatuses: WorkOrder['slaStatus'][] = ['ON_TRACK', 'AT_RISK', 'BREACHED'];

export const workOrders: WorkOrder[] = Array.from({ length: 40 }, (_, i) => {
  const type = woTypes[Math.floor(rand() * woTypes.length)];
  const status = woStatuses[Math.floor(rand() * woStatuses.length)];
  const priority = priorities[Math.floor(rand() * priorities.length)];
  const zone = zonesList[Math.floor(rand() * zonesList.length)];
  const street = streets[Math.floor(rand() * streets.length)];
  const slaStatus = slaStatuses[Math.floor(rand() * slaStatuses.length)];
  const hoursAgo = Math.floor(rand() * 48) + 1;
  const dueIn = Math.floor(rand() * 24) + 1;

  return {
    id: `wo-${i + 1}`,
    orderId: `WO-2024-${(800 + i).toString().padStart(4, '0')}`,
    type,
    status,
    priority,
    location: street,
    zone,
    description: `${type.replace(/_/g, ' ')} — ${street}، ${zone}`,
    assignedTeam: status !== 'OPEN' ? `فريق ${['ألفا', 'برافو', 'تشارلي', 'دلتا'][Math.floor(rand() * 4)]}` : undefined,
    assignedVehicle: status !== 'OPEN' ? `TC-${String(Math.floor(rand() * 30) + 1).padStart(3, '0')}` : undefined,
    driver: status !== 'OPEN' ? names[Math.floor(rand() * names.length)] : undefined,
    dueTime: new Date(Date.now() + dueIn * 3600000).toISOString(),
    slaStatus,
    createdAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    progress: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? Math.floor(rand() * 60) + 20 : status === 'ASSIGNED' ? 10 : 0,
  };
});

const wasteTypes: WasteType[] = ['GENERAL', 'ORGANIC', 'PLASTIC', 'PAPER', 'GLASS', 'METAL'];
const containerStatuses: Container['status'][] = ['ACTIVE', 'FULL', 'DAMAGED', 'MAINTENANCE'];

export const containers: Container[] = Array.from({ length: 60 }, (_, i) => {
  const wasteType = wasteTypes[Math.floor(rand() * wasteTypes.length)];
  const status = containerStatuses[Math.floor(rand() * containerStatuses.length)];
  const zone = zonesList[Math.floor(rand() * zonesList.length)];
  const fillLevel = status === 'FULL' ? 90 + Math.floor(rand() * 10) : Math.floor(rand() * 80);
  const lastCollectionDays = Math.floor(rand() * 5) + 1;

  return {
    id: `cn-${i + 1}`,
    containerId: `CN-${(200 + i).toString().padStart(4, '0')}`,
    type: ['Standard 240L', 'Underground 3000L', 'Standard 1100L', 'Glass Bank'][Math.floor(rand() * 4)],
    capacity: [240, 3000, 1100, 1500][Math.floor(rand() * 4)],
    fillLevel,
    wasteType,
    zone,
    location: streets[Math.floor(rand() * streets.length)],
    lat: 36.7538 + (rand() - 0.5) * 0.08,
    lng: 3.0588 + (rand() - 0.5) * 0.08,
    status,
    lastCollection: new Date(Date.now() - lastCollectionDays * 86400000).toISOString(),
    nextCollection: new Date(Date.now() + (Math.floor(rand() * 3) + 1) * 86400000).toISOString(),
    hasSensor: rand() > 0.4,
  };
});

export const vehicles: Vehicle[] = Array.from({ length: 30 }, (_, i) => {
  const statuses: Vehicle['status'][] = ['AVAILABLE', 'ON_ROUTE', 'LOADING', 'MAINTENANCE', 'OFFLINE'];
  const status = i < 16 ? 'ON_ROUTE' : i < 18 ? 'LOADING' : i < 20 ? 'AVAILABLE' : i < 22 ? 'MAINTENANCE' : 'OFFLINE';
  const zone = zonesList[Math.floor(rand() * zonesList.length)];
  const capacity = [8000, 12000, 15000, 6000][i % 4];
  const currentLoad = status === 'ON_ROUTE' || status === 'LOADING' ? Math.floor(rand() * capacity * 0.8) : 0;

  return {
    id: `veh-${i + 1}`,
    plate: `TC-${String(i + 1).padStart(3, '0')}`,
    type: ['Compactor Truck', 'Tipper Truck', 'Roll-off Truck', 'Van'][i % 4],
    capacity,
    currentLoad,
    driver: status !== 'OFFLINE' ? names[Math.floor(rand() * names.length)] : 'Unassigned',
    status,
    zone: status === 'AVAILABLE' ? 'Depot' : zone,
    lat: 36.7538 + (rand() - 0.5) * 0.1,
    lng: 3.0588 + (rand() - 0.5) * 0.1,
    mileage: Math.floor(rand() * 80000) + 20000,
    fuel: Math.floor(rand() * 60) + 30,
    speed: status === 'ON_ROUTE' ? Math.floor(rand() * 40) + 10 : 0,
    routeProgress: status === 'ON_ROUTE' ? Math.floor(rand() * 80) + 10 : 0,
    nextStop: status === 'ON_ROUTE' ? streets[Math.floor(rand() * streets.length)] : 'N/A',
    eta: status === 'ON_ROUTE' ? `${Math.floor(rand() * 25) + 5} min` : 'N/A',
  };
});

export function getFillLevelColor(level: number): string {
  if (level >= 90) return 'text-destructive';
  if (level >= 70) return 'text-warning';
  if (level >= 40) return 'text-info';
  return 'text-success';
}

export function getFillLevelBg(level: number): string {
  if (level >= 90) return 'bg-destructive';
  if (level >= 70) return 'bg-warning';
  if (level >= 40) return 'bg-info';
  return 'bg-success';
}

export function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'الآن';
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

// ==================== B2B DATA ====================

export const invoiceStatusBadgeClass: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ISSUED: 'bg-info/15 text-info',
  SENT: 'bg-accent/15 text-accent',
  PARTIALLY_PAID: 'bg-warning/15 text-warning',
  PAID: 'bg-success/15 text-success',
  OVERDUE: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export const businesses: Business[] = [
  { id: 'b1', name: 'Hotel El Aurassi', category: 'Hotel', legalId: 'RC-16-001234', address: 'Boulevard Mohamed Khemisti', zone: 'Zone 1 — Centre', contactName: 'Omar Saadi', contactEmail: 'o.saadi@elaurassi.dz', contactPhone: '+213 555 78 90 12', contractStatus: 'active', monthlyVolume: 8.4, recyclingRate: 72, outstandingBalance: 0, locations: 1, containers: 4 },
  { id: 'b2', name: 'Carrefour Alger', category: 'Shopping Center', legalId: 'RC-16-005678', address: 'Avenue Pasteur', zone: 'Zone 3 — Est', contactName: 'Sara Benali', contactEmail: 's.benali@carrefour.dz', contactPhone: '+213 555 65 43 21', contractStatus: 'active', monthlyVolume: 6.2, recyclingRate: 68, outstandingBalance: 45000, locations: 2, containers: 6 },
  { id: 'b3', name: 'Restaurant Le Djurdjura', category: 'Restaurant', legalId: 'RC-16-009012', address: 'Rue Didouche Mourad', zone: 'Zone 1 — Centre', contactName: 'Mohamed Tahar', contactEmail: 'contact@djurdjura.dz', contactPhone: '+213 555 11 22 33', contractStatus: 'active', monthlyVolume: 2.1, recyclingRate: 55, outstandingBalance: 0, locations: 1, containers: 2 },
  { id: 'b4', name: 'Coca-Cola Algeria', category: 'Factory', legalId: 'RC-16-003456', address: 'Zone Industrielle Rouiba', zone: 'Zone 3 — Est', contactName: 'Karim Mansouri', contactEmail: 'k.mansouri@ccalgeria.dz', contactPhone: '+213 555 99 88 77', contractStatus: 'active', monthlyVolume: 15.3, recyclingRate: 81, outstandingBalance: 120000, locations: 3, containers: 12 },
  { id: 'b5', name: 'Centre Hospitalier Mustapha', category: 'Hospital', legalId: 'RC-16-007890', address: 'Boulevard de la Libération', zone: 'Zone 2 — Nord', contactName: 'Djamila Ferhat', contactEmail: 'd.ferhat@chu-mustapha.dz', contactPhone: '+213 555 44 33 22', contractStatus: 'active', monthlyVolume: 4.7, recyclingRate: 40, outstandingBalance: 0, locations: 1, containers: 5 },
  { id: 'b6', name: 'Ecole Polytechnique Alger', category: 'School', legalId: 'RC-16-002345', address: 'Bordj El Bahri', zone: 'Zone 2 — Nord', contactName: 'Nabil Bouzid', contactEmail: 'n.bouzid@epa.dz', contactPhone: '+213 555 77 66 55', contractStatus: 'pending', monthlyVolume: 1.8, recyclingRate: 62, outstandingBalance: 0, locations: 1, containers: 2 },
  { id: 'b7', name: 'Riad El Feth Mall', category: 'Shopping Center', legalId: 'RC-16-004567', address: 'Avenue du 1er Novembre', zone: 'Zone 4 — Sud', contactName: 'Imene Ould Ali', contactEmail: 'i.ouldali@riadelfeth.dz', contactPhone: '+213 555 33 22 11', contractStatus: 'active', monthlyVolume: 5.9, recyclingRate: 65, outstandingBalance: 18000, locations: 1, containers: 4 },
  { id: 'b8', name: 'Sonelgaz HQ', category: 'Office', legalId: 'RC-16-006789', address: 'Rue d\'Isly', zone: 'Zone 1 — Centre', contactName: 'Toufik Larbi', contactEmail: 't.larbi@sonelgaz.dz', contactPhone: '+213 555 22 11 00', contractStatus: 'expired', monthlyVolume: 3.2, recyclingRate: 58, outstandingBalance: 67000, locations: 2, containers: 3 },
  { id: 'b9', name: 'Atelier Mécanique Saidi', category: 'Workshop', legalId: 'RC-16-008901', address: 'Rue Hassiba Ben Bouali', zone: 'Zone 5 — Ouest', contactName: 'Sofiane Merabet', contactEmail: 's.merabet@atelier-saidi.dz', contactPhone: '+213 555 66 55 44', contractStatus: 'none', monthlyVolume: 0.9, recyclingRate: 35, outstandingBalance: 0, locations: 1, containers: 1 },
  { id: 'b10', name: 'Pharmacie El Baraka', category: 'Shop', legalId: 'RC-16-001111', address: 'Rue Larbi Ben M\'hidi', zone: 'Zone 1 — Centre', contactName: 'Wassila Toumi', contactEmail: 'w.toumi@pharmabaraka.dz', contactPhone: '+213 555 00 99 88', contractStatus: 'active', monthlyVolume: 0.4, recyclingRate: 50, outstandingBalance: 0, locations: 1, containers: 1 },
];

export const contracts: Contract[] = [
  { id: 'c1', contractId: 'CON-2024-001', customer: 'Hotel El Aurassi', startDate: '2024-01-01', endDate: '2024-12-31', wasteTypes: ['GENERAL', 'ORGANIC', 'CARDBOARD', 'GLASS'], frequency: '3x/week', containerCount: 4, monthlyPrice: 45000, extraPickupPrice: 8000, sla: 'HIGH', paymentTerms: 'Net 30', status: 'active' },
  { id: 'c2', contractId: 'CON-2024-002', customer: 'Carrefour Alger', startDate: '2024-01-01', endDate: '2024-12-31', wasteTypes: ['GENERAL', 'PLASTIC', 'PAPER', 'CARDBOARD'], frequency: '5x/week', containerCount: 6, monthlyPrice: 78000, extraPickupPrice: 12000, sla: 'HIGH', paymentTerms: 'Net 30', status: 'active' },
  { id: 'c3', contractId: 'CON-2024-003', customer: 'Coca-Cola Algeria', startDate: '2024-01-01', endDate: '2025-06-30', wasteTypes: ['PLASTIC', 'GLASS', 'METAL', 'CARDBOARD', 'HAZARDOUS'], frequency: 'Daily', containerCount: 12, monthlyPrice: 155000, extraPickupPrice: 20000, sla: 'CRITICAL', paymentTerms: 'Net 15', status: 'active' },
  { id: 'c4', contractId: 'CON-2024-004', customer: 'Centre Hospitalier Mustapha', startDate: '2024-01-01', endDate: '2024-12-31', wasteTypes: ['MEDICAL', 'HAZARDOUS', 'GENERAL'], frequency: 'Daily', containerCount: 5, monthlyPrice: 92000, extraPickupPrice: 15000, sla: 'CRITICAL', paymentTerms: 'Net 30', status: 'active' },
  { id: 'c5', contractId: 'CON-2024-005', customer: 'Restaurant Le Djurdjura', startDate: '2024-03-01', endDate: '2024-12-31', wasteTypes: ['ORGANIC', 'GENERAL'], frequency: '3x/week', containerCount: 2, monthlyPrice: 22000, extraPickupPrice: 5000, sla: 'NORMAL', paymentTerms: 'Net 30', status: 'active' },
  { id: 'c6', contractId: 'CON-2024-006', customer: 'Riad El Feth Mall', startDate: '2024-01-01', endDate: '2024-12-31', wasteTypes: ['GENERAL', 'PLASTIC', 'PAPER', 'GLASS'], frequency: '4x/week', containerCount: 4, monthlyPrice: 56000, extraPickupPrice: 9000, sla: 'HIGH', paymentTerms: 'Net 30', status: 'active' },
  { id: 'c7', contractId: 'CON-2024-007', customer: 'Sonelgaz HQ', startDate: '2023-06-01', endDate: '2024-05-31', wasteTypes: ['GENERAL', 'PAPER'], frequency: '2x/week', containerCount: 3, monthlyPrice: 34000, extraPickupPrice: 6000, sla: 'NORMAL', paymentTerms: 'Net 30', status: 'expired' },
  { id: 'c8', contractId: 'CON-2024-008', customer: 'Ecole Polytechnique Alger', startDate: '2024-09-01', endDate: '2025-08-31', wasteTypes: ['GENERAL', 'PAPER', 'ORGANIC'], frequency: '2x/week', containerCount: 2, monthlyPrice: 18000, extraPickupPrice: 4000, sla: 'NORMAL', paymentTerms: 'Net 45', status: 'pending' },
];

export const collectionRequests: CollectionRequest[] = [
  { id: 'cr1', requestId: 'REQ-2024-001', business: 'Hotel El Aurassi', wasteType: 'CARDBOARD', quantity: 800, container: 'CN-0201', location: 'Boulevard Mohamed Khemisti', preferredDate: '2024-08-15', priority: 'NORMAL', status: 'completed', price: 8000 },
  { id: 'cr2', requestId: 'REQ-2024-002', business: 'Carrefour Alger', wasteType: 'PLASTIC', quantity: 1200, container: 'CN-0205', location: 'Avenue Pasteur', preferredDate: '2024-08-15', priority: 'HIGH', status: 'dispatched', price: 12000 },
  { id: 'cr3', requestId: 'REQ-2024-003', business: 'Coca-Cola Algeria', wasteType: 'GLASS', quantity: 2500, container: 'CN-0210', location: 'Zone Industrielle Rouiba', preferredDate: '2024-08-16', priority: 'HIGH', status: 'priced', price: 25000 },
  { id: 'cr4', requestId: 'REQ-2024-004', business: 'Restaurant Le Djurdjura', wasteType: 'ORGANIC', quantity: 300, container: 'CN-0203', location: 'Rue Didouche Mourad', preferredDate: '2024-08-15', priority: 'NORMAL', status: 'pending' },
  { id: 'cr5', requestId: 'REQ-2024-005', business: 'Riad El Feth Mall', wasteType: 'GENERAL', quantity: 600, container: 'CN-0215', location: 'Avenue du 1er Novembre', preferredDate: '2024-08-16', priority: 'NORMAL', status: 'pending' },
  { id: 'cr6', requestId: 'REQ-2024-006', business: 'Centre Hospitalier Mustapha', wasteType: 'MEDICAL', quantity: 150, container: 'CN-0208', location: 'Boulevard de la Libération', preferredDate: '2024-08-15', priority: 'CRITICAL', status: 'dispatched', price: 18000 },
  { id: 'cr7', requestId: 'REQ-2024-007', business: 'Sonelgaz HQ', wasteType: 'PAPER', quantity: 400, container: 'CN-0212', location: "Rue d'Isly", preferredDate: '2024-08-17', priority: 'LOW', status: 'pending' },
];

export const invoices: Invoice[] = [
  { id: 'inv1', invoiceId: 'INV-2024-0512', customer: 'Hotel El Aurassi', issueDate: '2024-08-01', dueDate: '2024-08-31', items: ['Collection fee (Aug)', 'Container rental', 'Extra pickup x1'], amount: 53000, tax: 10070, total: 63070, status: 'PAID' },
  { id: 'inv2', invoiceId: 'INV-2024-0513', customer: 'Carrefour Alger', issueDate: '2024-08-01', dueDate: '2024-08-31', items: ['Collection fee (Aug)', 'Container rental x6', 'Weight-based fee'], amount: 86000, tax: 16340, total: 102340, status: 'PARTIALLY_PAID' },
  { id: 'inv3', invoiceId: 'INV-2024-0514', customer: 'Coca-Cola Algeria', issueDate: '2024-08-01', dueDate: '2024-08-16', items: ['Collection fee (Aug)', 'Container rental x12', 'Transportation', 'Recycling credit'], amount: 155000, tax: 29450, total: 184450, status: 'OVERDUE' },
  { id: 'inv4', invoiceId: 'INV-2024-0515', customer: 'Centre Hospitalier Mustapha', issueDate: '2024-08-01', dueDate: '2024-08-31', items: ['Collection fee (Aug)', 'Medical waste handling', 'Container rental'], amount: 92000, tax: 17480, total: 109480, status: 'PAID' },
  { id: 'inv5', invoiceId: 'INV-2024-0516', customer: 'Riad El Feth Mall', issueDate: '2024-08-01', dueDate: '2024-08-31', items: ['Collection fee (Aug)', 'Container rental x4'], amount: 56000, tax: 10640, total: 66640, status: 'SENT' },
  { id: 'inv6', invoiceId: 'INV-2024-0517', customer: 'Restaurant Le Djurdjura', issueDate: '2024-08-01', dueDate: '2024-08-31', items: ['Collection fee (Aug)'], amount: 22000, tax: 4180, total: 26180, status: 'PAID' },
  { id: 'inv7', invoiceId: 'INV-2024-0511', customer: 'Sonelgaz HQ', issueDate: '2024-07-01', dueDate: '2024-07-31', items: ['Collection fee (Jul)', 'Penalty - late payment'], amount: 38000, tax: 7220, total: 45220, status: 'OVERDUE' },
  { id: 'inv8', invoiceId: 'INV-2024-0518', customer: 'Pharmacie El Baraka', issueDate: '2024-08-10', dueDate: '2024-09-09', items: ['Collection fee (Aug)'], amount: 8000, tax: 1520, total: 9520, status: 'DRAFT' },
];

export const payments: Payment[] = [
  { id: 'pay1', paymentId: 'PAY-2024-0891', invoiceRef: 'INV-2024-0512', customer: 'Hotel El Aurassi', amount: 63070, method: 'Bank Transfer', date: '2024-08-05', status: 'completed' },
  { id: 'pay2', paymentId: 'PAY-2024-0892', invoiceRef: 'INV-2024-0513', customer: 'Carrefour Alger', amount: 50000, method: 'Bank Transfer', date: '2024-08-10', status: 'completed' },
  { id: 'pay3', paymentId: 'PAY-2024-0893', invoiceRef: 'INV-2024-0515', customer: 'Centre Hospitalier Mustapha', amount: 109480, method: 'Cheque', date: '2024-08-08', status: 'completed' },
  { id: 'pay4', paymentId: 'PAY-2024-0894', invoiceRef: 'INV-2024-0517', customer: 'Restaurant Le Djurdjura', amount: 26180, method: 'Cash', date: '2024-08-03', status: 'completed' },
  { id: 'pay5', paymentId: 'PAY-2024-0895', invoiceRef: 'INV-2024-0516', customer: 'Riad El Feth Mall', amount: 66640, method: 'Bank Transfer', date: '2024-08-14', status: 'pending' },
];

// ==================== RECYCLING DATA ====================

export const recyclerCenters: RecyclerCenter[] = [
  { id: 'rc1', name: 'Recycle Alger Centre', location: 'Zone Industrielle Oued Smar', zone: 'Zone 5 — Ouest', capacity: 200, incomingToday: 42, processedToday: 38, recoveredToday: 28, rejectsToday: 4, efficiency: 90, materials: ['PET', 'HDPE', 'Cardboard', 'Aluminium'] },
  { id: 'rc2', name: 'Eco-Recycle Est', location: 'Rouiba Industrial Zone', zone: 'Zone 3 — Est', capacity: 150, incomingToday: 28, processedToday: 25, recoveredToday: 19, rejectsToday: 3, efficiency: 89, materials: ['Paper', 'Glass', 'Steel', 'Mixed Plastic'] },
  { id: 'rc3', name: 'Verre Recyclage Alger', location: 'Bordj El Kiffan', zone: 'Zone 3 — Est', capacity: 80, incomingToday: 15, processedToday: 14, recoveredToday: 13, rejectsToday: 1, efficiency: 93, materials: ['Glass'] },
];

export const materialInventory: MaterialInventory[] = [
  { id: 'mi1', material: 'PET Plastic', unit: 'tons', openingStock: 45, incoming: 12, processed: 8, sold: 5, currentStock: 44, quality: 'A', pricePerTon: 35000 },
  { id: 'mi2', material: 'HDPE Plastic', unit: 'tons', openingStock: 28, incoming: 8, processed: 5, sold: 3, currentStock: 28, quality: 'A', pricePerTon: 42000 },
  { id: 'mi3', material: 'Cardboard', unit: 'tons', openingStock: 62, incoming: 18, processed: 12, sold: 10, currentStock: 58, quality: 'A', pricePerTon: 18000 },
  { id: 'mi4', material: 'Paper', unit: 'tons', openingStock: 35, incoming: 10, processed: 6, sold: 4, currentStock: 35, quality: 'B', pricePerTon: 22000 },
  { id: 'mi5', material: 'Glass', unit: 'tons', openingStock: 80, incoming: 15, processed: 10, sold: 8, currentStock: 77, quality: 'B', pricePerTon: 8000 },
  { id: 'mi6', material: 'Aluminium', unit: 'tons', openingStock: 12, incoming: 3, processed: 2, sold: 1, currentStock: 12, quality: 'A', pricePerTon: 145000 },
  { id: 'mi7', material: 'Steel', unit: 'tons', openingStock: 18, incoming: 5, processed: 3, sold: 2, currentStock: 18, quality: 'A', pricePerTon: 68000 },
  { id: 'mi8', material: 'Mixed Plastic', unit: 'tons', openingStock: 22, incoming: 6, processed: 4, sold: 0, currentStock: 24, quality: 'C', pricePerTon: 12000 },
];

export const marketplaceListings: MarketplaceListing[] = [
  { id: 'ml1', listingId: 'LST-001', material: 'PET Plastic (Baled)', quantity: 15, unit: 'tons', quality: 'Grade A', price: 35000, location: 'Recycle Alger Centre', seller: 'Recycle Alger Centre', availableDate: '2024-08-16', status: 'available' },
  { id: 'ml2', listingId: 'LST-002', material: 'Cardboard (Baled)', quantity: 20, unit: 'tons', quality: 'Grade A', price: 18000, location: 'Recycle Alger Centre', seller: 'Recycle Alger Centre', availableDate: '2024-08-15', status: 'available' },
  { id: 'ml3', listingId: 'LST-003', material: 'Glass (Sorted)', quantity: 30, unit: 'tons', quality: 'Grade B', price: 8000, location: 'Verre Recyclage Alger', seller: 'Verre Recyclage Alger', availableDate: '2024-08-18', status: 'available' },
  { id: 'ml4', listingId: 'LST-004', material: 'Aluminium Cans', quantity: 3, unit: 'tons', quality: 'Grade A', price: 145000, location: 'Eco-Recycle Est', seller: 'Eco-Recycle Est', availableDate: '2024-08-16', status: 'reserved' },
  { id: 'ml5', listingId: 'LST-005', material: 'HDPE Plastic', quantity: 8, unit: 'tons', quality: 'Grade A', price: 42000, location: 'Recycle Alger Centre', seller: 'Recycle Alger Centre', availableDate: '2024-08-20', status: 'available' },
  { id: 'ml6', listingId: 'LST-006', material: 'Steel Scrap', quantity: 5, unit: 'tons', quality: 'Grade A', price: 68000, location: 'Eco-Recycle Est', seller: 'Eco-Recycle Est', availableDate: '2024-08-17', status: 'sold' },
];

// ==================== FLEET EXPANDED ====================

export const drivers: Driver[] = Array.from({ length: 20 }, (_, i) => {
  const statuses: Driver['status'][] = ['available', 'on_route', 'off_duty', 'on_leave'];
  const status = i < 10 ? 'on_route' : i < 14 ? 'available' : i < 17 ? 'off_duty' : 'on_leave';
  const name = names[Math.floor(rand() * names.length)];
  return {
    id: `drv-${i + 1}`,
    name,
    phone: `+213 555 ${String(10 + i).padStart(2, '0')} ${String(20 + i).padStart(2, '0')} ${String(30 + i).padStart(2, '0')}`,
    license: `LIC-${String(1000 + i).padStart(5, '0')}`,
    assignedVehicle: status !== 'off_duty' ? `TC-${String(i + 1).padStart(3, '0')}` : 'Unassigned',
    status,
    rating: Math.round((3.5 + rand() * 1.5) * 10) / 10,
    completedRoutes: Math.floor(rand() * 300) + 50,
    hoursThisWeek: Math.floor(rand() * 20) + 25,
    zone: zonesList[Math.floor(rand() * zonesList.length)],
  };
});

export const routes: Route[] = Array.from({ length: 15 }, (_, i) => {
  const statuses: Route['status'][] = ['planned', 'active', 'completed', 'delayed'];
  const status = i < 6 ? 'active' : i < 10 ? 'completed' : i < 13 ? 'planned' : 'delayed';
  return {
    id: `rt-${i + 1}`,
    routeId: `RT-2024-${String(400 + i).padStart(4, '0')}`,
    driver: drivers[i].name,
    vehicle: `TC-${String(i + 1).padStart(3, '0')}`,
    zone: zonesList[i % 5],
    stops: Math.floor(rand() * 15) + 8,
    distance: Math.round((rand() * 40 + 15) * 10) / 10,
    estimatedDuration: `${Math.floor(rand() * 3) + 2}h ${Math.floor(rand() * 50) + 10}m`,
    collectedWeight: status === 'completed' ? Math.round((rand() * 5 + 1) * 10) / 10 : status === 'active' ? Math.round((rand() * 3 + 0.5) * 10) / 10 : 0,
    progress: status === 'completed' ? 100 : status === 'active' ? Math.floor(rand() * 70) + 15 : status === 'delayed' ? 20 : 0,
    status,
    startTime: new Date(Date.now() - i * 3600000).toISOString(),
  };
});

// ==================== WEIGHBRIDGE ====================

export const weighbridgeTransactions: WeighbridgeTransaction[] = Array.from({ length: 12 }, (_, i) => {
  const gross = Math.floor(rand() * 8000) + 10000;
  const tare = Math.floor(rand() * 3000) + 5000;
  const wasteTypeList: WasteType[] = ['GENERAL', 'ORGANIC', 'PLASTIC', 'PAPER', 'GLASS', 'METAL', 'CONSTRUCTION'];
  return {
    id: `wb-${i + 1}`,
    ticketId: `WB-2024-${String(600 + i).padStart(4, '0')}`,
    vehicle: `TC-${String(Math.floor(rand() * 30) + 1).padStart(3, '0')}`,
    driver: names[Math.floor(rand() * names.length)],
    grossWeight: gross,
    tareWeight: tare,
    netWeight: gross - tare,
    wasteType: wasteTypeList[Math.floor(rand() * wasteTypeList.length)],
    origin: zonesList[Math.floor(rand() * zonesList.length)],
    destination: ['Transfer Station Est', 'Recycle Alger Centre', 'Landfill Oued Smar', 'Verre Recyclage Alger'][Math.floor(rand() * 4)],
    timestamp: new Date(Date.now() - i * 1800000).toISOString(),
    status: i < 3 ? 'entered' : i < 8 ? 'weighed' : 'completed',
  };
});

// ==================== AUDIT LOG ====================

export const auditLogs: AuditLogEntry[] = [
  { id: 'al1', userName: 'Yacine Belkacem', action: 'INVOICE_MODIFIED', entity: 'Invoice', entityId: 'INV-2024-0513', timestamp: new Date(Date.now() - 1800000).toISOString(), ip: '192.168.1.10', beforeValue: 'amount: 86000', afterValue: 'amount: 88000' },
  { id: 'al2', userName: 'Amira Haddad', action: 'WORKORDER_REASSIGNED', entity: 'WorkOrder', entityId: 'WO-2024-0832', timestamp: new Date(Date.now() - 3600000).toISOString(), ip: '192.168.1.25', beforeValue: 'team: Team Alpha', afterValue: 'team: Team Charlie' },
  { id: 'al3', userName: 'Fatima Zohra Boumediene', action: 'USER_PERMISSION_CHANGED', entity: 'User', entityId: 'u-0042', timestamp: new Date(Date.now() - 7200000).toISOString(), ip: '192.168.1.30', beforeValue: 'role: DRIVER', afterValue: 'role: SUPERVISOR' },
  { id: 'al4', userName: 'Karim Mansouri', action: 'CONTRACT_MODIFIED', entity: 'Contract', entityId: 'CON-2024-003', timestamp: new Date(Date.now() - 10800000).toISOString(), ip: '192.168.1.15', beforeValue: 'monthlyPrice: 150000', afterValue: 'monthlyPrice: 155000' },
  { id: 'al5', userName: 'Amira Haddad', action: 'REPORT_CLOSED', entity: 'CitizenReport', entityId: 'RPT-3210', timestamp: new Date(Date.now() - 14400000).toISOString(), ip: '192.168.1.25', beforeValue: 'status: IN_PROGRESS', afterValue: 'status: RESOLVED' },
  { id: 'al6', userName: 'Wassila Toumi', action: 'PAYMENT_RECORDED', entity: 'Payment', entityId: 'PAY-2024-0891', timestamp: new Date(Date.now() - 18000000).toISOString(), ip: '192.168.1.40', afterValue: 'amount: 63070, method: Bank Transfer' },
  { id: 'al7', userName: 'Yacine Belkacem', action: 'USER_CREATED', entity: 'User', entityId: 'u-0105', timestamp: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.10', afterValue: 'name: Nabil Bouzid, role: MUNICIPALITY_MANAGER' },
  { id: 'al8', userName: 'Karim Mansouri', action: 'VEHICLE_ASSIGNED', entity: 'Vehicle', entityId: 'TC-014', timestamp: new Date(Date.now() - 90000000).toISOString(), ip: '192.168.1.15', beforeValue: 'driver: Unassigned', afterValue: 'driver: Rachid Cherif' },
  { id: 'al9', userName: 'Imene Ould Ali', action: 'SLA_CONFIG_CHANGED', entity: 'SLA', entityId: 'SLA-CRITICAL', timestamp: new Date(Date.now() - 172800000).toISOString(), ip: '192.168.1.35', beforeValue: 'response: 45min', afterValue: 'response: 30min' },
  { id: 'al10', userName: 'Fatima Zohra Boumediene', action: 'ROUTE_OPTIMIZED', entity: 'Route', entityId: 'RT-2024-0402', timestamp: new Date(Date.now() - 259200000).toISOString(), ip: '192.168.1.30', beforeValue: 'distance: 38.5km', afterValue: 'distance: 31.2km' },
];

// ==================== ECO POINTS ====================

export const ecoProfiles: EcoProfile[] = [
  { id: 'eco1', citizen: 'Yacine Belkacem', ecoPoints: 2840, level: 'City Guardian', totalReports: 47, verifiedReports: 38, recyclingActions: 15, cleanups: 3 },
  { id: 'eco2', citizen: 'Amira Haddad', ecoPoints: 2150, level: 'Eco Champion', totalReports: 35, verifiedReports: 28, recyclingActions: 12, cleanups: 2 },
  { id: 'eco3', citizen: 'Karim Mansouri', ecoPoints: 1620, level: 'Green Citizen', totalReports: 22, verifiedReports: 18, recyclingActions: 8, cleanups: 1 },
  { id: 'eco4', citizen: 'Fatima Zohra Boumediene', ecoPoints: 980, level: 'Eco Citizen', totalReports: 15, verifiedReports: 12, recyclingActions: 5, cleanups: 0 },
  { id: 'eco5', citizen: 'Rachid Cherif', ecoPoints: 420, level: 'Eco Starter', totalReports: 8, verifiedReports: 5, recyclingActions: 2, cleanups: 0 },
  { id: 'eco6', citizen: 'Nadia Brahimi', ecoPoints: 1850, level: 'Eco Champion', totalReports: 30, verifiedReports: 25, recyclingActions: 10, cleanups: 2 },
  { id: 'eco7', citizen: 'Omar Saadi', ecoPoints: 670, level: 'Eco Citizen', totalReports: 12, verifiedReports: 9, recyclingActions: 3, cleanups: 0 },
  { id: 'eco8', citizen: 'Leila Khelifi', ecoPoints: 3210, level: 'City Guardian', totalReports: 52, verifiedReports: 44, recyclingActions: 18, cleanups: 4 },
];

export const ecoLevels = [
  { name: 'Eco Starter', minPoints: 0, maxPoints: 500, color: 'text-muted-foreground' },
  { name: 'Eco Citizen', minPoints: 500, maxPoints: 1000, color: 'text-info' },
  { name: 'Green Citizen', minPoints: 1000, maxPoints: 2000, color: 'text-success' },
  { name: 'Eco Champion', minPoints: 2000, maxPoints: 3000, color: 'text-primary' },
  { name: 'City Guardian', minPoints: 3000, maxPoints: 999999, color: 'text-accent' },
];

// ==================== SUBSCRIPTIONS ====================

export const subscriptions: Subscription[] = [
  { id: 'sub1', orgName: 'بلدية الجزائر الوسط', orgType: 'municipality', plan: 'enterprise', status: 'active', startDate: '2024-01-15', endDate: '2025-01-15', monthlyFee: 250000, includedUsers: 500, usedUsers: 236, includedZones: 20, usedZones: 5, apiCallsLimit: 1000000, apiCallsUsed: 412000, storageLimitGb: 500, storageUsedGb: 187, autoRenew: true, paymentMethod: 'تحويل بنكي', contactName: 'أميرة حداد', contactEmail: 'a.haddad@mairie-alger.dz', contactPhone: '+213 555 23 45 67' },
  { id: 'sub2', orgName: 'بلدية بئر مراد رايس', orgType: 'municipality', plan: 'pro', status: 'active', startDate: '2024-03-01', endDate: '2025-03-01', monthlyFee: 120000, includedUsers: 100, usedUsers: 67, includedZones: 10, usedZones: 3, apiCallsLimit: 200000, apiCallsUsed: 89000, storageLimitGb: 100, storageUsedGb: 43, autoRenew: true, paymentMethod: 'تحويل بنكي', contactName: 'كريم منصوري', contactEmail: 'k.mansouri@bmr.dz', contactPhone: '+213 555 34 56 78' },
  { id: 'sub3', orgName: 'فندق الأوراسي', orgType: 'business', plan: 'pro', status: 'active', startDate: '2024-02-10', endDate: '2025-02-10', monthlyFee: 120000, includedUsers: 50, usedUsers: 18, includedZones: 5, usedZones: 1, apiCallsLimit: 200000, apiCallsUsed: 34000, storageLimitGb: 100, storageUsedGb: 12, autoRenew: true, paymentMethod: 'بطاقة بنكية', contactName: 'عمر السعدي', contactEmail: 'o.saadi@elaurassi.dz', contactPhone: '+213 555 78 90 12' },
  { id: 'sub4', orgName: 'كارفور الجزائر', orgType: 'business', plan: 'pro', status: 'active', startDate: '2024-04-01', endDate: '2025-04-01', monthlyFee: 120000, includedUsers: 50, usedUsers: 32, includedZones: 5, usedZones: 2, apiCallsLimit: 200000, apiCallsUsed: 56000, storageLimitGb: 100, storageUsedGb: 28, autoRenew: true, paymentMethod: 'تحويل بنكي', contactName: 'نبيل بوزيد', contactEmail: 'n.bouzid@carrefour.dz', contactPhone: '+213 555 12 34 50' },
  { id: 'sub5', orgName: 'إيكو كوليكت SARL', orgType: 'business', plan: 'enterprise', status: 'active', startDate: '2024-01-01', endDate: '2025-01-01', monthlyFee: 250000, includedUsers: 200, usedUsers: 145, includedZones: 15, usedZones: 5, apiCallsLimit: 1000000, apiCallsUsed: 678000, storageLimitGb: 500, storageUsedGb: 234, autoRenew: true, paymentMethod: 'تحويل بنكي', contactName: 'رشيد الشريف', contactEmail: 'r.cherif@ecocollect.dz', contactPhone: '+213 555 56 78 90' },
  { id: 'sub6', orgName: 'إعادة تدوير الجزائر', orgType: 'recycler', plan: 'pro', status: 'active', startDate: '2024-05-01', endDate: '2025-05-01', monthlyFee: 120000, includedUsers: 50, usedUsers: 24, includedZones: 10, usedZones: 2, apiCallsLimit: 200000, apiCallsUsed: 71000, storageLimitGb: 100, storageUsedGb: 38, autoRenew: true, paymentMethod: 'تحويل بنكي', contactName: 'ليلى خليفي', contactEmail: 'l.khelifi@recycle-alger.dz', contactPhone: '+213 555 89 01 23' },
  { id: 'sub7', orgName: 'بلدية حسين داي', orgType: 'municipality', plan: 'basic', status: 'trial', startDate: '2024-08-15', endDate: '2024-09-15', monthlyFee: 45000, includedUsers: 25, usedUsers: 12, includedZones: 3, usedZones: 2, apiCallsLimit: 50000, apiCallsUsed: 18000, storageLimitGb: 20, storageUsedGb: 7, autoRenew: false, paymentMethod: 'تجريبي', contactName: 'سفيان مرابط', contactEmail: 's.merabet@hussein-dey.dz', contactPhone: '+213 555 90 12 34' },
  { id: 'sub8', orgName: 'بلدية باب الوادي', orgType: 'municipality', plan: 'basic', status: 'active', startDate: '2024-06-01', endDate: '2025-06-01', monthlyFee: 45000, includedUsers: 25, usedUsers: 19, includedZones: 3, usedZones: 3, apiCallsLimit: 50000, apiCallsUsed: 42000, storageLimitGb: 20, storageUsedGb: 15, autoRenew: true, paymentMethod: 'تحويل بنكي', contactName: 'وسيلة تومي', contactEmail: 'w.toumi@bab-el-oued.dz', contactPhone: '+213 555 01 23 45' },
  { id: 'sub9', orgName: 'مجموعة صيدال', orgType: 'business', plan: 'basic', status: 'expired', startDate: '2023-12-01', endDate: '2024-06-01', monthlyFee: 45000, includedUsers: 25, usedUsers: 0, includedZones: 3, usedZones: 0, apiCallsLimit: 50000, apiCallsUsed: 0, storageLimitGb: 20, storageUsedGb: 0, autoRenew: false, paymentMethod: 'تحويل بنكي', contactName: 'إيمان ولد علي', contactEmail: 'i.ouldali@saidal.dz', contactPhone: '+213 555 23 45 60' },
  { id: 'sub10', orgName: 'بلدية الحراش', orgType: 'municipality', plan: 'pro', status: 'suspended', startDate: '2024-02-01', endDate: '2025-02-01', monthlyFee: 120000, includedUsers: 100, usedUsers: 0, includedZones: 10, usedZones: 0, apiCallsLimit: 200000, apiCallsUsed: 0, storageLimitGb: 100, storageUsedGb: 0, autoRenew: false, paymentMethod: 'تحويل بنكي', contactName: 'نبيل بوزيد', contactEmail: 'n.bouzid@el-harrach.dz', contactPhone: '+213 555 12 34 50' },
  { id: 'sub11', orgName: 'سنتريبو الجزائر', orgType: 'recycler', plan: 'basic', status: 'pending', startDate: '2024-09-01', endDate: '2025-09-01', monthlyFee: 45000, includedUsers: 25, usedUsers: 0, includedZones: 3, usedZones: 0, apiCallsLimit: 50000, apiCallsUsed: 0, storageLimitGb: 20, storageUsedGb: 0, autoRenew: true, paymentMethod: 'بانتظار التفعيل', contactName: 'توفيق العربي', contactEmail: 't.larbi@centripo.dz', contactPhone: '+213 555 45 67 89' },
];

export const planFeatures: PlanFeature[] = [
  { label: 'المستخدمون', basic: '25', pro: '100', enterprise: '500+' },
  { label: 'المناطق المشمولة', basic: '3', pro: '10', enterprise: '20+' },
  { label: 'بلاغات المواطنين', basic: true, pro: true, enterprise: true },
  { label: 'أوامر العمل', basic: true, pro: true, enterprise: true },
  { label: 'إدارة الأسطول', basic: true, pro: true, enterprise: true },
  { label: 'خريطة الإرسال المباشرة', basic: false, pro: true, enterprise: true },
  { label: 'حاويات إنترنت الأشياء', basic: false, pro: true, enterprise: true },
  { label: 'مساعد الذكاء الاصطناعي', basic: false, pro: true, enterprise: true },
  { label: 'الإحصائيات وESG', basic: 'أساسية', pro: 'متقدمة', enterprise: 'كاملة' },
  { label: 'سوق إعادة التدوير', basic: false, pro: true, enterprise: true },
  { label: 'نقاط المواطن البيئية', basic: false, pro: true, enterprise: true },
  { label: 'صلاحيات متعددة المستأجرين', basic: false, pro: false, enterprise: true },
  { label: 'سجلات التدقيق', basic: '30 يوماً', pro: '90 يوماً', enterprise: 'غير محدود' },
  { label: 'واجهة برمجة التطبيقات', basic: '50k/شهر', pro: '200k/شهر', enterprise: '1M/شهر' },
  { label: 'مساحة التخزين', basic: '20 جيجا', pro: '100 جيجا', enterprise: '500 جيجا+' },
  { label: 'الدعم الفني', basic: 'بريد إلكتروني', pro: 'أولوية + هاتف', enterprise: 'مدير حساب مخصص' },
];
