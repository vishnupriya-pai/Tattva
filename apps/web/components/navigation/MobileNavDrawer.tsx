'use client';

import { useEffect, useRef } from 'react';
import { Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { NAV_ITEMS, type TopNavView } from './navItems';

export const MOBILE_NAV_DRAWER_ID = 'mobile-nav-drawer';

export function MobileNavDrawer({
  open,
  onClose,
  activeView,
  onSelectView,
  inquiryCount,
  theme,
  onToggleTheme,
  onSaveProgress,
}: {
  open: boolean;
  onClose: () => void;
  activeView: TopNavView;
  onSelectView: (view: TopNavView) => void;
  inquiryCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSaveProgress?: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, [href]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const desktop = window.matchMedia('(min-width: 1024px)');
    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (e.matches) onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onBreakpoint);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpoint);
    };
  }, [open, onClose]);

  const rowClass =
    'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition cursor-pointer motion-reduce:transition-none';

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-bg/70 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        id={MOBILE_NAV_DRAWER_ID}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface-1 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="text-lg font-semibold font-display tracking-[0.12em] uppercase text-fg">Tattva</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
          {NAV_ITEMS.map(({ view, label, Icon }) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelectView(view)}
                className={`${rowClass} relative ${
                  active
                    ? 'bg-surface-2 font-semibold text-fg before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-gold'
                    : 'text-fg-body hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-fg' : 'text-fg-muted'}`} />
                <span className="flex-1 text-left">{label}</span>
                {view === 'workspace' && inquiryCount > 0 && (
                  <span className="rounded-full border border-line-strong bg-surface-3 px-2 font-mono text-xs text-fg-muted">
                    {inquiryCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-line p-3">
          {onSaveProgress && (
            <button type="button" onClick={onSaveProgress} className={`${rowClass} font-semibold text-fg hover:bg-surface-2`}>
              <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
              <span>Save your progress</span>
            </button>
          )}
          <button type="button" onClick={onToggleTheme} className={`${rowClass} text-fg-body hover:bg-surface-2 hover:text-fg`}>
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0 text-fg-muted" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-fg-muted" />
            )}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
