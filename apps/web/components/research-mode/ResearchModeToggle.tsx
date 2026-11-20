export function ResearchModeToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2.5 rounded-sm border border-line-strong px-2.5 py-1.5 transition-colors hover:border-line-strong"
    >
      <span
        className={`text-xs font-medium ${enabled ? 'text-gold' : 'text-fg/50'}`}
      >
        Research mode
      </span>
      <span
        className={[
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
          enabled ? 'border-gold/50 bg-gold/20' : 'border-line-strong bg-surface-2/10',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-3.5 w-3.5 transform rounded-full bg-surface-2 shadow transition-transform',
            enabled ? 'translate-x-[18px]' : 'translate-x-[3px]',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
