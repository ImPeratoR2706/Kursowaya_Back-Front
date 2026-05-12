import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";

const DashboardLayout = () => {
  const { user, bootstrapping, logout } = useAuth();

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm font-body">
        Загрузка сессии…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b border-border/20 px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="ml-4 text-muted-foreground text-xs font-body uppercase tracking-wider">
              Личный кабинет
            </span>
            <button
              type="button"
              onClick={logout}
              className="border border-border/40 text-muted-foreground text-xs font-heading uppercase tracking-wider px-3 py-1.5 hover:border-primary/60 hover:text-primary transition-colors"
              title="Выйти из личного кабинета"
            >
              Выйти
            </button>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
