import { CalendarDays, ClipboardList, PlusCircle, Shield, LogOut, Home, User, Brain } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const DashboardSidebar = () => {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  const mainItems = [
    { title: "Панель управления", url: "/dashboard", icon: ClipboardList },
    ...(user?.role !== "master" ? [{ title: "Новая запись", url: "/dashboard/new", icon: PlusCircle }] : []),
  ];

  const adminItems = [
    { title: "Администрирование", url: "/dashboard/admin", icon: Shield },
  ];

  const aiItems = [{ title: "AI-панель", url: "/dashboard/ai", icon: Brain }];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className={`p-4 border-b border-border/20 ${collapsed ? "text-center" : ""}`}>
          {collapsed ? (
            <span className="font-heading text-primary text-lg font-bold">S</span>
          ) : (
            <span className="font-heading text-lg font-bold text-foreground">
              STEEL<span className="text-primary">&</span>BLADE
            </span>
          )}
        </div>

        {/* User info */}
        {!collapsed && user && (
          <div className="p-4 border-b border-border/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-foreground text-sm font-body">{user.name}</p>
                <p className="text-muted-foreground text-xs font-body capitalize">{user.role === "user" ? "Клиент" : user.role === "master" ? "Мастер" : "Админ"}</p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <Home className="mr-2 h-4 w-4" />
                    {!collapsed && <span>На сайт</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user?.role === "admin" && aiItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user?.role === "admin" && adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4 border-t border-border/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors text-sm font-body w-full"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Выйти</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardSidebar;
