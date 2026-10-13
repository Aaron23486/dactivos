import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ArrowLeftRight,
  Wrench,
  Settings,
  UserCog,
  History,
  FileSpreadsheet,
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Activos", href: "/activos", icon: Package },
  { label: "Empleados", href: "/empleados", icon: Users },
  { label: "Departamentos", href: "/departamentos", icon: Building2 },
  { label: "Asignaciones", href: "/asignaciones", icon: ArrowLeftRight },
  { label: "Mantenimiento", href: "/mantenimiento", icon: Wrench },
  { label: "Historial", href: "/historial", icon: History },
  { label: "Reportes", href: "/reportes", icon: FileSpreadsheet },
  { label: "Usuarios", href: "/usuarios", icon: UserCog },
  { label: "Configuración", href: "/configuracion", icon: Settings },
] as const;
