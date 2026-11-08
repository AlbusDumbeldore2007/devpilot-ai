import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import { Spinner } from './Loader.jsx';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      icon={AlertTriangle}
      size="sm"
      closeOnOverlay={!loading}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={`btn btn--${tone}`} onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size={15} /> : null}
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  );
}
