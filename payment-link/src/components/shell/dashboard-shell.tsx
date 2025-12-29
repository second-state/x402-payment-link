import { ReactNode } from "react";

import { DashboardHeader } from "@/components/shell/dashboard-header";

type Props = {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function DashboardShell({ title, description, actions, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DashboardHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {(title || description) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              {title && <h1 className="text-3xl font-bold">{title}</h1>}
              {description && <p className="text-slate-600">{description}</p>}
            </div>
            {actions}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
