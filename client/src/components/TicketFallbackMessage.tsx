/**
 * Issue #124: チケット情報未取得時のフォールバックメッセージコンポーネント
 *
 * チケット販売情報が未発表の場合に、適切なメッセージと
 * 対戦相手またはマリノス公式のチケットページへのリンクを表示
 */

import { Ticket, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

interface TicketFallbackMessageProps {
  message: string;
  linkText: string;
  linkUrl: string | null;
}

export function TicketFallbackMessage({
  message,
  linkText,
  linkUrl,
}: TicketFallbackMessageProps) {
  if (!linkUrl) {
    // リンクがない場合はメッセージのみ表示
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
        <Ticket className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 bg-muted/50 border border-border rounded-lg">
      <Ticket className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-primary hover:text-primary/80"
          asChild
        >
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            {linkText}
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}
