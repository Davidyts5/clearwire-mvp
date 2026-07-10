import { 
  Activity,
  User, 
  Building2, 
  ListTodo,
  CheckSquare,
  ShieldCheck
} from 'lucide-react';
import { ROLES, Role } from '@/lib/roles';

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  allowedRoles: Role[];
};

export const NAVIGATION_CONFIG: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Activity, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR] },
  { label: 'Wire Requests', href: '/clerk-dashboard', icon: ListTodo, allowedRoles: [ROLES.CLERK] },
  { label: 'Company Wires', href: '/controller-dashboard', icon: ListTodo, allowedRoles: [ROLES.CONTROLLER] },
  { label: 'Vendors', href: '/vendors', icon: Building2, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO] },
  { label: 'Vendor Requests', href: '/vendor-requests', icon: CheckSquare, allowedRoles: [ROLES.CONTROLLER, ROLES.CFO] },
  { label: 'Security & Policy Engine', href: '/settings', icon: ShieldCheck, allowedRoles: [ROLES.CFO] },
  { label: 'Investigation Center', href: '/auditor-dashboard', icon: ShieldCheck, allowedRoles: [ROLES.AUDITOR, ROLES.CFO] },
];

export const getNavItemsForRole = (role: Role) => {
  return NAVIGATION_CONFIG.filter(item => item.allowedRoles.includes(role));
};
