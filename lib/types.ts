export type ReportStatus =
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'AI_REVIEW'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'CLOSED';

export type ReportType =
  | 'overflowing_container'
  | 'illegal_dumping'
  | 'missed_collection'
  | 'damaged_container'
  | 'waste_scattered'
  | 'large_waste'
  | 'hazardous_waste'
  | 'bad_smell'
  | 'other';

export type Priority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type WorkOrderStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE';

export type WorkOrderType =
  | 'citizen_complaint'
  | 'b2b_collection'
  | 'container_maintenance'
  | 'emergency_cleanup'
  | 'scheduled_route'
  | 'illegal_dumping';

export type ContainerStatus =
  | 'ACTIVE'
  | 'FULL'
  | 'DAMAGED'
  | 'MAINTENANCE'
  | 'REMOVED';

export type WasteType =
  | 'GENERAL'
  | 'ORGANIC'
  | 'PLASTIC'
  | 'PAPER'
  | 'CARDBOARD'
  | 'GLASS'
  | 'METAL'
  | 'ELECTRONIC'
  | 'CONSTRUCTION'
  | 'MEDICAL'
  | 'HAZARDOUS'
  | 'LARGE_WASTE'
  | 'USED_OIL'
  | 'OTHER';

export type VehicleStatus =
  | 'AVAILABLE'
  | 'ON_ROUTE'
  | 'LOADING'
  | 'MAINTENANCE'
  | 'OFFLINE';

export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface CitizenReport {
  id: string;
  reportId: string;
  type: ReportType;
  status: ReportStatus;
  priority: Priority;
  citizenName: string;
  location: string;
  zone: string;
  lat: number;
  lng: number;
  description: string;
  submittedAt: string;
  assignedTeam?: string;
  estimatedResponse?: string;
  resolvedAt?: string;
  rating?: number;
  aiConfidence?: number;
  hasPhoto: boolean;
}

export interface WorkOrder {
  id: string;
  orderId: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: Priority;
  location: string;
  zone: string;
  description: string;
  assignedTeam?: string;
  assignedVehicle?: string;
  driver?: string;
  dueTime: string;
  slaStatus: SLAStatus;
  createdAt: string;
  progress: number;
}

export interface Container {
  id: string;
  containerId: string;
  type: string;
  capacity: number;
  fillLevel: number;
  wasteType: WasteType;
  zone: string;
  location: string;
  lat: number;
  lng: number;
  status: ContainerStatus;
  lastCollection: string;
  nextCollection: string;
  hasSensor: boolean;
}

export interface Vehicle {
  id: string;
  plate: string;
  type: string;
  capacity: number;
  currentLoad: number;
  driver: string;
  status: VehicleStatus;
  zone: string;
  lat: number;
  lng: number;
  mileage: number;
  fuel: number;
  speed: number;
  routeProgress: number;
  nextStop: string;
  eta: string;
}

export interface KpiData {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  sparkline: number[];
}

export interface ZoneData {
  zone: string;
  reports: number;
  wasteCollected: number;
  recyclingRate: number;
  slaCompliance: number;
}

export interface WasteByTypeData {
  type: string;
  tons: number;
  color: string;
}

export interface MonthlyCollectionData {
  month: string;
  collected: number;
  recycled: number;
  landfilled: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'report' | 'workorder' | 'collection' | 'alert' | 'vehicle' | 'invoice';
  message: string;
  time: string;
  priority?: Priority;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  legalId: string;
  address: string;
  zone: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contractStatus: 'active' | 'expired' | 'pending' | 'none';
  monthlyVolume: number;
  recyclingRate: number;
  outstandingBalance: number;
  locations: number;
  containers: number;
}

export interface Contract {
  id: string;
  contractId: string;
  customer: string;
  startDate: string;
  endDate: string;
  wasteTypes: string[];
  frequency: string;
  containerCount: number;
  monthlyPrice: number;
  extraPickupPrice: number;
  sla: string;
  paymentTerms: string;
  status: 'active' | 'expiring' | 'expired' | 'pending';
}

export interface CollectionRequest {
  id: string;
  requestId: string;
  business: string;
  wasteType: WasteType;
  quantity: number;
  container: string;
  location: string;
  preferredDate: string;
  priority: Priority;
  status: 'pending' | 'priced' | 'dispatched' | 'collected' | 'completed' | 'cancelled';
  notes?: string;
  price?: number;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  customer: string;
  issueDate: string;
  dueDate: string;
  items: string[];
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  paymentId: string;
  invoiceRef: string;
  customer: string;
  amount: number;
  method: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface RecyclerCenter {
  id: string;
  name: string;
  location: string;
  zone: string;
  capacity: number;
  incomingToday: number;
  processedToday: number;
  recoveredToday: number;
  rejectsToday: number;
  efficiency: number;
  materials: string[];
}

export interface MaterialInventory {
  id: string;
  material: string;
  unit: string;
  openingStock: number;
  incoming: number;
  processed: number;
  sold: number;
  currentStock: number;
  quality: 'A' | 'B' | 'C';
  pricePerTon: number;
}

export interface MarketplaceListing {
  id: string;
  listingId: string;
  material: string;
  quantity: number;
  unit: string;
  quality: string;
  price: number;
  location: string;
  seller: string;
  availableDate: string;
  status: 'available' | 'reserved' | 'sold';
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license: string;
  assignedVehicle: string;
  status: 'available' | 'on_route' | 'off_duty' | 'on_leave';
  rating: number;
  completedRoutes: number;
  hoursThisWeek: number;
  zone: string;
}

export interface Route {
  id: string;
  routeId: string;
  driver: string;
  vehicle: string;
  zone: string;
  stops: number;
  distance: number;
  estimatedDuration: string;
  collectedWeight: number;
  progress: number;
  status: 'planned' | 'active' | 'completed' | 'delayed';
  startTime: string;
}

export interface WeighbridgeTransaction {
  id: string;
  ticketId: string;
  vehicle: string;
  driver: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  wasteType: WasteType;
  origin: string;
  destination: string;
  timestamp: string;
  status: 'entered' | 'weighed' | 'completed';
}

export interface AuditLogEntry {
  id: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  ip: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface EcoProfile {
  id: string;
  citizen: string;
  ecoPoints: number;
  level: string;
  totalReports: number;
  verifiedReports: number;
  recyclingActions: number;
  cleanups: number;
}

export interface TransferStation {
  id: string;
  name: string;
  location: string;
  zone: string;
  incomingToday: number;
  outgoingToday: number;
  storageCurrent: number;
  storageCapacity: number;
  trucksProcessed: number;
  avgWaitTime: string;
  status: 'operational' | 'near_capacity' | 'offline';
}

export interface MaintenanceRecord {
  id: string;
  vehicle: string;
  type: string;
  status: 'in_progress' | 'scheduled' | 'completed';
  assignedTo: string;
  startDate: string;
  estCompletion: string;
  cost: number;
  mileage: number;
}
