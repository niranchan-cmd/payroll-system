import { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import { Download, Upload, CheckCircle, XCircle, AlertCircle, ArrowRight, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Download Template', 'Upload & Validate', 'Review & Import'];

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              background: idx < current ? 'var(--success)' : idx === current ? 'var(--accent)' : 'var(--bg-elevated)',
              color: idx <= current ? '#fff' : 'var(--text-muted)',
              border: `2px solid ${idx < current ? 'var(--success)' : idx === current ? 'var(--accent)' : 'var(--border-subtle)'}`,
              transition: 'all 300ms',
            }}>
              {idx < current ? <CheckCircle size={15} /> : idx + 1}
            </div>
            <span style={{ fontSize: 12, fontWeight: idx === current ? 700 : 400, color: idx === current ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: idx < current ? 'var(--success)' : 'var(--border-subtle)', margin: '0 8px', marginBottom: 22, transition: 'background 300ms' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BulkImportPage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);

  // ── Step 1: Download template ────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/clients/${clientId}/employees/import/template`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `employee_import_template_${selectedClient?.name || 'client'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Template downloaded successfully!');
      setStep(1);
    } catch (err) {
      toast.error('Failed to download template. Check your connection.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Step 2: Validate file ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setValidation(null); setError(null); }
  };

  const handleValidate = async () => {
    if (!file) return;
    setError(null);
    setValidating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/clients/${clientId}/employees/import/validate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValidation(res.data.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // ── Step 3: Confirm import ───────────────────────────────────────────────
  const handleImport = async () => {
    if (!validation?.valid?.length) return;
    setImporting(true);
    try {
      const res = await api.post(`/clients/${clientId}/employees/import/confirm`, {
        rows: validation.valid,
      });
      const { imported } = res.data.data;
      toast.success(`Successfully imported ${imported} employee(s)!`);
      navigate(`/clients/${clientId}/employees`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
      setImporting(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setValidation(null); setError(null); }
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Bulk Import Employees</h1>
          <p className="page-subtitle">{selectedClient?.name} — Import multiple employees via Excel</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/clients/${clientId}/employees`)}>
          ← Back
        </button>
      </div>

      <StepIndicator current={step} />

      {/* Step 0 — Download Template */}
      {step === 0 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 48 }}>
          <div style={{ width: 72, height: 72, background: 'var(--accent-dim)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Download size={32} style={{ color: 'var(--accent-light)' }} />
          </div>
          <h2 style={{ marginBottom: 12 }}>Start with the Template</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.7 }}>
            Download the Excel template, fill in employee details, and upload it back.<br />
            The file includes an Instructions sheet to guide you.
          </p>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Required Columns</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Roll No', 'Name', 'Designation', 'Start Date', 'Annual CTC', 'Tax Regime'].map((c) => (
                <span key={c} className="badge badge-accent">{c}</span>
              ))}
              {['Department', 'Email'].map((c) => (
                <span key={c} className="badge badge-muted">{c} (optional)</span>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleDownloadTemplate} disabled={downloading}>
            {downloading ? (
              <><span className="spinner" style={{ width: 18, height: 18 }} /> Downloading Template...</>
            ) : (
              <><Download size={18} /> Download Template (.xlsx)</>
            )}
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => setStep(1)}>
            I already have the template → Skip to Upload
          </button>
        </div>
      )}

      {/* Step 1 — Upload & Validate */}
      {step === 1 && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Upload Excel File</div>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 40,
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                transition: 'all 200ms',
              }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
              <Upload size={32} style={{ color: file ? 'var(--accent-light)' : 'var(--text-muted)', marginBottom: 12 }} />
              {file ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-light)', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB — Click to change</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drag & drop your Excel file here</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse (.xlsx / .xls, max 5 MB)</div>
                </>
              )}
            </div>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><AlertCircle size={15} /> {error}</div>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleValidate} disabled={!file || validating}>
              {validating ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Validating...</> : <><ArrowRight size={15} /> Validate File</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Review & Import */}
      {step === 2 && validation && (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Total Rows</div>
              <div className="stat-value" style={{ fontSize: 28 }}>{validation.total}</div>
            </div>
            <div className="stat-card" style={{ borderColor: validation.valid_count > 0 ? 'var(--success)' : undefined }}>
              <div className="stat-label">Valid</div>
              <div className="stat-value" style={{ fontSize: 28, color: 'var(--success)' }}>{validation.valid_count}</div>
            </div>
            <div className="stat-card" style={{ borderColor: validation.error_count > 0 ? 'var(--danger)' : undefined }}>
              <div className="stat-label">Errors</div>
              <div className="stat-value" style={{ fontSize: 28, color: validation.error_count > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{validation.error_count}</div>
            </div>
          </div>

          {/* Error rows */}
          {validation.errors?.length > 0 && (
            <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)' }}>
              <div className="card-header">
                <div className="card-title" style={{ color: 'var(--danger)' }}><XCircle size={16} style={{ display: 'inline', marginRight: 6 }} />Rows with Errors</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fix these in your Excel and re-upload</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--danger-dim)' }}>
                      {['Row', 'Roll No', 'Name', 'Error(s)'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validation.errors.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>#{e.rowNum}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.rollNo || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{e.name || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {e.errors.map((err, j) => (
                            <div key={j} style={{ color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <XCircle size={10} /> {err}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid rows preview */}
          {validation.valid?.length > 0 && (
            <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(34,197,94,0.3)' }}>
              <div className="card-header">
                <div className="card-title" style={{ color: 'var(--success)' }}><CheckCircle size={16} style={{ display: 'inline', marginRight: 6 }} />Ready to Import ({validation.valid_count} employees)</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--success-dim)' }}>
                      {['Roll No', 'Name', 'Designation', 'Dept', 'Start Date', 'Annual CTC', 'Tax'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)', borderBottom: '1px solid rgba(34,197,94,0.2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validation.valid.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.rollNo}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{row.designation}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{row.department || '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.startDate}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{Number(row.annualCTC).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${row.taxRegime === 'NEW' ? 'badge-accent' : 'badge-muted'}`}>{row.taxRegime}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!validation.can_import && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }}>
              <AlertCircle size={15} />
              {validation.valid_count === 0
                ? 'No valid rows to import. Please fix all errors and re-upload.'
                : 'There are errors in some rows. You can still import the valid rows.'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setStep(1); setValidation(null); }}>
              ← Re-upload
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleImport}
              disabled={importing || validation.valid_count === 0}
            >
              {importing
                ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Importing...</>
                : <><Users size={16} /> Import {validation.valid_count} Employee{validation.valid_count !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
