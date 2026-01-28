import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, Link, Share2, Trash2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ShareModalProps {
  years: number[];
  currentYear: number;
}

export function ShareModal({ years, currentYear }: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: tokens, isLoading } = trpc.share.list.useQuery(undefined, {
    enabled: open,
  });

  const createMutation = trpc.share.create.useMutation({
    onSuccess: (data) => {
      utils.share.list.invalidate();
      const url = getShareUrl(data.token);
      navigator.clipboard.writeText(url);
      toast.success("共有リンクを作成しました", {
        description: "クリップボードにコピーされました",
      });
    },
    onError: (error) => {
      toast.error("共有リンクの作成に失敗しました", {
        description: error.message,
      });
    },
  });

  const toggleMutation = trpc.share.toggle.useMutation({
    onSuccess: () => {
      utils.share.list.invalidate();
      toast.success("共有リンクを更新しました");
    },
    onError: (error) => {
      toast.error("更新に失敗しました", {
        description: error.message,
      });
    },
  });

  const deleteMutation = trpc.share.delete.useMutation({
    onSuccess: () => {
      utils.share.list.invalidate();
      toast.success("共有リンクを削除しました");
    },
    onError: (error) => {
      toast.error("削除に失敗しました", {
        description: error.message,
      });
    },
  });

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/share/${token}`;
  };

  const handleCreate = () => {
    const year = selectedYear === "all" ? undefined : Number(selectedYear);
    createMutation.mutate({ year });
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(getShareUrl(token));
    toast.success("クリップボードにコピーしました");
  };

  const handleToggle = (id: number, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const handleDelete = (id: number) => {
    if (confirm("この共有リンクを削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          共有
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>観戦記録を共有</DialogTitle>
          <DialogDescription>
            共有リンクを作成して、あなたの観戦記録を友達やSNSで共有できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="year" className="sr-only">
                年度
              </Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="年度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全期間</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              <Link className="h-4 w-4 mr-2" />
              作成
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">作成済みのリンク</h4>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : tokens && tokens.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {token.year ? `${token.year}年` : "全期間"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(token.createdAt).toLocaleDateString("ja-JP")}作成
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={token.enabled}
                        onCheckedChange={(checked) =>
                          handleToggle(token.id, checked)
                        }
                        aria-label="リンクの有効/無効"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(token.token)}
                        title="コピー"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(getShareUrl(token.token), "_blank")
                        }
                        title="プレビュー"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(token.id)}
                        className="text-destructive hover:text-destructive"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                共有リンクはまだありません
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
