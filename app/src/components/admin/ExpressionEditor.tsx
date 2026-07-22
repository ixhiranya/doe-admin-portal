// src/components/admin/ExpressionEditor.tsx
// A lightweight, VS Code-flavoured text editor for typing formula
// expressions by hand. Typing '$' suggests entities (self entity pinned to
// the top); a '.' after each completed segment walks you one level deeper
// through the reference path:
//
//   $ENTITY . PRODUCT . TEMPLATE . FIELD
//
// e.g. $ADNOC . diesel . TMP-001 . imports
//
// Operators (+, -, AND, etc.) are typed by hand — there's no button row —
// validateExpressionString() in lib/formula.ts checks placement.
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  entityByCode, productsForEntity, templatesFor, templateById,
  type Entity,
} from '../../data/formulaEntities';

type SuggestKind = 'entity' | 'product' | 'template' | 'field';

interface SuggestState {
  kind: SuggestKind;
  query: string;
  triggerAt: number;   // index in the text where the replacement region starts
  top: number;
  left: number;
  path: string[];      // completed segments before the current word, e.g. ['ADNOC','diesel']
}

interface Option { code: string; label: string; badge?: string }

interface Props {
  value: string;
  onChange: (v: string) => void;
  entities: Entity[];
  selfEntityId?: string;
  placeholder?: string;
}

const KIND_ORDER: SuggestKind[] = ['entity', 'product', 'template', 'field'];
const KIND_TITLE: Record<SuggestKind, string> = { entity: 'Entities', product: 'Products', template: 'Templates', field: 'Fields' };

