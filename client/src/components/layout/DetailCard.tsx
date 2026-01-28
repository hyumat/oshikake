import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type DetailCardProps = {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function DetailCard({
  title,
  onClose,
  children,
  className,
  footer,
}: DetailCardProps) {
  return (
    <Card className={cn("border-0 shadow-none bg-transparent", className)}>
      {(title || onClose) && (
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="flex items-center justify-between">
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="px-0 pb-0">{children}</CardContent>
      {footer && <div className="pt-4 border-t mt-4">{footer}</div>}
    </Card>
  );
}
