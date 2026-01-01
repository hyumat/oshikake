/**
 * User Match Form Component
 * Issue #39: 観戦記録フォームをコンポーネント化（ViewとFormの責務分離）
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Wallet, Train, Ticket, Utensils, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '@shared/formatters';
import { validateExpenseData, calculateTotalCost, type ExpenseFormData } from '@shared/validation';
import { toast } from 'sonner';

export type ExpenseData = ExpenseFormData;

export interface UserMatchFormProps {
  initialValues?: ExpenseData;
  onSubmit: (data: ExpenseData) => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

const EMPTY_EXPENSES: ExpenseData = {
  transportation: '',
  ticket: '',
  food: '',
  other: '',
  note: '',
};

export function UserMatchForm({
  initialValues = EMPTY_EXPENSES,
  onSubmit,
  onDelete,
  isSaving = false,
}: UserMatchFormProps) {
  const [expenses, setExpenses] = useState<ExpenseData>(initialValues);

  useEffect(() => {
    setExpenses(initialValues);
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateExpenseData(expenses);
    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    onSubmit(expenses);
  };

  const totalCost = calculateTotalCost(expenses);

  const handleChange = (field: keyof ExpenseData, value: string) => {
    setExpenses(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5" />
          観戦費用
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transportation" className="flex items-center gap-2 text-sm">
                <Train className="w-4 h-4" />
                交通費
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="transportation"
                  type="number"
                  min="0"
                  className="pl-8"
                  placeholder="例）2400"
                  value={expenses.transportation}
                  onChange={(e) => handleChange('transportation', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket" className="flex items-center gap-2 text-sm">
                <Ticket className="w-4 h-4" />
                チケット代
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="ticket"
                  type="number"
                  min="0"
                  className="pl-8"
                  placeholder="例）5000"
                  value={expenses.ticket}
                  onChange={(e) => handleChange('ticket', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="food" className="flex items-center gap-2 text-sm">
                <Utensils className="w-4 h-4" />
                飲食代
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="food"
                  type="number"
                  min="0"
                  className="pl-8"
                  placeholder="例）2500"
                  value={expenses.food}
                  onChange={(e) => handleChange('food', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="other" className="flex items-center gap-2 text-sm">
                <MoreHorizontal className="w-4 h-4" />
                その他
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="other"
                  type="number"
                  min="0"
                  className="pl-8"
                  placeholder="例）1000"
                  value={expenses.other}
                  onChange={(e) => handleChange('other', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>合計</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm">メモ</Label>
            <Textarea
              id="note"
              placeholder="試合の感想やメモを入力..."
              rows={3}
              value={expenses.note}
              onChange={(e) => handleChange('note', e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              保存する
            </Button>
            {onDelete && (
              <Button type="button" variant="outline" onClick={onDelete}>
                削除
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

