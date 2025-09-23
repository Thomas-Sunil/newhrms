import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon: LucideIcon;
  variant?: "default" | "primary" | "secondary" | "success" | "warning";
  className?: string;
}

const DashboardCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  variant = "default",
  className 
}: DashboardCardProps) => {
  const variantStyles = {
    default: "bg-gradient-card border-border",
    primary: "bg-gradient-primary text-primary-foreground border-primary/20",
    secondary: "bg-gradient-secondary text-secondary-foreground border-secondary/20", 
    success: "bg-success/5 border-success/20 text-success-foreground",
    warning: "bg-warning/5 border-warning/20 text-warning-foreground"
  };

  const iconStyles = {
    default: "text-primary",
    primary: "text-primary-foreground/80",
    secondary: "text-secondary-foreground/80",
    success: "text-success",
    warning: "text-warning"
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-card hover:scale-[1.02]",
      variantStyles[variant],
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-sm font-medium",
              variant === "default" ? "text-muted-foreground" : "opacity-80"
            )}>
              {title}
            </p>
            <p className="text-3xl font-bold">
              {value}
            </p>
            {change && (
              <div className={cn(
                "flex items-center text-xs font-medium",
                change.trend === "up" && "text-success",
                change.trend === "down" && "text-destructive",
                change.trend === "neutral" && "text-muted-foreground"
              )}>
                <span>{change.value}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-full bg-white/10 flex items-center justify-center",
            variant === "default" && "bg-primary/10"
          )}>
            <Icon className={cn("h-6 w-6", iconStyles[variant])} />
          </div>
        </div>
        
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/20 rounded-full transform translate-x-1/2 -translate-y-1/2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;