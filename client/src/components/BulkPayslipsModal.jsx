import { Printer, X } from 'lucide-react';
import PayslipDocument from './PayslipDocument';

export default function BulkPayslipsModal({ entries, client, run, onClose }) {
  if (!entries || entries.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="payslip-modal-backdrop" onClick={onClose}>
      <div className="payslip-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Controls Bar (hidden during printing) */}
        <div className="payslip-modal-controls no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Bulk Payslips Bundle
            </span>
            <span className="badge badge-accent">
              {client?.name} · {entries.length} Employees
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} /> Print / Save All to PDF ({entries.length} Payslips)
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

        {/* Multi-page printable bundle */}
        <div className="payslip-printable-area bulk-payslips-container">
          {entries.map((entry, index) => (
            <div key={entry.id || index} className="bulk-payslip-page">
              <PayslipDocument entry={entry} client={client} run={run} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
