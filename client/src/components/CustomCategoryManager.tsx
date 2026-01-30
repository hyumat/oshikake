/**
 * Issue #74 / #109: カスタム費用カテゴリ管理 (Pro限定)
 *
 * Pro ユーザーが費用カテゴリを追加・編集・削除・並び替えできるUI。
 * Free/Plus ユーザーにはアップグレード案内を表示する。
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Lock, GripVertical } from 'lucide-react';
import { Link } from 'wouter';

interface CustomCategoryManagerProps {
  canCustomCategories: boolean;
}

export function CustomCategoryManager({ canCustomCategories }: CustomCategoryManagerProps) {
  const [newName, setNewName] = useState('');

  const utils = trpc.useUtils();
  const { data: categoriesData } = trpc.categories.list.useQuery(undefined, {
    enabled: canCustomCategories,
  });

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success('カテゴリを追加しました');
      setNewName('');
      utils.categories.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'カテゴリの追加に失敗しました');
    },
  });

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success('カテゴリを削除しました');
      utils.categories.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'カテゴリの削除に失敗しました');
    },
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const nextOrder = (categoriesData?.categories?.length ?? 0);
    createMutation.mutate({ name: trimmed, displayOrder: nextOrder });
  };

  if (!canCustomCategories) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            カスタムカテゴリ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Proプランでは、費用カテゴリを自由に追加・管理できます。
          </p>
          <Link href="/pricing">
            <Button variant="outline" size="sm">
              プランを見る
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const categories = categoriesData?.categories ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">カスタムカテゴリ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground mb-2">
          固定カテゴリ: 交通費・チケット・飲食・その他（常に利用可能）
        </div>

        {categories.length > 0 && (
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-2 text-sm">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1">{cat.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => deleteMutation.mutate({ id: cat.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">
            カスタムカテゴリはまだありません。
          </p>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="カテゴリ名"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={64}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newName.trim() || createMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
