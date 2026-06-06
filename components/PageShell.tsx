import type { ReactNode } from 'react';

type PageShellProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: '4xl' | '6xl' | '7xl';
};

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

const maxWidthClasses = {
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export function PageShell({ children, className = '', maxWidth = '6xl' }: PageShellProps) {
  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, eyebrow, icon, actions }: PageHeaderProps) {
  return (
    <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 sm:flex">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase text-slate-500">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function PagePanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </section>
  );
}
