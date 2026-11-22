import type { LearningSource } from '../../lib/workspace-types';
import { Panel } from '../shared/Panel';
import { Badge } from '../shared/Badge';
import { SourceMetadata } from './SourceMetadata';

export function SourceViewer({ source, body }: { source: LearningSource; body: string }) {
  return (
    <Panel title="Source material" className="h-full lg:border-r lg:border-line">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="shrink-0 space-y-3 border-b border-line px-6 py-5">
          <div className="flex items-center gap-2">
            <Badge tone="accent">{source.sourceType}</Badge>
            <span className="font-mono text-xs text-fg-muted ">Verified Curated Ingestion</span>
          </div>
          <h1 className="text-xl font-semibold leading-snug text-fg font-display">{source.title}</h1>
          <p className="text-sm leading-relaxed text-fg/60 font-sans">{source.description}</p>
          <SourceMetadata source={source} />
        </div>

        <article className="flex-1 whitespace-pre-line px-6 py-6 text-[15px] leading-7 text-fg/80 font-sans">
          {body}
        </article>
      </div>
    </Panel>
  );
}
