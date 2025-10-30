import { ComponentProps } from 'react';
import { FileText, Search, AlertCircle, FolderX, Inbox, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

type IconType = 'file' | 'search' | 'error' | 'folder' | 'inbox' | 'add' | React.ComponentType<{ className?: string }>;

interface EmptyStateProps extends ComponentProps<'div'> {
  title: string;
  description?: string;
  icon?: IconType;
  action?: React.ReactNode;
  iconClassName?: string;
}
const defaultIcons = {
  file: FileText,
  search: Search,
  error: AlertCircle,
  folder: FolderX,
  inbox: Inbox,
  add: Plus,
};

export function EmptyState({
  title,
  description,
  icon: Icon = 'file',
  action,
  className,
  iconClassName,
  ...props
}: EmptyStateProps) {
  const IconComponent = typeof Icon === 'string' ? defaultIcons[Icon] : Icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        {IconComponent && (
          <IconComponent
            className={cn(
              'h-8 w-8 text-gray-400 dark:text-gray-500',
              iconClassName
            )}
            aria-hidden="true"
          />
        )}
      </div>
      <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Example usage:
/*
<EmptyState
  title="No projects found"
  description="Get started by creating a new project."
  icon="folder"
  action={
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      New Project
    </Button>
  }
/>
*/
