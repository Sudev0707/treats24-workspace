import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bug,
  Filter,
  Rocket,
  FileText,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "For you", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  // { title: "Board", url: "/tasks", icon: CheckSquare },
  // { title: "Issues", url: "/issues", icon: Bug },
  { title: "Filters", url: "/queries", icon: Filter },
];

const moreItems = [
  { title: "Releases", url: "/releases", icon: Rocket },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "People", url: "/team", icon: Users },
  { title: "Insights", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const NavItem = ({ item }: { item: (typeof mainItems)[0] }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className={cn(
            "rounded-md transition-colors",
            active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <Link to={item.url} className="flex items-center gap-3">
            <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
            {!collapsed && <span className="truncate text-sm">{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">Treats24</span>
              <span className="truncate text-xs text-muted-foreground">Workspace</span>
            </div>
          )}
          {!collapsed && <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {moreItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help" className="rounded-md">
              <HelpCircle className="h-4 w-4" />
              {!collapsed && <span className="text-sm">Help</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Profile"
              isActive={isActive("/profile")}
              className={cn(
                "rounded-md transition-colors",
                isActive("/profile") && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Link to="/profile" className="flex items-center gap-2.5 px-2 py-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">SD</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">Sudev</span>
                    <span className="truncate text-xs text-muted-foreground">Owner</span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
