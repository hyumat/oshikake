import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, CreditCard, HelpCircle, LogOut, Settings, User } from "lucide-react";
import { useLocation } from "wouter";

type AccountMenuProps = {
  variant?: "default" | "compact";
  showChevron?: boolean;
};

function getDisplayName(user: { name?: string | null; email?: string | null } | null): string {
  if (!user) return "ユーザー";

  if (user.name) {
    return user.name.length > 16 ? user.name.slice(0, 14) + "…" : user.name;
  }

  if (user.email) {
    const localPart = user.email.split("@")[0];
    return localPart.length > 16 ? localPart.slice(0, 14) + "…" : localPart;
  }

  return "ユーザー";
}

function getInitials(user: { name?: string | null; email?: string | null } | null): string {
  if (!user) return "U";

  if (user.name) {
    return user.name.charAt(0).toUpperCase();
  }

  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }

  return "U";
}

export function AccountMenu({ variant = "default", showChevron = true }: AccountMenuProps) {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        {variant === "default" && <Skeleton className="h-4 w-20" />}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="アカウントメニュー"
        >
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {variant === "default" && (
            <>
              <span className="text-sm font-medium max-w-[120px] truncate hidden sm:inline">
                {displayName}
              </span>
              {showChevron && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || "ユーザー"}</p>
            <p className="text-xs text-muted-foreground leading-none">{user.email || ""}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => setLocation("/account")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>アカウント</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLocation("/pricing")}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>プラン / お支払い</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLocation("/settings")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>設定</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLocation("/support")}
          className="cursor-pointer"
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>サポート</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>ログアウト</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccountMenuSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-20 hidden sm:block" />
    </div>
  );
}
