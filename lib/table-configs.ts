import type {
  CitizenReport,
  WorkOrder,
  Container,
  Vehicle,
  Driver,
  Route,
  Business,
  Contract,
  CollectionRequest,
  Invoice,
  Payment,
  RecyclerCenter,
  MaterialInventory,
  MarketplaceListing,
  WeighbridgeTransaction,
  TransferStation,
  MaintenanceRecord,
  AuditLogEntry,
  EcoProfile,
  ZoneData,
  WasteByTypeData,
  MonthlyCollectionData,
  ActivityFeedItem,
  KpiData,
} from '@/lib/types';
import { transformRow, transformModel, type TableConfig } from '@/lib/db';

export const reportConfig: TableConfig<CitizenReport> = {
  table: 'citizen_reports',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as CitizenReport,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const workOrderConfig: TableConfig<WorkOrder> = {
  table: 'work_orders',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as WorkOrder,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const containerConfig: TableConfig<Container> = {
  table: 'containers',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Container,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const vehicleConfig: TableConfig<Vehicle> = {
  table: 'vehicles',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Vehicle,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const driverConfig: TableConfig<Driver> = {
  table: 'drivers',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Driver,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const routeConfig: TableConfig<Route> = {
  table: 'routes',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Route,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const businessConfig: TableConfig<Business> = {
  table: 'businesses',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Business,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const contractConfig: TableConfig<Contract> = {
  table: 'contracts',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Contract,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const requestConfig: TableConfig<CollectionRequest> = {
  table: 'collection_requests',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as CollectionRequest,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const invoiceConfig: TableConfig<Invoice> = {
  table: 'invoices',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Invoice,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const paymentConfig: TableConfig<Payment> = {
  table: 'payments',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as Payment,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const recyclerConfig: TableConfig<RecyclerCenter> = {
  table: 'recycler_centers',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as RecyclerCenter,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const materialConfig: TableConfig<MaterialInventory> = {
  table: 'material_inventory',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as MaterialInventory,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const marketplaceConfig: TableConfig<MarketplaceListing> = {
  table: 'marketplace_listings',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as MarketplaceListing,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const weighbridgeConfig: TableConfig<WeighbridgeTransaction> = {
  table: 'weighbridge_transactions',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as WeighbridgeTransaction,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const transferStationConfig: TableConfig<TransferStation> = {
  table: 'transfer_stations',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as TransferStation,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const maintenanceConfig: TableConfig<MaintenanceRecord> = {
  table: 'maintenance_records',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as MaintenanceRecord,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const auditConfig: TableConfig<AuditLogEntry> = {
  table: 'audit_logs',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as AuditLogEntry,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const ecoProfileConfig: TableConfig<EcoProfile> = {
  table: 'eco_profiles',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as EcoProfile,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const zoneConfig: TableConfig<ZoneData> = {
  table: 'zones',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as ZoneData,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const wasteTypeConfig: TableConfig<WasteByTypeData> = {
  table: 'waste_by_type',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as WasteByTypeData,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const monthlyConfig: TableConfig<MonthlyCollectionData> = {
  table: 'monthly_collection',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as MonthlyCollectionData,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const activityConfig: TableConfig<ActivityFeedItem> = {
  table: 'activity_feed',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as ActivityFeedItem,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};

export const kpiConfig: TableConfig<KpiData> = {
  table: 'kpi_data',
  idField: 'id',
  toModel: (r) => transformRow(r) as unknown as KpiData,
  toRow: (m) => transformModel(m as Record<string, unknown>),
};
