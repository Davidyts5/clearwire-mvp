import { 
  Activity, 
  Building2, 
  FileText, 
  Users, 
  Settings, 
  UserCircle, 
  CheckSquare, 
  ShieldCheck,
  ListTodo,
  BarChart3
} from 'lucide-react';
import { ROLES, Role } from '@/lib/roles';

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  allowedRoles: Role[];
};

export const NAVIGATION_CONFIG: NavItem[] = [
  // Dashboards (Dynamic routing resolves these to the correct dashboard)
  { label: 'Dashboard', href: '/dashboard', icon: Activity, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR] },
  
  // Operational
  { label: 'Wire Requests', href: '/clerk-dashboard', icon: ListTodo, allowedRoles: [ROLES.CLERK] },
  { label: 'Company Wires', href: '/controller-dashboard', icon: ListTodo, allowedRoles: [ROLES.CONTROLLER] },
  { label: 'Vendors', href: '/vendors', icon: Building2, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO] },
  
  // Approvals
  { label: 'Approvals', href: '/approvals', icon: CheckSquare, allowedRoles: [ROLES.CONTROLLER] },
  { label: 'Executive Queue', href: '/executive', icon: CheckSquare, allowedRoles: [ROLES.CFO] },
  
  // Administration & Compliance
  { label: 'Audit Logs', href: '/audit', icon: ShieldCheck, allowedRoles: [ROLES.CFO, ROLES.AUDITOR] },
  { label: 'Reports', href: '/reports', icon: BarChart3, allowedRoles: [ROLES.AUDITOR] },
  { label: 'Team & Policies', href: '/team', icon: Users, allowedRoles: [ROLES.CFO] },
  { label: 'System Settings', href: '/settings', icon: Settings, allowedRoles: [ROLES.CFO] },
  
  // User
  { label: 'Profile', href: '/profile', icon: UserCircle, allowedRoles: [ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR] },
];

export const getNavItemsForRole = (role: Role) => {
  return NAVIGATION_CONFIG.filter(item => item.allowedRoles.includes(role));
};
