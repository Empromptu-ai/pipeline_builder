import { memo, type ReactNode } from 'react';
import { classNames } from '~/utils/classNames';

type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface IconButtonProps {
  size?: IconSize;
  className?: string;
  disabledClassName?: string;
  title?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  children: ReactNode;
}

export const IconButton = memo(
  ({ size = 'xl', className, disabledClassName, disabled = false, title, onClick, children }: IconButtonProps) => {
    return (
      <button
        className={classNames(
          'flex items-center text-bolt-elements-item-contentDefault bg-transparent enabled:hover:text-bolt-elements-item-contentActive rounded-md p-1 enabled:hover:bg-bolt-elements-item-backgroundActive disabled:cursor-not-allowed',
          getIconSize(size),
          {
            [classNames('opacity-30', disabledClassName)]: disabled,
          },
          className,
        )}
        title={title}
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }

          onClick?.(event);
        }}
      >
        {children}
      </button>
    );
  },
);

function getIconSize(size: IconSize) {
  if (size === 'sm') {
    return 'text-sm';
  } else if (size === 'md') {
    return 'text-base';
  } else if (size === 'lg') {
    return 'text-lg';
  } else if (size === 'xl') {
    return 'text-xl';
  } else {
    return 'text-2xl';
  }
}
