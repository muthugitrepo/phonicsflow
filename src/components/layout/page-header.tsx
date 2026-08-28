import * as React from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {/*
          `key` restarts the entrance animation when the title changes without a
          remount — otherwise navigating between two pages that both render a
          PageHeader would show a static heading.
        */}
        <h1 key={title} className="page-title text-lg font-semibold sm:text-xl">
          {title}
        </h1>
        <span
          key={`${title}-rule`}
          aria-hidden
          className="page-title-rule mt-1.5 block h-0.5 w-10 rounded-full bg-brand"
        />
        {description ? (
          <p key={`${title}-sub`} className="page-title-sub mt-1.5 text-sm text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
