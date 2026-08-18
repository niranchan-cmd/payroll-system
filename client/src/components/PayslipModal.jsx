import { Printer, X, Download } from 'lucide-react';
import PayslipDocument from './PayslipDocument';

export default function PayslipModal({ entry, client, run, onClose }) {
  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="payslip-modal-backdrop" onClick={onClose}>
      <div className="payslip-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Controls Bar (hidden during printing) */}
        <div className="payslip-modal-controls no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Employee Payslip Preview
            </span>
            <span className="badge badge-accent">
              {entry.employee?.name} ({entry.employee?.roll_no})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} /> Print / Save as PDF
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* The Payslip Document */}
        <div className="payslip-printable-area">
          <PayslipDocument entry={entry} client={client} run={run} />
        </div>
      </div>
    </div>
  );
}