export function ExpressionEditor({ value, onChange, entities, selfEntityId, placeholder }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [suggest, setSuggest] = useState<SuggestState | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const orderedEntities = useMemo(() => {
    if (!selfEntityId) return entities;
    const self = entities.find((e) => e.id === selfEntityId);
    const rest = entities.filter((e) => e.id !== selfEntityId);
    return self ? [self, ...rest] : entities;
  }, [entities, selfEntityId]);

  // Resolve the current dropdown's option list from suggest.kind + suggest.path.
  const options = useMemo<Option[]>(() => {
    if (!suggest) return [];
    const q = suggest.query.toLowerCase();

    if (suggest.kind === 'entity') {
      return orderedEntities
        .filter((e) => e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
        .map((e) => ({ code: e.code, label: e.name, badge: e.id === selfEntityId ? 'Self' : undefined }));
    }

    const entity = entityByCode(suggest.path[0] ?? '');
    if (!entity) return [];

    if (suggest.kind === 'product') {
      return productsForEntity(entity.id)
        .filter((p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
        .map((p) => ({ code: p.id, label: p.name }));
    }

    if (suggest.kind === 'template') {
      const productId = suggest.path[1] ?? '';
      return templatesFor(entity.id, productId)
        .filter((t) => t.id.toLowerCase().includes(q))
        .map((t) => ({ code: t.id, label: t.name }));
    }

    // field
    const template = templateById(suggest.path[2] ?? '');
    return (template?.fields ?? [])
      .filter((f) => f.id.toLowerCase().includes(q) || f.label.toLowerCase().includes(q))
      .map((f) => ({ code: f.id, label: f.label }));
  }, [suggest, orderedEntities, selfEntityId]);

  useEffect(() => { setActiveIdx(0); }, [suggest?.kind, suggest?.query, suggest?.triggerAt]);

  // ---- caret-position mirror (so the dropdown appears right under the cursor) ----
  function measureCaret(pos: number) {
    const ta = taRef.current, mirror = mirrorRef.current, wrap = wrapRef.current;
    if (!ta || !mirror || !wrap) return { top: 0, left: 0 };
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    mirror.innerHTML = `${esc(value.slice(0, pos))}<span data-caret></span>${esc(value.slice(pos) || ' ')}`;
    const marker = mirror.querySelector('[data-caret]') as HTMLElement | null;
    if (!marker) return { top: 0, left: 0 };
    return {
      top: marker.offsetTop - ta.scrollTop + 20,
      left: Math.min(marker.offsetLeft - ta.scrollLeft, wrap.clientWidth - 260),
    };
  }

  // ---- figure out whether the caret sits right after '$' or after a '.' that
  // completes a segment of an in-progress $a.b.c reference ----
  function analyze(text: string, caret: number) {
    const before = text.slice(0, caret);
    const wordMatch = /[A-Za-z0-9_-]*$/.exec(before);
    const word = wordMatch ? wordMatch[0] : '';
    const wordStart = caret - word.length;
    const charBeforeWord = text[wordStart - 1];

    if (charBeforeWord === '$') {
      const { top, left } = measureCaret(caret);
      // Replacement region includes the '$' itself — we rebuild "$code." from scratch.
      setSuggest({ kind: 'entity', query: word, triggerAt: wordStart - 1, top, left, path: [] });
      return;
    }

    if (charBeforeWord === '.') {
      const m = /\$([A-Za-z0-9_]+(?:\.[A-Za-z0-9_-]+)*)\.$/.exec(before.slice(0, wordStart));
      if (m) {
        const path = m[1].split('.');
        const depth = path.length; // 1 segment done -> suggest 'product', etc.
        if (depth <= 3) {
          const { top, left } = measureCaret(caret);
          // Replacement region starts right AFTER the '.', which must stay put.
          setSuggest({ kind: KIND_ORDER[depth], query: word, triggerAt: wordStart, top, left, path });
          return;
        }
      }
    }

    setSuggest(null);
  }

  function handleChangeText(next: string, caret: number) {
    onChange(next);
    requestAnimationFrame(() => analyze(next, caret));
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    handleChangeText(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function reposition() {
    const ta = taRef.current;
    if (!ta) return;
    analyze(ta.value, ta.selectionStart ?? 0);
  }

  // Applies the chosen option for whichever segment is currently being
  // suggested. Entity/product/template chain straight into the next
  // suggestion; field is the last segment and closes the dropdown.
  function applyOption(opt: Option) {
    const ta = taRef.current;
    if (!ta || !suggest) return;
    const caret = ta.selectionStart ?? value.length;
    const isField = suggest.kind === 'field';
    const insert = suggest.kind === 'entity' ? `$${opt.code}.` : `${opt.code}${isField ? ' ' : '.'}`;
    const next = value.slice(0, suggest.triggerAt) + insert + value.slice(caret);
    const newCaret = suggest.triggerAt + insert.length;
    onChange(next);
    if (isField) {
      setSuggest(null);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(newCaret, newCaret); });
    } else {
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(newCaret, newCaret); analyze(next, newCaret); });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggest && options.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % options.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + options.length) % options.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyOption(options[activeIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSuggest(null); return; }
    }
  }

  const font = 'font-mono text-[13px] leading-[20px]';

  return (
    <div>
      <div ref={wrapRef} className="relative">
        {/* Mirror div: invisible clone used only to measure caret pixel position */}
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn('absolute inset-0 whitespace-pre-wrap break-words invisible px-3 py-2.5 pointer-events-none', font)}
        />
        <textarea
          ref={taRef}
          value={value}
          onChange={onInput}
          onKeyDown={onKeyDown}
          onKeyUp={reposition}
          onClick={reposition}
          onBlur={() => setTimeout(() => setSuggest(null), 120)}
          rows={5}
          spellCheck={false}
          placeholder={placeholder ?? "Type '$' for entities, then '.' to drill into product → template → field…"}
          className={cn(
            'relative w-full px-3 py-2.5 border border-neutral-300 rounded-md bg-white resize-y',
            'focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange',
            font,
          )}
        />

        {suggest && options.length > 0 && (
          <div
            className="absolute z-20 w-[280px] max-h-[220px] overflow-y-auto bg-white border border-neutral-200 rounded-md shadow-lg py-1"
            style={{ top: suggest.top, left: Math.max(0, suggest.left) }}
          >
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400 border-b border-neutral-100 mb-1">
              {KIND_TITLE[suggest.kind]}
            </div>
            {options.map((opt, i) => (
              <button
                key={opt.code}
                onMouseDown={(ev) => { ev.preventDefault(); applyOption(opt); }}
                className={cn('w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px]', i === activeIdx ? 'bg-orange-50' : 'hover:bg-neutral-50')}
              >
                <span>
                  <span className={cn('font-mono font-semibold', suggest.kind === 'entity' ? 'text-action-orange' : 'text-sky-700')}>
                    {suggest.kind === 'entity' ? `$${opt.code}` : opt.code}
                  </span>
                  <span className="text-neutral-500 ml-1.5">{opt.label}</span>
                </span>
                {opt.badge && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wide text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded shrink-0">{opt.badge}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
