import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "gray";
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
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };
  
  const colorMap = {
    primary: "text-primary",
    white: "text-white",
    gray: "text-gray-400"
  };
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeMap[size], colorMap[color])} />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}