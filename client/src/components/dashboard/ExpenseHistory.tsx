/**
 * Expense History Component
 * 費用履歴セクション（フィルタリング機能付き）
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Filter } from "lucide-react";
import { formatCurrency } from "@shared/formatters";

type ExpenseCategory = 'all' | 'transport' | 'ticket' | 'food' | 'other';

interface Expense {
  id: number;
  category: string;
  amount: number;
  matchDate: string | null;
  opponent: string | null;
  note: string | null;
  createdAt: Date;
}

interface ExpenseHistoryData {
  success: boolean;
  expenses: Expense[];
}

interface ExpenseHistoryProps {
  data?: ExpenseHistoryData;
  isLoading: boolean;
  category: ExpenseCategory;
  minAmount: string;
  maxAmount: string;
  onCategoryChange: (value: ExpenseCategory) => void;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
  onClearFilters: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: '交通費',
  ticket: 'チケット',
  food: '飲食',
  other: 'その他',
};

const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ticket: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  food: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  other: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function ExpenseHistory({
  data,
  isLoading,
  category,
  minAmount,
  maxAmount,
  onCategoryChange,
  onMinAmountChange,
  onMaxAmountChange,
  onClearFilters,
}: ExpenseHistoryProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              費用履歴
            </CardTitle>
            <CardDescription>カテゴリと金額でフィルタリング</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Category Filter */}
          <div className="space-y-2">
            <Label htmlFor="category-filter">カテゴリ</Label>
            <Select value={category} onValueChange={(value) => onCategoryChange(value as ExpenseCategory)}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="transport">交通費</SelectItem>
                <SelectItem value="ticket">チケット</SelectItem>
                <SelectItem value="food">飲食</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Amount Filter */}
          <div className="space-y-2">
            <Label htmlFor="min-amount">最小金額（円）</Label>
            <Input
              id="min-amount"
              type="number"
              placeholder="0"
              value={minAmount}
              onChange={(e) => onMinAmountChange(e.target.value)}
            />
          </div>

          {/* Max Amount Filter */}
          <div className="space-y-2">
            <Label htmlFor="max-amount">最大金額（円）</Label>
            <Input
              id="max-amount"
              type="number"
              placeholder="上限なし"
              value={maxAmount}
              onChange={(e) => onMaxAmountChange(e.target.value)}
            />
          </div>

          {/* Clear Filter Button */}
          <div className="space-y-2 flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={onClearFilters}
            >
              <Filter className="mr-2 h-4 w-4" />
              クリア
            </Button>
          </div>
        </div>

        {/* Expense List */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data?.success || data.expenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>費用履歴がありません</p>
              <p className="text-sm">試合詳細ページから費用を記録しましょう</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.expenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${CATEGORY_COLORS[expense.category]}`}>
                          {CATEGORY_LABELS[expense.category]}
                        </span>
                        <span className="text-lg font-semibold">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          {expense.matchDate && `${expense.matchDate} `}
                          {expense.opponent && `vs ${expense.opponent}`}
                        </p>
                        {expense.note && (
                          <p className="mt-1 text-xs italic">{expense.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(expense.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Show count */}
        {data?.success && data.expenses.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {data.expenses.length}件の費用を表示中（最新20件）
          </p>
        )}
      </CardContent>
    </Card>
  );
}
