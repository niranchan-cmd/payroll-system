import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, GitBranch, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
  ACTIVE: <span className="badge badge-success">Active</span>,
  UPCOMING: <span className="badge badge-info">Upcoming</span>,
  EXPIRED: <span className="badge badge-muted">Expired</span>,
};

export default function CTCStructurePage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get(`/clients/${clientId}/structures`)
      .then((r) => {
        const data = r.data.data || [];
        setStructures(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => toast.error('Failed to load structures'))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">CTC Structure</h1>
          <p className="page-subtitle">Salary component templates for this client</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/clients/${clientId}/structure/new`)}>
          <Plus size={16} /> New Version
        </button>
      </div>

      {structures.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><GitBranch size={28} /></div>
            <div className="empty-title">No CTC Structure yet</div>
            <div className="empty-desc">
              Create a structure to define how employee salaries are broken into components.
            </div>
            <button className="btn btn-primary" onClick={() => navigate(`/clients/${clientId}/structure/new`)}>
              <Plus size={16} /> Create First Version
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Version List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {structures.map((s) => (
              <div
                key={s.id}
                className={`version-card ${selected?.id === s.id ? 'active-version' : ''}`}
                onClick={() => setSelected(s)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-heading)' }}>
                    {s.version_name}
                  </span>
                  {STATUS_BADGE[s.status]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Calendar size={12} />
                  <span>From {fmtDate(s.effective_from)}</span>
                </div>
                {s.effective_to && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    To {fmtDate(s.effective_to)}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
                  Rounding: {s.rounding_rule?.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && <StructureDetail structure={selected} />}
        </div>
      )}
    </div>
  );
}

function StructureDetail({ structure }) {
  const included = structure.components?.filter((c) => c.ctc_inclusion === 'INCLUDED') || [];
  const addedOnTop = structure.components?.filter((c) => c.ctc_inclusion === 'ADDED_ON_TOP') || [];

  function describeComp(c) {
    if (c.calc_type === 'REMAINDER') return 'Remainder of CTC';
    if (c.calc_type === 'PERCENT_OF_CTC') return `${c.value}% of Annual CTC`;
    if (c.calc_type === 'PERCENT_OF_BASIC') return `${c.value}% of Monthly Basic`;
    if (c.calc_type === 'PERCENT_OF_GROSS') return `${c.value}% of Gross Salary`;
    if (c.calc_type === 'FIXED') return `₹${Number(c.value).toLocaleString('en-IN')} fixed`;
    return c.calc_type;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{structure.version_name} — Component Details</div>
          <div className="card-subtitle">
            Effective {new Date(structure.effective_from).toLocaleDateString('en-IN')}
            {structure.effective_to && ` to ${new Date(structure.effective_to).toLocaleDateString('en-IN')}`}
          </div>
        </div>
        {STATUS_BADGE[structure.status]}
      </div>

      {included.length > 0 && (
        <>
          <div className="section-label">Included in CTC</div>
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Component</th>
                  <th>Calculation</th>
                  <th>Taxable</th>
                </tr>
              </thead>
              <tbody>
                {included.map((c, i) => (
                  <tr key={c.id}>
                    <td className="td-muted">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="td-muted">{describeComp(c)}</td>
                    <td>
                      {c.is_taxable
                        ? <span className="badge badge-warning">Taxable</span>
                        : <span className="badge badge-muted">Exempt</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {addedOnTop.length > 0 && (
        <>
          <div className="section-label">Added on Top of CTC</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Component</th>
                  <th>Calculation</th>
                  <th>Taxable</th>
                </tr>
              </thead>
              <tbody>
                {addedOnTop.map((c, i) => (
                  <tr key={c.id}>
                    <td className="td-muted">{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{c.name}</td>
                    <td className="td-muted">{describeComp(c)}</td>
                    <td>
                      {c.is_taxable
                        ? <span className="badge badge-warning">Taxable</span>
                        : <span className="badge badge-muted">Exempt</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="card-section">
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>Rounding:</strong> {structure.rounding_rule?.replace('_', ' ')}</span>
          <span><strong style={{ color: 'var(--text-primary)' }}>Remainder to:</strong> {structure.remainder_comp}</span>
        </div>
      </div>
    </div>
  );
}
