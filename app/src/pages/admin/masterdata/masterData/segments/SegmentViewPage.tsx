import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function SegmentViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { segments, deleteSegment } = useMasterData();
  const segment = segments.find((s) => s.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!segment) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Segment not found</div>
        <button onClick={() => navigate('/admin/master-data/segments')} className="btn-secondary text-[12.5px] mt-4">Back to Segments</button>
      </div>
    );
  }

  function handleDelete() {
    const res = deleteSegment(segment!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/segments');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Segments', to: '/admin/master-data/segments' }, { label: segment.name }]} tag="Table 7 · SEGMENT" />}
      badge="SG" badgeBg="#DC2626"
      title={segment.name}
      subtitle={`Code: ${segment.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/segments/${segment.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{segment.code}</span></ViewField>
      <ViewField label="Name">{segment.name}</ViewField>
      <ViewField label="Segment Group"><span className="chip-sm bg-lavender text-neutral-700">{segment.segmentGroup}</span></ViewField>
      <ViewField label="Status">
        <span className={`chip-sm ${segment.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{segment.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(segment.updatedAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${segment.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{segment.name}</strong> from the Segments registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
