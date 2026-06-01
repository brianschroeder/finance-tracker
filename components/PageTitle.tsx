interface PageTitleProps {
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export default function PageTitle({ title, description, actionButton }: PageTitleProps) {
  return (
    <div className="mb-8 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-950 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">{description}</p>
          )}
        </div>
        {actionButton && (
          <div className="mt-4 sm:mt-0">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
} 