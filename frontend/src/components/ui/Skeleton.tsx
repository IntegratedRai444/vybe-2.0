import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  className,
  height = '1.25rem',
  width = '100%',
  rounded = 'md',
  ...props
}: SkeletonProps) {
  const borderRadius = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        borderRadius,
        className
      )}
      style={{
        height,
        width,
      }}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
  ...props
}: Omit<SkeletonProps, 'height' | 'width'> & { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(i === lines - 1 ? 'w-3/4' : 'w-full', className)}
          height="1rem"
          {...props}
        />
      ))}
    </div>
  );
}
