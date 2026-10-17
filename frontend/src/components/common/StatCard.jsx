import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentClasses = {
  default: "text-foreground",
  emerald: "text-emerald-600",
  red: "text-red-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  muted: "text-muted-foreground",
};

export default function StatCard({
  label,
  value,
  hint,
  accent = "default",
  icon: Icon,
  className,
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p
            className={cn(
              "text-2xl font-semibold mt-1 truncate",
              accentClasses[accent] || accentClasses.default
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          )}
        </div>
        {Icon && (
          <div className="text-muted-foreground">
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </Card>
  );
}