import { Fragment } from 'react';
import { parseInline, parseRichText, type Inline } from '../../lib/rich-text';

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((token, i) =>
        token.kind === 'bold' ? (
          <strong key={i} className="font-semibold text-fg">
            {token.value}
          </strong>
        ) : token.kind === 'italic' ? (
          <em key={i}>{token.value}</em>
        ) : token.kind === 'code' ? (
          <code key={i} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em] text-fg">
            {token.value}
          </code>
        ) : (
          <Fragment key={i}>{token.value}</Fragment>
        ),
      )}
    </>
  );
}

export function RichText({ text, inline = false, className = '' }: { text: string; inline?: boolean; className?: string }) {
  if (inline) {
    return (
      <span className={className}>
        <Inlines inlines={parseInline(text.replace(/\s+/g, ' ').trim())} />
      </span>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {parseRichText(text).map((block, i) => {
        if (block.kind === 'p') {
          return (
            <p key={i}>
              <Inlines inlines={block.inlines} />
            </p>
          );
        }
        const ListTag = block.kind === 'ul' ? 'ul' : 'ol';
        return (
          <ListTag key={i} className={`space-y-1.5 pl-5 ${block.kind === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-fg-muted`}>
            {block.items.map((item, j) => (
              <li key={j} className="pl-1">
                <Inlines inlines={item} />
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
