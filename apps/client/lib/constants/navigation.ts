import type React from "react";
import {
  Boxes,
  Building,
  Building2,
  Cpu,
  CreditCard,
  Factory,
  Hash,
  History,
  KeyRound,
  LayoutDashboard,
  Package,
  Plug,
  Shield,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import type { SearchResultItem } from "@ims/api-client";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: string;
  permission?: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    group: "Inventory",
    items: [
      { label: "Parts Catalog", href: "/parts", icon: Cpu, feature: "PARTS" },
      { label: "Stock & Locations", href: "/stock", icon: Boxes, feature: "STOCK" },
    ],
  },
  {
    group: "Purchasing",
    items: [
      { label: "Companies & Suppliers", href: "/companies", icon: Building2, feature: "COMPANIES" },
      { label: "Purchase Orders", href: "/purchasing", icon: ShoppingCart, feature: "PURCHASING" },
    ],
  },
  {
    group: "Manufacturing",
    items: [
      { label: "Build Orders & BOM", href: "/manufacturing", icon: Factory, feature: "MANUFACTURING" },
    ],
  },
  {
    group: "Sales & Outbound",
    items: [
      { label: "Sales Orders", href: "/sales", icon: Package, feature: "SALES" },
      { label: "Transfers", href: "/transfers", icon: Truck, feature: "TRANSFERS" },
    ],
  },
];

export const SETTINGS_NAV: NavItem[] = [
  { label: "Organization", href: "/settings/organization", icon: Building },
  { label: "Users & Invitations", href: "/settings/users", icon: Users },
  { label: "Roles & Permissions", href: "/settings/roles", icon: Shield },
  {
    label: "API Tokens",
    href: "/settings/api-tokens",
    icon: KeyRound,
    feature: "API_ACCESS",
  },
  { label: "Reference Formats", href: "/settings/sequences", icon: Hash },
  { label: "Integrations", href: "/settings/integrations", icon: Plug },
  { label: "Audit Log", href: "/settings/audit-log", icon: History },
  { label: "Plan & Features", href: "/settings/plan", icon: CreditCard },
];

export const QUICK_LINKS: SearchResultItem[] = [
  {
    category: "Navigation",
    id: "nav-dashboard",
    title: "Overview Dashboard",
    subtitle: "Tenant summary, KPIs, and quick actions",
    href: "/",
  },
  {
    category: "Inventory",
    id: "nav-parts",
    title: "Parts Catalog & Categories",
    subtitle: "Hierarchical ltree categories, parts, variants, revisions, and typed parameters",
    href: "/parts",
  },
  {
    category: "Inventory",
    id: "nav-stock",
    title: "Warehouse Locations & Stock Engine",
    subtitle: "Storage bins, batches, serialized stock, transfers, and barcode scanner",
    href: "/stock",
  },
  {
    category: "Purchasing",
    id: "nav-companies",
    title: "Companies & Suppliers",
    subtitle: "Vendors, manufacturers, customers, pack-size SKUs, and exchange rates",
    href: "/companies",
  },
  {
    category: "Purchasing",
    id: "nav-purchasing",
    title: "Purchase Orders & Receiving",
    subtitle: "Inbound supplier orders, tiered pricing, and warehouse receiving",
    href: "/purchasing",
  },
  {
    category: "Manufacturing",
    id: "nav-manufacturing",
    title: "Manufacturing & Build Orders",
    subtitle: "BOM assemblies, stock allocation, build outputs, and serialized genealogy",
    href: "/manufacturing",
  },
  {
    category: "Sales & Outbound",
    id: "nav-sales",
    title: "Sales Orders & Shipments",
    subtitle: "Customer orders, stock allocations, and shipment dispatch",
    href: "/sales",
  },
  {
    category: "Sales & Outbound",
    id: "nav-transfers",
    title: "Transfers & Return Orders (RMA)",
    subtitle: "Inter-warehouse transfers and customer returns",
    href: "/transfers",
  },
  {
    category: "Settings",
    id: "nav-integrations",
    title: "Reports, Webhooks & Real-Time SSE",
    subtitle: "Custom PDF templates, HMAC webhooks, and live SSE event streams",
    href: "/settings/integrations",
  },
  {
    category: "Settings",
    id: "nav-org",
    title: "Organization Settings",
    subtitle: "Name, base currency, timezone, and preferences",
    href: "/settings/organization",
  },
  {
    category: "Settings",
    id: "nav-users",
    title: "Users & Invitations",
    subtitle: "Manage tenant users and role assignments",
    href: "/settings/users",
  },
  {
    category: "Settings",
    id: "nav-roles",
    title: "Roles & Permissions",
    subtitle: "Configure granular RBAC permissions",
    href: "/settings/roles",
  },
  {
    category: "Settings",
    id: "nav-tokens",
    title: "API Tokens",
    subtitle: "Programmatic REST API personal access tokens",
    href: "/settings/api-tokens",
  },
  {
    category: "Settings",
    id: "nav-sequences",
    title: "Reference Sequences",
    subtitle: "PO-0001, BO-0001, SO-0001 numbering formats",
    href: "/settings/sequences",
  },
  {
    category: "Settings",
    id: "nav-audit",
    title: "Audit Log",
    subtitle: "Immutable field-level before/after audit trail",
    href: "/settings/audit-log",
  },
  {
    category: "Settings",
    id: "nav-plan",
    title: "Plan & Features",
    subtitle: "Active subscription plan, feature entitlements, and usage quotas",
    href: "/settings/plan",
  },
];
