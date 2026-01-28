import { useAuth } from "@/_core/hooks/useAuth";
import { AccountMenu } from "@/components/AccountMenu";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Calendar,
  Wallet,
  PiggyBank,
  Settings,
  Home,
} from "lucide-react";
import { CSSProperties, createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

const menuItems = [
  { icon: Home, label: "ホーム", path: "/app" },
  { icon: Calendar, label: "試合", path: "/matches" },
  { icon: Wallet, label: "費用", path: "/expenses" },
  { icon: PiggyBank, label: "貯金", path: "/savings" },
  { icon: Settings, label: "設定", path: "/settings" },
];

const SIDEBAR_WIDTH = 240;
const DETAIL_PANE_WIDTH = 360;

type DetailPaneContextType = {
  isOpen: boolean;
  content: ReactNode | null;
  openDetail: (content: ReactNode) => void;
  closeDetail: () => void;
};

const DetailPaneContext = createContext<DetailPaneContextType>({
  isOpen: false,
  content: null,
  openDetail: () => {},
  closeDetail: () => {},
});

export function useDetailPane() {
  return useContext(DetailPaneContext);
}

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { loading, user } = useAuth();
  const [detailContent, setDetailContent] = useState<ReactNode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (content: ReactNode) => {
    setDetailContent(content);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
  };

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              ログインが必要です
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              続行するにはログインしてください
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            ログイン
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DetailPaneContext.Provider
      value={{
        isOpen: detailOpen,
        content: detailContent,
        openDetail,
        closeDetail,
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${SIDEBAR_WIDTH}px`,
          } as CSSProperties
        }
      >
        <AppShellContent detailOpen={detailOpen} closeDetail={closeDetail}>
          {children}
        </AppShellContent>
      </SidebarProvider>
    </DetailPaneContext.Provider>
  );
}

function AppShellContent({
  children,
  detailOpen,
  closeDetail,
}: {
  children: ReactNode;
  detailOpen: boolean;
  closeDetail: () => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const { content: detailContent } = useDetailPane();
  const activeMenuItem = menuItems.find((item) => item.path === location);

  return (
    <>
      {!isMobile && (
        <Sidebar collapsible="icon" className="border-r">
          <SidebarHeader className="h-16 justify-center border-b">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="ナビゲーション切替"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <span className="font-semibold tracking-tight truncate text-primary">
                  オシカケ
                </span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon
                        className={cn("h-4 w-4", isActive && "text-primary")}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>ログアウト</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
      )}

      <SidebarInset className={cn(isMobile && "pb-16")}>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-primary">オシカケ</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm">{activeMenuItem?.label ?? "メニュー"}</span>
            </div>
            <AccountMenu variant="compact" showChevron={false} />
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>

          {!isMobile && detailOpen && (
            <aside
              className="border-l bg-muted/30 overflow-auto shrink-0 hidden lg:block"
              style={{ width: DETAIL_PANE_WIDTH }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">詳細</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeDetail}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
                {detailContent}
              </div>
            </aside>
          )}
        </div>

        {isMobile && (
          <>
            <BottomNav items={menuItems} />
            <Sheet open={detailOpen} onOpenChange={(open) => !open && closeDetail()}>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
                <div className="p-4">{detailContent}</div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </SidebarInset>
    </>
  );
}

function AppShellSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-60 border-r bg-muted/30 animate-pulse hidden lg:block" />
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
