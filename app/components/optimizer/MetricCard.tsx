import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const MetricCard = ({ title, value, description, icon, change, trend, className }: MetricCardProps) => {
  return (
    <Card className={cn('metric-card h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || change) && (
          <div className="flex items-center mt-1">
            {trend && (
              <div
                className={cn(
                  'mr-1 rounded-sm p-0.5',
                  trend === 'up'
                    ? 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400'
                    : 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400',
                )}
              >
                {trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              </div>
            )}
            <p
              className={cn(
                'text-xs',
                trend === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : trend === 'down'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground',
              )}
            >
              {change ? `${change > 0 ? '+' : ''}${change}%` : ''} {description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
