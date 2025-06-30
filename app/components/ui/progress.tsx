import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '~/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const [animatedValue, setAnimatedValue] = React.useState(0);

  const targetValue = React.useMemo(() => {
    const numValue = Number(value);
    return isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
  }, [value]);

  // Animate from 0 to target value
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(targetValue);
    }, 100);

    return () => clearTimeout(timer);
  }, [targetValue]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-4 w-full overflow-hidden rounded-full', className)}
      style={{ backgroundColor: '#e5e7eb' }}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all duration-1000 ease-out"
        style={{
          transform: `translateX(-${100 - animatedValue}%)`,
          backgroundColor: '#6E59A5',
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
