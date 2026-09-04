import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import {
  Play, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Info, Lock,
  UserX, UserCheck, CheckSquare, Square, Upload, Download, FileSpreadsheet, RefreshCw, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

/**
 * Calculates prorated figures & Overtime for a single entry based on current daysWorked and otHours.
 */
function calculateProratedEntry(baseEntry, customDays, customOtHours, clientConfig) {
  const totalDays = Number(baseEntry.total_days || 30);
  const daysWorked = customDays !== undefined ? Number(customDays) : Number(baseEntry.days_worked || totalDays);
  const factor = totalDays > 0 ? Math.max(0, Math.min(daysWorked, totalDays)) / totalDays : 1;
  const isProrated = daysWorked < totalDays;

  // Prorate salary components
  const proratedComps = (baseEntry.components || [])
    .filter((c) => !c.name.toLowerCase().includes('overtime') && !c.name.toLowerCase().includes('ot'))
    .map((c) => ({
      ...c,
      prorated: isProrated ? Math.round(c.monthly * factor) : c.monthly,
    }));

  // Overtime (OT) Calculation (₹60 per OT hour for Intravision)
  const isIntravision = clientConfig?.name?.toLowerCase().includes('intravision');
  const otHours = (customOtHours !== undefined && customOtHours !== null && customOtHours !== '')
    ? Math.max(0, Number(customOtHours))
    : Number(baseEntry.ot_hours || 0);
  const otRate = 60; // ₹60/hour for Intravision
  const otAmount = (isIntravision || otHours > 0) ? Math.round(otHours * otRate) : 0;

  if (otAmount > 0) {
    proratedComps.push({
      name: `Overtime (${otHours} hrs @ ₹${otRate}/hr)`,
      monthly: 0,
      prorated: otAmount,
      is_taxable: true,
      ot_hours: otHours,
      ot_rate: otRate,
    });
  }

  const grossSalary = proratedComps.reduce((sum, c) => sum + Number(c.prorated), 0);
  const basicComp = proratedComps.find((c) => c.name.toLowerCase().includes('basic'));
  const basicSalary = basicComp ? basicComp.prorated : Math.round((grossSalary - otAmount) * 0.4);

  // PF & ESI
  const pfBasis = clientConfig?.pf_on_actual ? basicSalary : Math.min(basicSalary, 15000);
  const employeePf = Math.round(pfBasis * 0.12);
  const employeeEsi = (clientConfig?.esi_auto_apply && grossSalary <= 21000)
    ? Math.round(grossSalary * 0.0075)
    : 0;

  const totalDeductions = employeePf + employeeEsi;
  const netPay = Math.max(grossSalary - totalDeductions, 0);

  return {
    ...baseEntry,
    days_worked: daysWorked,
    is_prorated: isProrated,
    ot_hours: otHours,
    ot_amount: otAmount,
    gross_salary: grossSalary,
    basic_salary: basicSalary,
    employee_pf: employeePf,
    employee_esi: employeeEsi,
    total_deductions: totalDeductions,
    net_pay: netPay,
    components: proratedComps,
  };
}

function EmployeeRow({
  entry,
  isExcluded,
  onToggle,
  daysWorked,
  onDaysChange,
  otHours,
  onOtChange,
  clientConfig,
  isIntravision,
}) {
  const [expanded, setExpanded] = useState(false);

  // Live recalculate with custom days worked & OT hours
  const liveEntry = useMemo(() => {
    return calculateProratedEntry(entry, daysWorked, otHours, clientConfig);
  }, [entry, daysWorked, otHours, clientConfig]);

  const lopDays = Math.max(0, Number(entry.total_days || 30) - Number(liveEntry.days_worked || 0));

  return (
    <>
      <tr
        style={{
          cursor: 'pointer',
          transition: 'background 150ms',
          opacity: isExcluded ? 0.55 : 1,
          background: isExcluded ? 'rgba(0,0,0,0.03)' : expanded ? 'var(--accent-dim)' : '',
        }}
        onClick={() => setExpanded((p) => !p)}
        onMouseEnter={(e) => { if (!expanded && !isExcluded) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { if (!expanded && !isExcluded) e.currentTarget.style.background = ''; }}
      >
        {/* Checkbox */}
        <td style={{ padding: '12px 14px', width: 40 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!isExcluded}
            onChange={() => onToggle(entry.employee_id)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            title={isExcluded ? 'Click to Include in this month payroll' : 'Click to Skip / Exclude from this month payroll'}
          />
        </td>

        {/* Employee Info */}
        <td style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, textDecoration: isExcluded ? 'line-through' : 'none' }}>
              {entry.name}
            </span>
            {isExcluded && (
              <span className="badge badge-warning" style={{ fontSize: 10, padding: '1px 6px' }}>
                <UserX size={10} /> Skipped
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {entry.roll_no} · {entry.designation}
          </div>
        </td>

        {/* Paid / Worked Days (Editable Input) */}
        <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                min="0"
                max={entry.total_days || 31}
                step="0.5"
                disabled={isExcluded}
                value={daysWorked !== undefined ? daysWorked : entry.days_worked}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Math.max(0, Math.min(Number(entry.total_days || 31), Number(e.target.value)));
                  onDaysChange(entry.employee_id, val);
                }}
                className="form-input"
                style={{
                  width: 65,
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  borderColor: lopDays > 0 ? 'var(--warning)' : 'var(--border-subtle)',
                  background: isExcluded ? 'var(--bg-surface)' : lopDays > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card)',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                / {entry.total_days}
              </span>
            </div>
            {lopDays > 0 && !isExcluded && (
              <span style={{ fontSize: 10.5, color: 'var(--warning)', fontWeight: 600 }}>
                {lopDays} LOP {lopDays === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        </td>

        {/* Overtime (OT Hours) — Specific to Intravision */}
        {isIntravision && (
          <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  disabled={isExcluded}
                  value={otHours !== undefined ? otHours : (entry.ot_hours || 0)}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    onOtChange(entry.employee_id, val);
                  }}
                  className="form-input"
                  style={{
                    width: 65,
                    padding: '4px 6px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    borderColor: liveEntry.ot_hours > 0 ? 'var(--accent)' : 'var(--border-subtle)',
                    background: isExcluded ? 'var(--bg-surface)' : liveEntry.ot_hours > 0 ? 'rgba(79, 110, 247, 0.08)' : 'var(--bg-card)',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>hrs</span>
              </div>
              {liveEntry.ot_hours > 0 && !isExcluded && (
                <span style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 700 }}>
                  +₹{fmt(liveEntry.ot_amount)} (@ ₹60/hr)
                </span>
              )}
            </div>
          </td>
        )}

        {/* Gross */}
        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(liveEntry.gross_salary)}
        </td>

        {/* PF */}
        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(liveEntry.employee_pf)}
        </td>

        {/* ESI */}
        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(liveEntry.employee_esi)}
        </td>

        {/* Net Take-Home */}
        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5, color: isExcluded ? 'var(--text-muted)' : 'var(--success)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(liveEntry.net_pay)}
        </td>

        {/* Skip Toggle */}
        <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`btn btn-sm ${isExcluded ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '3px 8px' }}
            onClick={() => onToggle(entry.employee_id)}
          >
            {isExcluded ? <><UserCheck size={11} /> Include</> : <><UserX size={11} /> Skip</>}
          </button>
        </td>

        <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>

      {/* Expanded Breakdown */}
      {expanded && (
        <tr style={{ background: 'rgba(79, 110, 247, 0.05)' }}>
          <td colSpan={isIntravision ? 10 : 9} style={{ padding: '0 16px 16px 44px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Earnings Breakdown ({liveEntry.days_worked}/{liveEntry.total_days} Days) {liveEntry.ot_hours > 0 ? `+ ${liveEntry.ot_hours} hrs OT` : ''}
                </div>
                {liveEntry.components?.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: c.name.includes('Overtime') ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: c.name.includes('Overtime') ? 600 : 400 }}>
                      {c.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c.name.includes('Overtime') ? 'var(--accent)' : 'inherit' }}>
                      ₹{fmt(c.prorated ?? c.monthly)}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Deductions & Take-Home
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee PF</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontWeight: 600 }}>- ₹{fmt(liveEntry.employee_pf)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee ESI</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontWeight: 600 }}>- ₹{fmt(liveEntry.employee_esi)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderTop: '1.5px solid var(--border-subtle)', marginTop: 4, fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-primary)' }}>Net Take-Home Pay</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>₹{fmt(liveEntry.net_pay)}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RunPayrollPage() {
  const { id: clientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const fileInputRef = useRef(null);

  const isIntravision = Boolean(
    selectedClient?.name?.toLowerCase().includes('intravision')
  );

  const now = new Date();
  const qMonth = searchParams.get('month') ? parseInt(searchParams.get('month')) : null;
  const qYear = searchParams.get('year') ? parseInt(searchParams.get('year')) : null;

  const [month, setMonth] = useState(qMonth || now.getMonth() + 1);
  const [year, setYear] = useState(qYear || now.getFullYear());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Skipped / Excluded Employees set
  const [excludedIds, setExcludedIds] = useState(new Set());

  // Attendance / Days worked overrides map: { [employee_id]: number }
  const [daysWorkedMap, setDaysWorkedMap] = useState({});

  // Overtime (OT Hours) overrides map: { [employee_id]: number }
  const [otHoursMap, setOtHoursMap] = useState({});

  useEffect(() => {
    if (qMonth && qYear) {
      loadPreviewForMonth(qMonth, qYear);
    }
  }, [clientId, qMonth, qYear]);

  async function loadPreviewForMonth(m, y) {
    setLoading(true);
    setPreviewData(null);
    setExcludedIds(new Set());
    setDaysWorkedMap({});
    setOtHoursMap({});

    try {
      const r = await api.post(`/clients/${clientId}/payroll/preview`, {
        month: parseInt(m),
        year: parseInt(y),
      });
      setPreviewData(r.data.data);

      const initialDaysMap = {};
      const initialOtMap = {};
      r.data.data.entries?.forEach((entry) => {
        initialDaysMap[entry.employee_id] = entry.days_worked;
        initialOtMap[entry.employee_id] = entry.ot_hours || 0;
      });
      setDaysWorkedMap(initialDaysMap);
      setOtHoursMap(initialOtMap);

      if (r.data.data.draft_notes) {
        setNotes(r.data.data.draft_notes);
      }
      if (r.data.data.already_draft) {
        toast('Loaded existing draft attendance data', { icon: '📝' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate preview.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview(e) {
    if (e && e.preventDefault) e.preventDefault();
    await loadPreviewForMonth(month, year);
  }

  // Toggle single employee skip
  function toggleExclude(empId) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
        toast.success('Employee included in payroll');
      } else {
        next.add(empId);
        toast('Employee skipped for this month', { icon: '⏭️' });
      }
      return next;
    });
  }

  // Handle Days Worked change
  function handleDaysChange(empId, val) {
    setDaysWorkedMap((prev) => ({
      ...prev,
      [empId]: val,
    }));
  }

  // Handle OT Hours change
  function handleOtChange(empId, val) {
    setOtHoursMap((prev) => ({
      ...prev,
      [empId]: val,
    }));
  }

  // Bulk Attendance & OT Excel / CSV Upload
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          toast.error('Attendance file is empty or missing headers.');
          return;
        }

        // Find header columns
        const headers = json[0].map((h) => String(h || '').trim().toLowerCase());
        const rollIdx = headers.findIndex((h) => h.includes('roll') || h.includes('employee id') || h.includes('empid') || h.includes('id'));
        const daysIdx = headers.findIndex((h) => h.includes('day') || h.includes('worked') || h.includes('paid') || h.includes('present') || h.includes('attendance'));
        const otIdx = headers.findIndex((h) => h.includes('ot') || h.includes('overtime') || h.includes('extra hours'));

        if (rollIdx === -1) {
          toast.error('Could not find "Roll No" / "Employee ID" column in the sheet.');
          return;
        }

        let updatedCount = 0;
        const newDaysMap = { ...daysWorkedMap };
        const newOtMap = { ...otHoursMap };

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          const rollNo = String(row[rollIdx] || '').trim();

          if (rollNo) {
            const match = previewData.entries.find((e) => e.roll_no?.toLowerCase() === rollNo.toLowerCase());
            if (match) {
              if (daysIdx !== -1 && !isNaN(parseFloat(row[daysIdx]))) {
                const daysVal = parseFloat(row[daysIdx]);
                newDaysMap[match.employee_id] = Math.max(0, Math.min(match.total_days || 31, daysVal));
              }
              if (otIdx !== -1 && !isNaN(parseFloat(row[otIdx]))) {
                const otVal = parseFloat(row[otIdx]);
                newOtMap[match.employee_id] = Math.max(0, otVal);
              }
              updatedCount++;
            }
          }
        }

        setDaysWorkedMap(newDaysMap);
        setOtHoursMap(newOtMap);
        toast.success(`Updated attendance & OT for ${updatedCount} employees from file!`);
      } catch (err) {
        toast.error('Failed to parse attendance file. Please check format.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Export Attendance Template (Excel)
  function downloadAttendanceTemplate() {
    if (!previewData?.entries || previewData.entries.length === 0) return;

    const data = previewData.entries.map((e) => {
      const row = {
        'Roll No': e.roll_no,
        'Employee Name': e.name,
        'Designation': e.designation,
        'Total Month Days': e.total_days,
        'Days Worked': daysWorkedMap[e.employee_id] !== undefined ? daysWorkedMap[e.employee_id] : e.days_worked,
        'LOP Days': Math.max(0, (e.total_days || 30) - (daysWorkedMap[e.employee_id] !== undefined ? daysWorkedMap[e.employee_id] : e.days_worked)),
      };
      if (isIntravision) {
        row['OT Hours (₹60/hr)'] = otHoursMap[e.employee_id] !== undefined ? otHoursMap[e.employee_id] : (e.ot_hours || 0);
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_${selectedClient?.name || 'Client'}_${previewData.month_name}_${previewData.year}.xlsx`);
    toast.success('Attendance sheet downloaded');
  }

  // Batch Include / Skip
  function handleIncludeAll() {
    setExcludedIds(new Set());
    toast.success('All employees included');
  }

  function handleSkipAll() {
    if (!previewData?.entries) return;
    const all = new Set(previewData.entries.map((e) => e.employee_id));
    setExcludedIds(all);
    toast('All employees skipped for this month', { icon: '⏭️' });
  }

  // Live filtered entries and recalculations
  const allEntries = previewData?.entries || [];
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return allEntries;
    const s = searchTerm.toLowerCase();
    return allEntries.filter(
      (e) => e.name?.toLowerCase().includes(s) || e.roll_no?.toLowerCase().includes(s) || e.designation?.toLowerCase().includes(s)
    );
  }, [allEntries, searchTerm]);

  // Real-time totals of non-excluded employees
  const liveTotals = useMemo(() => {
    let gross = 0;
    let pf = 0;
    let esi = 0;
    let deductions = 0;
    let net = 0;
    let otHoursTotal = 0;
    let otAmountTotal = 0;
    let activeCount = 0;
    let proratedCount = 0;

    allEntries.forEach((entry) => {
      if (excludedIds.has(entry.employee_id)) return;
      const customDays = daysWorkedMap[entry.employee_id];
      const customOt = otHoursMap[entry.employee_id];
      const live = calculateProratedEntry(entry, customDays, customOt, selectedClient);
      gross += live.gross_salary;
      pf += live.employee_pf;
      esi += live.employee_esi;
      deductions += live.total_deductions;
      net += live.net_pay;
      otHoursTotal += live.ot_hours || 0;
      otAmountTotal += live.ot_amount || 0;
      activeCount++;
      if (live.is_prorated) proratedCount++;
    });

    return {
      gross,
      pf,
      esi,
      deductions,
      net,
      otHoursTotal,
      otAmountTotal,
      activeCount,
      proratedCount,
      skippedCount: excludedIds.size,
    };
  }, [allEntries, excludedIds, daysWorkedMap, otHoursMap, selectedClient]);

  // Execute Payroll
  async function handleRun() {
    if (!previewData) return;
    if (liveTotals.activeCount === 0) {
      toast.error('No employees are included in this run. Please include at least one employee.');
      return;
    }

    setRunning(true);
    try {
      const r = await api.post(`/clients/${clientId}/payroll/run`, {
        month: parseInt(month),
        year: parseInt(year),
        notes,
        excludedEmployeeIds: Array.from(excludedIds),
        attendanceOverrides: daysWorkedMap,
        otOverrides: otHoursMap,
      });

      const runId = r.data.data?.run_id;
      toast.success(`Payroll processed for ${liveTotals.activeCount} employees!`);
      navigate(`/clients/${clientId}/payroll/${runId}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to execute payroll.';
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Run Payroll</h1>
          <p className="page-subtitle">
            Preview, customize attendance / LOP {isIntravision ? '& Overtime (OT @ ₹60/hr)' : ''}, and process monthly salaries for {selectedClient?.name || 'Client'}
          </p>
        </div>
      </div>

      {/* Month & Year Selection Bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handlePreview} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setPreviewData(null); }}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: 120 }}>
            <label className="form-label">Year</label>
            <input
              type="number"
              className="form-input"
              value={year}
              min={2020}
              max={2100}
              onChange={(e) => { setYear(Number(e.target.value)); setPreviewData(null); }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginBottom: 0 }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Computing...</>
            ) : (
              <><Play size={15} /> Generate Payroll Preview</>
            )}
          </button>
        </form>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: isIntravision ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-label">Total Net Payout</div>
              <div className="stat-value" style={{ color: 'var(--success)', fontSize: 24 }}>
                ₹{fmt(liveTotals.net)}
              </div>
              <div className="stat-sub">{liveTotals.activeCount} Employees payable</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Gross Salary</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                ₹{fmt(liveTotals.gross)}
              </div>
              <div className="stat-sub">Before deductions</div>
            </div>

            {isIntravision && (
              <div className="stat-card" style={{ borderColor: 'rgba(79, 110, 247, 0.3)' }}>
                <div className="stat-label" style={{ color: 'var(--accent-light)' }}>Total Overtime (OT)</div>
                <div className="stat-value" style={{ color: 'var(--accent-light)', fontSize: 22 }}>
                  ₹{fmt(liveTotals.otAmountTotal)}
                </div>
                <div className="stat-sub">{liveTotals.otHoursTotal} OT Hours (@ ₹60/hr)</div>
              </div>
            )}

            <div className="stat-card">
              <div className="stat-label">PF & ESI Deductions</div>
              <div className="stat-value" style={{ color: 'var(--danger)', fontSize: 22 }}>
                ₹{fmt(liveTotals.deductions)}
              </div>
              <div className="stat-sub">PF: ₹{fmt(liveTotals.pf)} | ESI: ₹{fmt(liveTotals.esi)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Attendance Status</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {liveTotals.proratedCount} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>custom / LOP</span>
              </div>
              <div className="stat-sub">{liveTotals.skippedCount} Skipped this month</div>
            </div>
          </div>

          {/* Table Controls & Batch Bar */}
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              {/* Search & Counts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                <input
                  type="text"
                  className="form-input form-input-sm"
                  placeholder="Search employee by name, roll no, role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: 300 }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredEntries.length}</strong> of {allEntries.length} employees
                </span>
              </div>

              {/* Batch & Attendance Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={downloadAttendanceTemplate}
                  title="Download attendance sheet pre-filled with all employees"
                >
                  <Download size={13} /> Export Attendance
                </button>

                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                  <Upload size={13} /> Import Attendance
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleIncludeAll}
                  disabled={excludedIds.size === 0}
                >
                  <CheckSquare size={13} /> Include All
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSkipAll}
                  disabled={excludedIds.size === allEntries.length}
                >
                  <Square size={13} /> Skip All
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Employee Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Employee</th>
                    <th style={{ textAlign: 'center', width: 130 }}>Paid / Worked Days</th>
                    {isIntravision && (
                      <th style={{ textAlign: 'center', width: 140 }}>OT Hours (₹60/hr)</th>
                    )}
                    <th style={{ textAlign: 'right' }}>Gross Salary</th>
                    <th style={{ textAlign: 'right' }}>Employee PF</th>
                    <th style={{ textAlign: 'right' }}>ESI</th>
                    <th style={{ textAlign: 'right' }}>Net Take-Home</th>
                    <th style={{ textAlign: 'center', width: 90 }}>Action</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <EmployeeRow
                      key={entry.employee_id}
                      entry={entry}
                      isExcluded={excludedIds.has(entry.employee_id)}
                      onToggle={toggleExclude}
                      daysWorked={daysWorkedMap[entry.employee_id]}
                      onDaysChange={handleDaysChange}
                      otHours={otHoursMap[entry.employee_id]}
                      onOtChange={handleOtChange}
                      clientConfig={selectedClient}
                      isIntravision={isIntravision}
                    />
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={isIntravision ? 10 : 9} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                        No employees found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution Box */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label className="form-label" style={{ marginBottom: 4 }}>Run Notes (Optional)</label>
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="e.g. Regular monthly payroll run with OT adjustments"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleRun}
              disabled={running || liveTotals.activeCount === 0}
            >
              {running ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {previewData.already_draft ? 'Updating Draft...' : 'Processing Run...'}</>
              ) : (
                <><Play size={16} /> {previewData.already_draft ? `Update Draft Payroll Run (${liveTotals.activeCount} Employees)` : `Execute Payroll Run (${liveTotals.activeCount} Employees)`}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
