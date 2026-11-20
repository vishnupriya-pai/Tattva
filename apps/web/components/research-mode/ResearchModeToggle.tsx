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
      className="flex items-center gap-2.5 rounded-[10px] border border-line-strong px-2.5 py-1.5 transition-colors cursor-pointer"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? 'bg-gold' : 'bg-surface-3'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-fg shadow transition-transform ${
            enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs font-medium text-fg">Research mode</span>
        <span className={`text-xs font-mono ${enabled ? 'text-gold' : 'text-fg-muted'}`}>
          3× stamina
        </span>
      </span>
    </button>
  );
}
