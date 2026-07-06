"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  ClipboardList,
  Package,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessPage, type UserRole } from "@/lib/auth/permissions";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge: string | null;
  rolesAllowed?: string[];
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const sidebarGroupsConfig: SidebarGroup[] = [
  {
    title: "General",
    items: [
      {
        title: "Dashboard",
        href: "/app",
        icon: LayoutDashboard,
        badge: null,
      },
      {
        title: "Analytics",
        href: "/app/analytics",
        icon: BarChart3,
        badge: "New",
      },
      {
        title: "Settings",
        href: "/app/settings",
        icon: Settings,
        badge: null,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        title: "Item Setting",
        href: "/app/masterdata/item-setting",
        icon: Database,
        badge: null,
      },
      {
        title: "Line Setting",
        href: "/app/masterdata/line-setting",
        icon: Settings,
        badge: null,
      },
    ],
  },
  {
    title: "Production",
    items: [
      {
        title: "Assembly Report",
        href: "/app/production/assembly",
        icon: ClipboardList,
        badge: null,
      },
      {
        title: "Packing Report",
        href: "/app/production/packing",
        icon: Package,
        badge: null,
      },
      {
        title: "Production History",
        href: "/app/production/records",
        icon: History,
        badge: null,
      },
    ],
  },

  {
    title: "Pages",
    items: [
      {
        title: "Users",
        href: "/app/users",
        icon: Users,
        badge: null,
        rolesAllowed: ["super_admin", "admin"],
      },
      /*
      {
        title: "Projects",
        href: "/app/projects",
        icon: FolderKanban,
        badge: null,
      },
      {
        title: "Documents",
        href: "/app/documents",
        icon: FileText,
        badge: null,
      },
      {
        title: "Calendar",
        href: "/app/calendar",
        icon: Calendar,
        badge: null,
      },
      {
        title: "Auth Pages",
        href: "/app/auth",
        icon: LogIn,
        badge: null,
        rolesAllowed: ["super_admin"],
      },
      {
        title: "Error Pages",
        href: "/app/errors",
        icon: AlertCircle,
        badge: null,
        rolesAllowed: ["super_admin"],
      },
      */
    ],
  },
  /*
  {
    title: "Others",
    items: [
      {
        title: "Messages",
        href: "/app/messages",
        icon: MessageSquare,
        badge: null,
      },
      {
        title: "Database",
        href: "/app/database",
        icon: Database,
        badge: null,
        rolesAllowed: ["super_admin"],
      },
      {
        title: "Security",
        href: "/app/security",
        icon: Shield,
        badge: null,
        rolesAllowed: ["super_admin"],
      },
      {
        title: "Help",
        href: "/app/help",
        icon: HelpCircle,
        badge: null,
      },
    ],
  },
  */
];

interface SidebarProps {
  onMobileClose?: () => void;
  role: "super_admin" | "admin" | "user";
}

export function Sidebar({ onMobileClose, role }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Filter groups and items based on role
  let filteredGroups: SidebarGroup[] = [];
  if (role === "super_admin") {
    filteredGroups = [
      {
        title: "Quản trị tối cao",
        items: [
          {
            title: "Quản trị hệ thống",
            href: "/dashboard-admin",
            icon: LayoutDashboard,
            badge: null,
          },
        ],
      },
    ];
  } else {
    filteredGroups = sidebarGroupsConfig
      .map((group) => {
        const items = group.items.filter((item) => {
          // Check dynamic page permissions first
          if (!canAccessPage(role as UserRole, item.href)) {
            return false;
          }
          // If rolesAllowed is defined, only show if user role matches
          if (item.rolesAllowed) {
            return item.rolesAllowed.includes(role);
          }
          return true;
        });

        return {
          ...group,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-card shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-72",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6 justify-between">
        {!isCollapsed && (
          <Link href="/app" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold group-hover:text-primary transition-colors">
              Dashboard
            </span>
          </Link>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-8 p-6 overflow-y-auto">
        {filteredGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            {/* Group Title */}
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-4">
                {group.title}
              </h3>
            )}

            {/* Group Items */}
            <div className="space-y-2">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-muted",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground",
                      isCollapsed && "justify-center px-3 py-4",
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <Icon
                      className={cn(
                        "transition-all duration-200",
                        isCollapsed ? "h-5 w-5" : "h-4 w-4",
                        isActive && !isCollapsed && "text-primary-foreground",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                        {item.title}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
