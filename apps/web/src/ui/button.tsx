import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
const styles = cva('rounded-lg bg-lime-300 px-4 py-2 font-semibold text-slate-950 hover:bg-lime-200 disabled:opacity-50');
export function Button({ asChild = false, className, ...props }: ComponentProps<'button'> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return <Component className={twMerge(clsx(styles(), className))} {...props} />;
}
