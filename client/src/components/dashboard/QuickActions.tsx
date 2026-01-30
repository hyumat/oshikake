/**
 * Quick Actions Component
 * ダッシュボードのクイックアクションセクション
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3, TrendingUp, Sparkles } from "lucide-react";

interface QuickActionsProps {
  onNavigate: (path: string) => void;
  showAIChat: boolean;
  onToggleAIChat: () => void;
}

export function QuickActions({ onNavigate, showAIChat, onToggleAIChat }: QuickActionsProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>クイックアクション</CardTitle>
        <CardDescription>よく使う機能へのショートカット</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            onClick={() => onNavigate('/matches')}
            className="w-full"
          >
            <Calendar className="mr-2 h-4 w-4" />
            試合一覧
          </Button>
          <Button
            onClick={() => onNavigate('/statistics')}
            variant="outline"
            className="w-full"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            詳細統計
          </Button>
          <Button
            onClick={() => onNavigate('/settings')}
            variant="outline"
            className="w-full"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            設定
          </Button>
          <Button
            onClick={onToggleAIChat}
            variant={showAIChat ? "secondary" : "outline"}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {showAIChat ? "AIを閉じる" : "AIに質問"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
