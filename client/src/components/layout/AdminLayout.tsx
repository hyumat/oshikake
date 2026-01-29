import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  Calendar,
  Users,
  Shield,
  ChevronUp,
} from "lucide-react";
import { ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const adminMenuItems = [
  { icon: LayoutDashboard, label: "管理コンソール", path: "/admin" },
  { icon: Calendar, label: "試合データ管理", path: "/admin/matches" },
  { icon: Users, label: "チーム管理", path: "/admin/teams" },
];

type AdminLayoutProps = {
  children: ReactNode;
};

function AdminLayoutSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-64 bg-white border-r p-4">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (loading) {
    return <AdminLayoutSkeleton />;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">アクセス権限がありません</h1>
          <p className="text-slate-600">この画面は管理者専用です。</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-screen w-full bg-slate-50">
        <Sidebar className="border-r bg-white">
          <SidebarHeader className="border-b px-4 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-lg">Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                  (item.path !== "/admin" && location.startsWith(item.path));
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => setLocation(item.path)}
                      isActive={isActive}
                      className={cn(
                        "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-500")} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full justify-between px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                            {user.name?.[0] || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-sm">
                          <span className="font-medium">{user.name || "Admin"}</span>
                          <span className="text-xs text-slate-500">管理者</span>
                        </div>
                      </div>
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    <DropdownMenuItem onClick={() => setLocation("/app")}>
                      ユーザー画面へ
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      ログアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto">
          <header className="flex h-14 items-center gap-4 border-b bg-white px-6 lg:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Admin</span>
            </div>
          </header>
          <main className="p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
