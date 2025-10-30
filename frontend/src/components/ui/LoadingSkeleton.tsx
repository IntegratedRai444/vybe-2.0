import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  circle?: boolean;
  count?: number;
  gap?: string | number;
  as?: keyof JSX.IntrinsicElements;
}

export function Skeleton({
  className,
  height = '1.25rem',
  width = '100%',
  rounded = 'md',
  circle = false,
  count = 1,
  gap = '0.5rem',
  as: Component = 'div',
  ...props
}: SkeletonProps) {
  const borderRadius = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  const skeletons = Array.from({ length: count }).map((_, i) => (
    <Component
      key={i}
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        circle ? 'rounded-full' : borderRadius,
        className
      )}
      style={{
        height,
        width: circle ? height : width,
        minWidth: circle ? height : width,
        ...(i > 0 && { marginTop: gap }),
      }}
      {...props}
    />
  ));

  return <>{skeletons}</>;
}

type SkeletonTextProps = Omit<SkeletonProps, 'height' | 'width'> & {
  lines?: number;
  lineHeight?: string | number;
  spacing?: string | number;
};

export function SkeletonText({
  lines = 3,
  lineHeight = '1rem',
  spacing = '0.5rem',
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div className="flex flex-col" style={{ gap: spacing }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            i === lines - 1 ? 'w-3/4' : 'w-full',
            className
          )}
          height={lineHeight}
          {...props}
        />
      ))}
    </div>
  );
}

// Example usage:
/*
// Single line
<Skeleton className="h-4 w-32" />

// Circle avatar
<Skeleton className="h-10 w-10" circle />

// Multiple lines of text
<SkeletonText lines={4} />

// Card skeleton
<div className="p-4 border rounded-lg">
  <Skeleton className="h-6 w-1/2 mb-4" />
  <SkeletonText lines={3} className="mb-4" />
  <div className="flex space-x-2">
    <Skeleton className="h-8 w-20" />
    <Skeleton className="h-8 w-20" />
  </div>
</div>
*/
