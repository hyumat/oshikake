import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";

interface EditableCellProps {
  value: string | number | null | undefined;
  onSave: (value: string | number | null) => Promise<void>;
  type?: "text" | "number" | "date" | "time" | "datetime" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  options = [],
  placeholder = "",
  disabled = false,
  className,
  emptyText = "-",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const originalValue = useRef<string>(value?.toString() ?? "");

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value?.toString() ?? "");
    originalValue.current = value?.toString() ?? "";
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === originalValue.current) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let saveValue: string | number | null = editValue;
      if (type === "number") {
        saveValue = editValue === "" ? null : parseFloat(editValue);
      } else if (editValue === "") {
        saveValue = null;
      }
      
      await onSave(saveValue);
      originalValue.current = editValue;
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "保存に失敗しました");
      setEditValue(originalValue.current);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, onSave, type]);

  const handleCancel = useCallback(() => {
    setEditValue(originalValue.current);
    setError(null);
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleSelectChange = useCallback(
    async (newValue: string) => {
      setEditValue(newValue);
      setIsSaving(true);
      setError(null);

      try {
        await onSave(newValue === "" ? null : newValue);
        originalValue.current = newValue;
      } catch (err: any) {
        setError(err.message || "保存に失敗しました");
        setEditValue(originalValue.current);
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
    },
    [onSave]
  );

  if (disabled) {
    return (
      <div className={cn("px-2 py-1 text-sm text-slate-500", className)}>
        {value?.toString() || emptyText}
      </div>
    );
  }

  if (type === "select") {
    return (
      <div className={cn("relative", className)}>
        <Select
          value={editValue}
          onValueChange={handleSelectChange}
          disabled={isSaving}
        >
          <SelectTrigger
            className={cn(
              "h-8 text-sm border-0 shadow-none hover:bg-slate-100 focus:ring-1",
              error && "ring-1 ring-red-500"
            )}
          >
            <SelectValue placeholder={placeholder || emptyText} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSaving && (
          <Loader2 className="absolute right-8 top-2 h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          "px-2 py-1 text-sm cursor-pointer rounded hover:bg-slate-100 min-h-[28px] flex items-center",
          error && "ring-1 ring-red-500 bg-red-50",
          className
        )}
        title={error || undefined}
      >
        {value?.toString() || <span className="text-slate-400">{emptyText}</span>}
      </div>
    );
  }

  const inputType = type === "datetime" ? "datetime-local" : type;

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      <Input
        ref={inputRef}
        type={inputType}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSaving}
        className={cn(
          "h-8 text-sm",
          error && "ring-1 ring-red-500"
        )}
      />
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      ) : (
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={handleSave}
            className="p-1 hover:bg-green-100 rounded text-green-600"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
