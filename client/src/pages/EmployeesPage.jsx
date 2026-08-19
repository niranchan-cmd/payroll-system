import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, Users, ChevronRight, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import EditEmployeeModal from '../components/EditEmployeeModal';

function fmtCTC(ctc) {
  return '₹' + Number(ctc).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function EmployeesPage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [editingEmp, setEditingEmp] = useState(null);

  const fetchEmployees = useCallback(() => {
    Promise.all([
      api.get(`/clients/${clientId}/employees`),
      api.get(`/clients/${clientId}/readiness`),
    ])
      .then(([eR, rR]) => {
        setEmployees(eR.data.data || []);
        setReadiness(rR.data.data);
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function handleDelete(e, emp) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete employee "${emp.name}" (${emp.roll_no})?`)) return;

    try {
      await api.delete(`/employees/${emp.id}`);
      toast.success(`Employee "${emp.name}" deleted.`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete employee.');
    }
  }

  function handleEditClick(e, emp) {
    e.stopPropagation();
    setEditingEmp(emp);
  }

  const filtered = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.roll_no?.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const isReady = readiness?.is_ready;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} employee{employees.length !== 1 ? 's' : ''} in this client</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/clients/${clientId}/employees/new`)}
          disabled={!isReady}
          data-tooltip={!isReady ? 'Complete client setup first' : undefined}
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {!isReady && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <span>⚠</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Client setup incomplete</div>
            <div style={{ fontSize: 12.5 }}>
              Missing: {readiness?.missing?.join(', ')}. Complete client setup to add employees.
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div className="search-wrap" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, roll no, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={28} /></div>
            <div className="empty-title">{search ? 'No matches found' : 'No employees yet'}</div>
            <div className="empty-desc">
              {search ? 'Try a different search term.' : 'Add your first employee to get started.'}
            </div>
            {!search && isReady && (
              <button className="btn btn-primary" onClick={() => navigate(`/clients/${clientId}/employees/new`)}>
                <Plus size={16} /> Add Employee
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Roll No</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Start Date</th>
                  <th>Annual CTC</th>
                  <th>Tax Regime</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const currentSalary = emp.salary_histories?.[0];
                  return (
                    <tr
                      key={emp.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, background: 'var(--bg-elevated)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: 'var(--text-secondary)',
                            fontSize: 13, fontWeight: 700, flexShrink: 0
                          }}>
                            {emp.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{emp.name}</div>
                            {emp.email && <div className="td-muted">{emp.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 12.5, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>{emp.roll_no}</code></td>
                      <td className="td-muted">{emp.designation}</td>
                      <td className="td-muted">{emp.department || '—'}</td>
                      <td className="td-muted">
                        {new Date(emp.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {currentSalary ? fmtCTC(currentSalary.annual_ctc) : '—'}
                      </td>
                      <td>
                        <span className={`tag ${emp.tax_regime === 'OLD' ? 'tag-old' : 'tag-new'}`}>
                          {emp.tax_regime}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 12 }}
                            onClick={(e) => handleEditClick(e, emp)}
                            title="Edit Employee Details"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-danger"
                            style={{ padding: '3px 6px' }}
                            onClick={(e) => handleDelete(e, emp)}
                            title="Delete Employee"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      {editingEmp && (
        <EditEmployeeModal
          employee={editingEmp}
          isOpen={Boolean(editingEmp)}
          onClose={() => setEditingEmp(null)}
          onUpdated={() => fetchEmployees()}
        />
      )}
    </div>
  );
}
