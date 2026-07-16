import { nanoid } from 'nanoid';
import type { AttachmentDef, AttachmentRef } from '../types';
import { formatBytes, formatDate } from '../lib/utils';

export function AttachmentBox({
  def,
  files,
  onChange,
  readOnly = false,
  required = false,
  uploadedBy = 'user',
}: {
  def: AttachmentDef;
  files: AttachmentRef[];
  onChange?: (files: AttachmentRef[]) => void;
  readOnly?: boolean;
  required?: boolean;
  uploadedBy?: string;
}) {
  function handleFiles(list: FileList | null) {
    if (!list || !onChange) return;
    const added: AttachmentRef[] = Array.from(list).map((f) => ({
      id: nanoid(),
      defId: def.id,
      filename: f.name,
      size: f.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    }));
    onChange([...files, ...added]);
  }

  function remove(id: string) {
    if (!onChange) return;
    onChange(files.filter((f) => f.id !== id));
  }

  const isRequired = required || def.required === true;

  return (
    <div className="border border-dashed border-neutral-200 rounded-md p-3 bg-neutral-25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-ink-950 flex items-center gap-1.5">
            {def.label}
            {isRequired && <span className="text-danger-500">*</span>}
          </div>
          <div className="text-[10.5px] text-neutral-500 mt-0.5">{files.length} file(s)</div>
        </div>
        {!readOnly && (
          <label className="btn-secondary text-[11.5px] py-1 px-2 cursor-pointer">
            Upload
            <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        )}
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between text-[11.5px] bg-white border border-neutral-100 rounded px-2 py-1.5">
              <div className="min-w-0 truncate">
                <span className="font-mono text-neutral-700 truncate">📎 {f.filename}</span>
                <span className="ml-2 text-neutral-400">{formatBytes(f.size)} · {formatDate(f.uploadedAt)}</span>
              </div>
              {!readOnly && (
                <button onClick={() => remove(f.id)} className="text-danger-500 hover:underline text-[11px]">Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
