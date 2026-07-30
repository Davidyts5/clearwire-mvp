import { 
  Activity,
  User,
  Building2, 
  ListTodo,
  CheckSquare,
  ShieldCheck,
  BarChart3,
  FileDigit,
  FileText
} from 'lucide-react';
import { ROLES, Role } from '@/lib/roles';

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  allowedRoles: Role[];
};

export const NAVIGATION_CONFIG: NavItem[] = [
  // Clerk
  { label: 'Wire Requests', href: '/clerk-dashboard', icon: ListTodo, allowedRoles: [ROLES.CLERK] },
  
  // Controller
  { label: 'Company Wires', href: '/controller-dashboard', icon: ListTodo, allowedRoles: [ROLES.CONTROLLER] },
  
  // CFO
  { label: 'Dashboard', href: '/cfo-dashboard', icon: Activity, allowedRoles: [ROLES.CFO] },

  // Shared Vendor Management
  { label: 'Vendors', href: '/vendors', icon: Building2, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO] },
  { label: 'Vendor Requests', href: '/vendor-requests', icon: CheckSquare, allowedRoles: [ROLES.CONTROLLER, ROLES.CFO] },
  
  // CFO Settings
  { label: 'Security & Policy Engine', href: '/settings', icon: ShieldCheck, allowedRoles: [ROLES.CFO] },
  
  // Auditor / Compliance
  { label: 'Active Cases', href: '/auditor-dashboard', icon: ShieldCheck, allowedRoles: [ROLES.AUDITOR, ROLES.CFO] },
  { label: 'Risk Analytics', href: '/auditor-dashboard/analytics', icon: BarChart3, allowedRoles: [ROLES.AUDITOR, ROLES.CFO] },
  { label: 'Master Ledger', href: '/auditor-dashboard/ledger', icon: FileDigit, allowedRoles: [ROLES.AUDITOR, ROLES.CFO] },
  { label: 'Compliance Reports', href: '/auditor-dashboard/reports', icon: FileText, allowedRoles: [ROLES.AUDITOR, ROLES.CFO] },
  
  // Global
  { label: 'Security Profile', href: '/profile', icon: User, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR] }
];

export const getNavItemsForRole = (role: Role) => {
  return NAVIGATION_CONFIG.filter(item => item.allowedRoles.includes(role));
};
