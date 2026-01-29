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
  ExternalLink,
} from "lucide-react";
import { ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const adminMenuItems = [
  { icon: LayoutDashboard, label: "ダッシュボード", path: "/admin" },
  { icon: Calendar, label: "試合データ管理", path: "/admin/matches" },
  { icon: Users, label: "チーム管理", path: "/admin/teams" },
];

type AdminLayoutProps = {
  children: ReactNode;
};

function AdminLayoutSkeleton() {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-slate-900 p-4">
        <Skeleton className="h-8 w-32 mb-8 bg-slate-800" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-800" />
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
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center bg-white rounded-2xl shadow-sm p-12">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2 text-slate-900">アクセス権限がありません</h1>
          <p className="text-slate-500">この画面は管理者専用です。</p>
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
      <div className="flex h-screen w-full bg-gray-100">
        <Sidebar className="border-r-0 bg-slate-900">
          <SidebarHeader className="px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white">オシカケ</span>
                <span className="text-xs text-slate-400">Admin Portal</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 py-2">
            <div className="mb-2 px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                メニュー
              </span>
            </div>
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
                        "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-slate-800 p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="w-full justify-between px-3 py-3 rounded-lg hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-slate-700">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium">
                            {user.name?.[0] || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-white">{user.name || "Admin"}</span>
                          <span className="text-xs text-slate-400">管理者</span>
                        </div>
                      </div>
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-56">
                    <DropdownMenuItem onClick={() => setLocation("/app")} className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      ユーザー画面へ
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4" />
                      ログアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-gray-100">
          <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6 lg:hidden">
            <SidebarTrigger className="text-slate-600" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900">Admin</span>
            </div>
          </header>
          <main className="p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
