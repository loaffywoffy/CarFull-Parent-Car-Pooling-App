import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg"; 
  color?: "primary" | "secondary" | "accent" | "muted";
  className?: string;
  text?: string;
}

export function Spinner({ 
  size = "md", 
  color = "primary",
  className, 
  text 
}: SpinnerProps) {
  const sizeMap = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const colorMap = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-indigo-500", 
    muted: "text-muted-foreground",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn(
        "animate-spin", 
        sizeMap[size], 
        colorMap[color]
      )} />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  );
}