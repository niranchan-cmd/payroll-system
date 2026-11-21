import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import hrService from '../services/hr.service';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Calendar, Users, FileText, CheckCircle2, XCircle, Clock,
  ShieldCheck, AlertCircle, Plus, Search, Printer, Download,
  Laptop, Briefcase, FileCheck, Building, ChevronRight, X, UserPlus,
  Send, Award
} from 'lucide-react';

export default function HRCommandCenterPage() {
  const { id: clientId } = useParams();
  const { selectedClient } = useClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'leaves' | 'onboarding' | 'directory' | 'letters'
  const [activeTab, setActiveTab] = useState('leaves');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data States
  const [overview, setOverview] = useState({ metrics: {}, recentLeaves: [], recentDocs: [] });
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [hierarchyData, setHierarchyData] = useState({ employees: [], departments: [] });
  const [policies, setPolicies] = useState([]);
  const [issuedLetters, setIssuedLetters] = useState([]);
  const [clientEmployees, setClientEmployees] = useState([]);

  // Filter / Search States
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);

  // Form States
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    reason: '',
  });

  const [docForm, setDocForm] = useState({
    employee_id: '',
    doc_type: 'PAN',
    doc_name: '',
  });

  const [assetForm, setAssetForm] = useState({
    employee_id: '',
    asset_name: '',
    asset_tag: '',
    serial_number: '',
  });

  const [letterModalData, setLetterModalData] = useState({
    title: 'Relieving & Experience Certificate',
    letterType: 'RELIEVING',
    employee: null,
    referenceNo: 'NH/2026/RELI/1042',
    signatoryName: 'Aditya Singhania',
    signatoryTitle: 'Authorized Signatory · Managing Director',
    issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
  });

  const [policyForm, setPolicyForm] = useState({
    title: '',
    category: 'GENERAL',
    summary: '',
  });

  const [managerForm, setManagerForm] = useState({
    employeeId: '',
    managerId: '',
  });

  // ─── INITIAL DATA LOAD ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return;
    loadAllHRData();
  }, [clientId]);

  async function loadAllHRData() {
    setLoading(true);
    try {
      const [
        overviewRes,
        balancesRes,
        requestsRes,
        docsRes,
        assetsRes,
        hierarchyRes,
        policiesRes,
        lettersRes,
        employeesRes,
      ] = await Promise.all([
        hrService.getOverview(clientId).catch(() => ({ data: { data: {} } })),
        hrService.getLeaveBalances(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getLeaveRequests(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getDocuments(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getAssets(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getOrgHierarchy(clientId).catch(() => ({ data: { data: { employees: [], departments: [] } } })),
        hrService.getPolicies(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getIssuedLetters(clientId).catch(() => ({ data: { data: [] } })),
        api.get(`/clients/${clientId}/employees`).catch(() => ({ data: { data: [] } })),
      ]);

      setOverview(overviewRes.data.data || { metrics: {} });
      setLeaveBalances(balancesRes.data.data || []);
      setLeaveRequests(requestsRes.data.data || []);
      setDocuments(docsRes.data.data || []);
      setAssets(assetsRes.data.data || []);
      setHierarchyData(hierarchyRes.data.data || { employees: [], departments: [] });
      setPolicies(policiesRes.data.data || []);
      setIssuedLetters(lettersRes.data.data || []);
      setClientEmployees(employeesRes.data.data || []);
    } catch (err) {
      console.error('HR data load error:', err);
      toast.error('Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }

  // ─── ACTIONS: LEAVE APPROVAL ─────────────────────────────────────────────────
  async function handleUpdateLeaveStatus(id, status, empName) {
    try {
      await hrService.updateLeaveStatus(clientId, id, status);
      toast.success(`Leave request ${status.toLowerCase()} for ${empName}`);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave status');
    }
  }

  async function handleCreateLeaveRequest(e) {
    e.preventDefault();
    if (!leaveForm.employee_id) return toast.error('Please select an employee');
    setActionLoading(true);
    try {
      await hrService.createLeaveRequest(clientId, leaveForm);
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
      setLeaveForm({
        employee_id: '',
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        total_days: 1,
        reason: '',
      });
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create leave request');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── ACTIONS: DOCUMENTS & KYC ────────────────────────────────────────────────
  async function handleVerifyDoc(id, verification_status, docName) {
    try {
      await hrService.verifyDocument(clientId, id, verification_status);
      toast.success(`Document marked as ${verification_status}`);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update document status');
    }
  }

  async function handleAddDocument(e) {
    e.preventDefault();
    if (!docForm.employee_id || !docForm.doc_name) return toast.error('Fill in all document details');
    setActionLoading(true);
    try {
      await hrService.addDocument(clientId, docForm);
      toast.success('Document uploaded to KYC vault');
      setShowDocModal(false);
      setDocForm({ employee_id: '', doc_type: 'PAN', doc_name: '' });
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add document');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── ACTIONS: ASSETS ─────────────────────────────────────────────────────────
  async function handleAssignAsset(e) {
    e.preventDefault();
    if (!assetForm.employee_id || !assetForm.asset_name) return toast.error('Fill in all asset details');
    setActionLoading(true);
    try {
      await hrService.assignAsset(clientId, assetForm);
      toast.success('Hardware asset successfully assigned');
      setShowAssetModal(false);
      setAssetForm({ employee_id: '', asset_name: '', asset_tag: '', serial_number: '' });
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign asset');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateAssetStatus(id, status) {
    try {
      await hrService.updateAssetStatus(clientId, id, status);
      toast.success(`Asset marked as ${status}`);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update asset');
    }
  }

  // ─── ACTIONS: POLICIES ───────────────────────────────────────────────────────
  async function handleCreatePolicy(e) {
    e.preventDefault();
    if (!policyForm.title) return toast.error('Policy title is required');
    setActionLoading(true);
    try {
      await hrService.createPolicy(clientId, policyForm);
      toast.success('Policy published to repository');
      setShowPolicyModal(false);
      setPolicyForm({ title: '', category: 'GENERAL', summary: '' });
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish policy');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeletePolicy(id) {
    if (!window.confirm('Are you sure you want to delete this company policy?')) return;
    try {
      await hrService.deletePolicy(clientId, id);
      toast.success('Policy removed');
      loadAllHRData();
    } catch (err) {
      toast.error('Failed to remove policy');
    }
  }

  // ─── ACTIONS: MANAGER ASSIGNMENT ─────────────────────────────────────────────
  async function handleUpdateManager(e) {
    e.preventDefault();
    if (!managerForm.employeeId) return toast.error('Select an employee');
    setActionLoading(true);
    try {
      await hrService.updateEmployeeManager(clientId, managerForm.employeeId, managerForm.managerId || null);
      toast.success('Reporting line updated successfully');
      setShowManagerModal(false);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update manager');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── ACTIONS: LETTERHEAD STUDIO ──────────────────────────────────────────────
  function openLetterModalWithTemplate(templateType, templateTitle) {
    const defaultEmp = clientEmployees[0] || null;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setLetterModalData({
      title: templateTitle,
      letterType: templateType,
      employee: defaultEmp,
      referenceNo: `NH/2026/${templateType.substring(0, 4)}/${randomSuffix}`,
      signatoryName: 'Aditya Singhania',
      signatoryTitle: 'Authorized Signatory · Managing Director',
      issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    });
    setShowLetterModal(true);
  }

  async function handleSaveLetter() {
    if (!letterModalData.employee) return toast.error('Please select an employee for the letter');
    setActionLoading(true);
    try {
      await hrService.issueLetter(clientId, {
        employee_id: letterModalData.employee.id,
        letter_type: letterModalData.letterType,
        signatory_name: letterModalData.signatoryName,
        signatory_title: letterModalData.signatoryTitle,
      });
      toast.success(`Letter ${letterModalData.referenceNo} issued and registered`);
      setShowLetterModal(false);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record letter');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── FILTERED EMPLOYEES ──────────────────────────────────────────────────────
  const filteredEmployees = hierarchyData.employees.filter((emp) => {
    const matchesSearch =
      !employeeSearch ||
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.roll_no.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      (emp.designation && emp.designation.toLowerCase().includes(employeeSearch.toLowerCase()));
    const matchesDept =
      selectedDeptFilter === 'ALL' || (emp.department || 'General') === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading HR Command Center...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Header & Breadcrumbs ────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Clients</span>
          <ChevronRight size={12} />
          <span>{selectedClient?.name || 'Organization'}</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>HR Command Center</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              People Operations & HR Command Center
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Coordinate attendance ledgers, onboarding vaults, reporting chains, and statutory letters with 100% tenant isolation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => openLetterModalWithTemplate('RELIEVING', 'Relieving & Experience Certificate')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <FileCheck size={16} />
              Quick Letter Studio
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <Plus size={16} />
              Submit Leave Request
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 PULSE METRIC WIDGETS ──────────────────────────────────────── */}
      <div className="hr-pulse-grid">
        {/* Attendance Today */}
        <div className="hr-pulse-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>Workforce Active</span>
            <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} /> Live
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
            {overview.metrics?.totalEmployees || clientEmployees.length} Staff
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#10B981' }}>{clientEmployees.length - (overview.metrics?.pendingLeaves || 0)} On Duty</strong> · {overview.metrics?.pendingLeaves || 0} In Queue
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="hr-pulse-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>Pending Leave Requests</span>
            <span style={{ color: '#D97706', fontWeight: 800 }}>Needs Review</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
            {leaveRequests.filter(r => r.status === 'PENDING').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Awaiting manager or admin approval
          </div>
        </div>

        {/* KYC Pipeline */}
        <div className="hr-pulse-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>KYC Verification Vault</span>
            <span style={{ color: '#2563EB', fontWeight: 800 }}>Dossier</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
            {documents.filter(d => d.verification_status === 'PENDING').length} Pending
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {documents.filter(d => d.verification_status === 'VERIFIED').length} verified records in vault
          </div>
        </div>

        {/* Hardware Assets & Letters */}
        <div className="hr-pulse-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>Assets & Letters Issued</span>
            <span style={{ color: '#7C3AED' }}>🗂️ Active</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
            {assets.length} Assets · {issuedLetters.length} Letters
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Full asset custody & legal registry maintained
          </div>
        </div>
      </div>

      {/* ── 4-MODULE TAB NAVIGATION ─────────────────────────────────────── */}
      <div className="hr-tabs-nav">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`hr-tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
        >
          <Calendar size={16} />
          1. Leaves & Attendance Ledger
          {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span style={{ fontSize: 11, background: '#D97706', color: '#FFF', padding: '2px 6px', borderRadius: 9999, fontWeight: 800 }}>
              {leaveRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('onboarding')}
          className={`hr-tab-btn ${activeTab === 'onboarding' ? 'active' : ''}`}
        >
          <Briefcase size={16} />
          2. Digital Onboarding & KYC Vault
          {documents.filter(d => d.verification_status === 'PENDING').length > 0 && (
            <span style={{ fontSize: 11, background: '#2563EB', color: '#FFF', padding: '2px 6px', borderRadius: 9999, fontWeight: 800 }}>
              {documents.filter(d => d.verification_status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`hr-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
        >
          <Users size={16} />
          3. Org Hierarchy & Directory
        </button>

        <button
          onClick={() => setActiveTab('letters')}
          className={`hr-tab-btn ${activeTab === 'letters' ? 'active' : ''}`}
        >
          <Award size={16} />
          4. Letterhead & Policy Studio
        </button>
      </div>

      {/* =================================================================== */}
      {/* MODULE 1: LEAVES & ATTENDANCE LEDGER */}
      {/* =================================================================== */}
      {activeTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Pending Approval Table */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Pending Leave Requests & Approval Queue
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Approvals deduct quotas immediately and calculate Loss of Pay (LOP) without altering payroll rules.
                </p>
              </div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> New Leave Request
              </button>
            </div>

            {leaveRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 10px' }} />
                All leave requests are cleared! No approvals pending.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {req.employee?.name || 'Staff Member'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {req.employee?.roll_no} · {req.employee?.designation}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 9999,
                              backgroundColor:
                                req.leave_type === 'CASUAL' ? '#E0E7FF' :
                                req.leave_type === 'SICK' ? '#FEE2E2' :
                                req.leave_type === 'PRIVILEGE' ? '#FEF3C7' : '#F1F5F9',
                              color:
                                req.leave_type === 'CASUAL' ? '#3730A3' :
                                req.leave_type === 'SICK' ? '#991B1B' :
                                req.leave_type === 'PRIVILEGE' ? '#92400E' : '#334155',
                            }}
                          >
                            {req.leave_type} LEAVE
                          </span>
                        </td>
                        <td>
                          <strong>{req.total_days} Days</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, maxWidth: 220 }}>
                          {req.reason || 'Personal'}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor:
                                req.status === 'APPROVED' ? '#E6F4EA' :
                                req.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                              color:
                                req.status === 'APPROVED' ? '#065F46' :
                                req.status === 'REJECTED' ? '#991B1B' : '#92400E',
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleUpdateLeaveStatus(req.id, 'APPROVED', req.employee?.name)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 11.5,
                                  backgroundColor: '#E6F4EA',
                                  color: '#065F46',
                                  borderColor: '#BBF7D0',
                                  fontWeight: 700,
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(req.id, 'REJECTED', req.employee?.name)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: 11.5,
                                  backgroundColor: '#FEE2E2',
                                  color: '#991B1B',
                                  borderColor: '#FECACA',
                                  fontWeight: 700,
                                }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Processed by {req.approved_by || 'Admin'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Annual Leave Balances Matrix */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Annual Leave Balances Ledger (Calendar Year 2026)
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
              Standard statutory quota: 12 Casual (CL), 10 Sick (SL), 15 Privilege (PL). Loss of Pay (LOP) flows to payroll.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: 680 }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Casual Leave (CL)</th>
                    <th>Sick Leave (SL)</th>
                    <th>Privilege Leave (PL)</th>
                    <th>Unpaid Days (LOP)</th>
                    <th>Total Available</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveBalances.map((b) => {
                    const clLeft = (b.casual_allocated || 12) - (b.casual_used || 0);
                    const slLeft = (b.sick_allocated || 10) - (b.sick_used || 0);
                    const plLeft = (b.priv_allocated || 15) - (b.priv_used || 0);
                    const totalLeft = clLeft + slLeft + plLeft;

                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {b.employee?.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {b.employee?.roll_no} · {b.employee?.designation}
                          </div>
                        </td>
                        <td>
                          <strong>{clLeft}</strong> / {b.casual_allocated || 12}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Used: {b.casual_used || 0}</div>
                        </td>
                        <td>
                          <strong>{slLeft}</strong> / {b.sick_allocated || 10}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Used: {b.sick_used || 0}</div>
                        </td>
                        <td>
                          <strong>{plLeft}</strong> / {b.priv_allocated || 15}
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Used: {b.priv_used || 0}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: b.unpaid_days > 0 ? '#DC2626' : 'var(--text-muted)' }}>
                            {b.unpaid_days || 0} Days
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: '#065F46',
                              backgroundColor: '#E6F4EA',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {totalLeft} Days Left
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Public Holiday Ribbon */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                Upcoming Statutory Holiday: Guru Nanak Jayanti
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Mandatory paid public holiday across corporate regional hubs
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                padding: '4px 12px',
                borderRadius: 6,
                color: 'var(--text-primary)',
              }}
            >
              🗓️ 27 Nov 2026 (Friday)
            </span>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODULE 2: DIGITAL ONBOARDING & KYC VAULT */}
      {/* =================================================================== */}
      {activeTab === 'onboarding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Actions & Sub-heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Digital Onboarding & KYC Document Vault
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Store Aadhaar, PAN, Bank Passbooks, and signed IP agreements in compliance with IT Act & DPDP.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDocModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Upload KYC Doc
              </button>
              <button
                onClick={() => setShowAssetModal(true)}
                className="btn btn-primary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Laptop size={14} /> Assign Hardware
              </button>
            </div>
          </div>

          {/* KYC Document Checklist Table */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
              Employee Document Verification Ledger
            </h3>

            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                No KYC documents logged yet. Click "Upload KYC Doc" to add candidate files.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Document Type</th>
                      <th>File / Reference</th>
                      <th>Verification Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {doc.employee?.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {doc.employee?.roll_no} · {doc.employee?.department || 'General'}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {doc.doc_type}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>
                            {doc.doc_name}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                            Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 9999,
                              backgroundColor:
                                doc.verification_status === 'VERIFIED' ? '#E6F4EA' :
                                doc.verification_status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                              color:
                                doc.verification_status === 'VERIFIED' ? '#065F46' :
                                doc.verification_status === 'REJECTED' ? '#991B1B' : '#92400E',
                            }}
                          >
                            {doc.verification_status === 'VERIFIED' ? '✓ VERIFIED' : doc.verification_status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {doc.verification_status !== 'VERIFIED' && (
                              <button
                                onClick={() => handleVerifyDoc(doc.id, 'VERIFIED', doc.doc_name)}
                                className="btn btn-secondary"
                                style={{ padding: '3px 8px', fontSize: 11, backgroundColor: '#E6F4EA', color: '#065F46' }}
                              >
                                Mark Verified
                              </button>
                            )}
                            {doc.verification_status !== 'REJECTED' && (
                              <button
                                onClick={() => handleVerifyDoc(doc.id, 'REJECTED', doc.doc_name)}
                                className="btn btn-secondary"
                                style={{ padding: '3px 8px', fontSize: 11, backgroundColor: '#FEE2E2', color: '#991B1B' }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Hardware Assets Section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Hardware Asset Custody & Laptop Allocation
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Serial number registry and return tracker for distributed employee workstations.
                </p>
              </div>
              <button
                onClick={() => setShowAssetModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
              >
                + Assign Device
              </button>
            </div>

            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                No assets registered yet. Click "+ Assign Device" to log company laptops and monitors.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Asset Model</th>
                      <th>Asset Tag / Serial</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {asset.employee?.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {asset.employee?.roll_no}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {asset.asset_name}
                        </td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {asset.asset_tag || 'N/A'} · SN: {asset.serial_number || 'N/A'}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: asset.status === 'ASSIGNED' ? '#E6F4EA' : '#F1F5F9',
                              color: asset.status === 'ASSIGNED' ? '#065F46' : '#475569',
                            }}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {asset.status === 'ASSIGNED' ? (
                            <button
                              onClick={() => handleUpdateAssetStatus(asset.id, 'RETURNED')}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                            >
                              Log Return
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Returned on {asset.returned_date ? new Date(asset.returned_date).toLocaleDateString() : 'Yes'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODULE 3: ORG HIERARCHY & TEAM DIRECTORY */}
      {/* =================================================================== */}
      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Search & Department Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Organization Hierarchy & Team Directory
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Map direct reporting lines and visualize department rosters across the organization.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search staff, role..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 32px',
                    fontSize: 12.5,
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    minWidth: 200,
                  }}
                />
              </div>
              <button
                onClick={() => setShowManagerModal(true)}
                className="btn btn-primary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Users size={14} /> Update Reporting Line
              </button>
            </div>
          </div>

          {/* Department Chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedDeptFilter('ALL')}
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                padding: '4px 12px',
                borderRadius: 9999,
                fontWeight: selectedDeptFilter === 'ALL' ? 800 : 500,
                backgroundColor: selectedDeptFilter === 'ALL' ? 'var(--accent)' : 'var(--bg-surface)',
                color: selectedDeptFilter === 'ALL' ? '#FFF' : 'var(--text-secondary)',
              }}
            >
              All Departments ({hierarchyData.employees.length})
            </button>
            {hierarchyData.departments.map((dept) => (
              <button
                key={dept.name}
                onClick={() => setSelectedDeptFilter(dept.name)}
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  fontWeight: selectedDeptFilter === dept.name ? 800 : 500,
                  backgroundColor: selectedDeptFilter === dept.name ? 'var(--accent)' : 'var(--bg-surface)',
                  color: selectedDeptFilter === dept.name ? '#FFF' : 'var(--text-secondary)',
                }}
              >
                {dept.name} ({dept.count})
              </button>
            ))}
          </div>

          {/* Visual Org Tree Simulation */}
          <div className="card" style={{ padding: 28, overflowX: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Executive Leadership
              </div>
            </div>

            <div className="hr-org-tree">
              {/* Executive Root */}
              <div className="hr-org-node root">
                <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  Managing Director / Head
                </div>
                <div style={{ fontWeight: 900, fontSize: 15, margin: '4px 0 2px', color: 'var(--text-primary)' }}>
                  {clientEmployees[0]?.name || 'Aditya Singhania'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {selectedClient?.name || 'Corporate Entity'}
                </div>
              </div>

              <div style={{ width: 2, height: 20, background: 'var(--border-subtle)', margin: '-16px 0 -8px' }} />

              {/* Department Nodes */}
              <div className="hr-org-children">
                {filteredEmployees.slice(0, 6).map((emp) => (
                  <div key={emp.id} className="hr-org-node">
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                      {emp.department || 'General Operations'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, margin: '4px 0 2px', color: 'var(--text-primary)' }}>
                      {emp.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {emp.designation || 'Staff'}
                    </div>
                    {emp.manager && (
                      <div style={{ fontSize: 10, color: '#065F46', marginTop: 6, fontWeight: 600 }}>
                        Reports to: {emp.manager.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Directory Table */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
              Complete Staff Directory ({filteredEmployees.length} Members)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: 680 }}>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Department</th>
                    <th>Reporting Manager</th>
                    <th>Contact Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{emp.roll_no}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</td>
                      <td>{emp.designation}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-elevated)' }}>
                          {emp.department || 'General'}
                        </span>
                      </td>
                      <td style={{ color: emp.manager ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {emp.manager ? emp.manager.name : '— Executive Level —'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.email || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODULE 4: LETTERHEAD & POLICY STUDIO */}
      {/* =================================================================== */}
      {activeTab === 'letters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Official HR Documentation & Letterhead Studio
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Issue legally compliant corporate letters with pre-configured organizational templates in seconds.
              </p>
            </div>
            <button
              onClick={() => setShowPolicyModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Add Company Policy
            </button>
          </div>

          {/* 4 Standard Letter Templates */}
          <div className="hr-doc-grid">
            {/* Template 1 */}
            <div className="hr-doc-card">
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💼</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  Offer & Appointment Letter
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  Standard corporate appointment agreement including designation, probation terms, CTC annexure, and IP covenants.
                </div>
              </div>
              <button
                onClick={() => openLetterModalWithTemplate('APPOINTMENT', 'Offer & Appointment Agreement')}
                className="btn btn-primary"
                style={{ fontSize: 12.5 }}
              >
                Draft Appointment Letter →
              </button>
            </div>

            {/* Template 2 */}
            <div className="hr-doc-card">
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  Probation Confirmation Letter
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  Formal confirmation of employment upon successful completion of 3-month or 6-month statutory probation period.
                </div>
              </div>
              <button
                onClick={() => openLetterModalWithTemplate('CONFIRMATION', 'Probation Confirmation Letter')}
                className="btn btn-primary"
                style={{ fontSize: 12.5 }}
              >
                Issue Confirmation →
              </button>
            </div>

            {/* Template 3 */}
            <div className="hr-doc-card">
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📜</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  Relieving & Experience Certificate
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  Full exit certification confirming clean handover, tenure duration, final conduct rating, and release from corporate duties.
                </div>
              </div>
              <button
                onClick={() => openLetterModalWithTemplate('RELIEVING', 'Relieving & Experience Certificate')}
                className="btn btn-primary"
                style={{ fontSize: 12.5 }}
              >
                Issue Relieving Letter →
              </button>
            </div>

            {/* Template 4 */}
            <div className="hr-doc-card">
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🏛️</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  Bonafide & Address Proof Letter
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  Corporate certification for employee passport verification, bank home loans, visa applications, or apartment rental verification.
                </div>
              </div>
              <button
                onClick={() => openLetterModalWithTemplate('BONAFIDE', 'Bonafide Employment Certification')}
                className="btn btn-primary"
                style={{ fontSize: 12.5 }}
              >
                Generate Bonafide →
              </button>
            </div>
          </div>

          {/* Registered Issued Letters History */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
              Issued Letter Register ({issuedLetters.length} Registered)
            </h3>
            {issuedLetters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                No letters registered yet. Generate a letter from the cards above to record it here.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Ref Number</th>
                      <th>Employee</th>
                      <th>Letter Type</th>
                      <th>Signatory</th>
                      <th>Date Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedLetters.map((letter) => (
                      <tr key={letter.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
                          {letter.reference_no}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {letter.employee?.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {letter.employee?.designation}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-elevated)' }}>
                            {letter.letter_type}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{letter.signatory_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(letter.issue_date || letter.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Corporate Policy Repository */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Statutory Company Policy Repository
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Enforced organizational compliance guidelines and employee handbooks.
                </p>
              </div>
              <button
                onClick={() => setShowPolicyModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
              >
                + Publish Policy
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📄</span> {policy.title}
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        {policy.category}
                      </span>
                    </div>
                    {policy.summary && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {policy.summary}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={() => toast.success(`Downloaded ${policy.title}`)}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => handleDeletePolicy(policy.id)}
                      style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}
                      title="Delete Policy"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: SUBMIT LEAVE REQUEST */}
      {/* =================================================================== */}
      {showLeaveModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowLeaveModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Submit Leave Request</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveRequest}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Employee *</label>
                <select
                  className="input"
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">Select Employee...</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Leave Type *</label>
                <select
                  className="input"
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick Leave (SL)</option>
                  <option value="PRIVILEGE">Privilege / Annual Leave (PL)</option>
                  <option value="UNPAID">Unpaid Leave (Loss of Pay / LOP)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Total Working Days *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="input"
                  value={leaveForm.total_days}
                  onChange={(e) => setLeaveForm({ ...leaveForm, total_days: parseFloat(e.target.value) || 1 })}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Reason / Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Family wedding, viral infection recovery..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: UPLOAD KYC DOCUMENT */}
      {/* =================================================================== */}
      {showDocModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowDocModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Upload KYC Document to Vault</h3>
              <button onClick={() => setShowDocModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDocument}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Employee *</label>
                <select
                  className="input"
                  value={docForm.employee_id}
                  onChange={(e) => setDocForm({ ...docForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">Select Employee...</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Document Category *</label>
                <select
                  className="input"
                  value={docForm.doc_type}
                  onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}
                >
                  <option value="PAN">PAN Card (Permanent Account Number)</option>
                  <option value="AADHAAR">Aadhaar Card (UIDAI Masked)</option>
                  <option value="BANK_PASSBOOK">Bank Passbook / Cancelled Cheque</option>
                  <option value="SIGNED_NDA">Signed NDA & IP Covenant</option>
                  <option value="EXPERIENCE">Relieving / Experience Letter</option>
                  <option value="OTHER">Other Official Document</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Document Title / File Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. PAN_Rahul_Sharma.pdf"
                  value={docForm.doc_name}
                  onChange={(e) => setDocForm({ ...docForm, doc_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowDocModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Saving...' : 'Add to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: ASSIGN HARDWARE ASSET */}
      {/* =================================================================== */}
      {showAssetModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAssetModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Assign Workstation Hardware Asset</h3>
              <button onClick={() => setShowAssetModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignAsset}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Employee *</label>
                <select
                  className="input"
                  value={assetForm.employee_id}
                  onChange={(e) => setAssetForm({ ...assetForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">Select Employee...</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Asset Model & Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Apple MacBook Pro 14 M3, Dell Latitude 5440"
                  value={assetForm.asset_name}
                  onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label className="label">Asset Tag (Internal)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. NH-MBP-088"
                    value={assetForm.asset_tag}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_tag: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Serial Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. C02G99...X"
                    value={assetForm.serial_number}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowAssetModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Assigning...' : 'Assign Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: LETTERHEAD STUDIO (PRINTABLE MODAL) */}
      {/* =================================================================== */}
      {showLetterModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowLetterModal(false)}>
          <div className="modal-card" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
                  Official Document Studio
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {letterModalData.title}
                </h3>
              </div>
              <button onClick={() => setShowLetterModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Employee Selector Bar */}
            <div style={{ marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Target Employee:
              </label>
              <select
                className="input"
                style={{ flex: 1, height: 36, fontSize: 13 }}
                value={letterModalData.employee?.id || ''}
                onChange={(e) => {
                  const emp = clientEmployees.find((x) => x.id === e.target.value);
                  setLetterModalData({ ...letterModalData, employee: emp });
                }}
              >
                {clientEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.designation} · {emp.roll_no})
                  </option>
                ))}
              </select>
            </div>

            {/* Letterhead Body Preview (Printable) */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '32px 36px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontFamily: 'serif',
                fontSize: 14,
                lineHeight: 1.6,
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              {/* Official Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #023326', paddingBottom: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#023326', fontFamily: 'sans-serif' }}>
                    {selectedClient?.name?.toUpperCase() || 'CORPORATE CLIENT ENTITY'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'sans-serif' }}>
                    Managed via Ploy.pe by NH Associates · CIN: U72900HR2022PTC099120
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: 11, color: '#64748B' }}>
                  Ref: {letterModalData.referenceNo}<br />
                  Date: {letterModalData.issueDate}
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 15, textDecoration: 'underline', marginBottom: 20, fontFamily: 'sans-serif' }}>
                {letterModalData.letterType === 'RELIEVING' && 'TO WHOMSOEVER IT MAY CONCERN'}
                {letterModalData.letterType === 'APPOINTMENT' && 'OFFER OF EMPLOYMENT & APPOINTMENT LETTER'}
                {letterModalData.letterType === 'CONFIRMATION' && 'CONFIRMATION OF PERMANENT EMPLOYMENT'}
                {letterModalData.letterType === 'BONAFIDE' && 'BONAFIDE EMPLOYMENT CERTIFICATE'}
              </div>

              {/* Dynamic Body */}
              <p style={{ marginBottom: 14 }}>
                This is to formally certify that <strong>{letterModalData.employee?.name || 'Rahul Sharma'}</strong> (Employee Roll No: <strong>{letterModalData.employee?.roll_no || 'EMP-1002'}</strong>) is associated with <strong>{selectedClient?.name || 'Company'}</strong> as <strong>{letterModalData.employee?.designation || 'Specialist'}</strong> in the <strong>{letterModalData.employee?.department || 'Operations'}</strong> department.
              </p>

              {letterModalData.letterType === 'RELIEVING' && (
                <>
                  <p style={{ marginBottom: 14 }}>
                    During their tenure, they demonstrated exemplary professional integrity, diligence, and operational excellence. They have completed all handover protocols and have been formally relieved of all duties and company assets in full clearance.
                  </p>
                  <p style={{ marginBottom: 28 }}>
                    We extend our highest appreciation for their valuable contributions and wish them every success in all future pursuits.
                  </p>
                </>
              )}

              {letterModalData.letterType === 'APPOINTMENT' && (
                <>
                  <p style={{ marginBottom: 14 }}>
                    We are pleased to appoint you in your role with immediate effect. Your terms of compensation, benefits, and statutory EPF/ESIC inclusions have been verified according to your CTC Structure annexure.
                  </p>
                  <p style={{ marginBottom: 28 }}>
                    We welcome you to the team and look forward to a rewarding and collaborative professional journey together.
                  </p>
                </>
              )}

              {letterModalData.letterType === 'CONFIRMATION' && (
                <>
                  <p style={{ marginBottom: 14 }}>
                    Subsequent to the satisfactory completion of your probationary evaluation period, we have the pleasure to confirm your services as a permanent employee with effect from this date.
                  </p>
                  <p style={{ marginBottom: 28 }}>
                    All other terms and conditions specified in your initial appointment covenant remain in full force.
                  </p>
                </>
              )}

              {letterModalData.letterType === 'BONAFIDE' && (
                <>
                  <p style={{ marginBottom: 14 }}>
                    This certificate is being issued on the specific request of the employee for official verification purposes (banking, address proof, or passport verification). The organization verifies that they are currently employed on full-time active status.
                  </p>
                  <p style={{ marginBottom: 28 }}>
                    This document carries zero financial liability for the issuing organization.
                  </p>
                </>
              )}

              {/* Signatory Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 36, fontFamily: 'sans-serif' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#023326', fontSize: 13 }}>
                    {letterModalData.signatoryName}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    {letterModalData.signatoryTitle}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {selectedClient?.name || 'NH Associates'}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px dashed #CBD5E1',
                    borderRadius: 8,
                    padding: '8px 14px',
                    textAlign: 'center',
                    fontSize: 10,
                    color: '#94A3B8',
                  }}
                >
                  [Digital Corporate Seal]
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowLetterModal(false)} className="btn btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={15} /> Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={handleSaveLetter}
                disabled={actionLoading}
                className="btn btn-primary"
              >
                {actionLoading ? 'Saving...' : 'Register Issued Letter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: ADD COMPANY POLICY */}
      {/* =================================================================== */}
      {showPolicyModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowPolicyModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Publish Company Policy</h3>
              <button onClick={() => setShowPolicyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Policy Title *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. PoSH Compliance Guideline 2026"
                  value={policyForm.title}
                  onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={policyForm.category}
                  onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                >
                  <option value="COMPLIANCE">Compliance & Statutory</option>
                  <option value="LEAVE">Leave & Attendance Rules</option>
                  <option value="REMOTE_WORK">Remote Work & Asset Protection</option>
                  <option value="GENERAL">General Code of Conduct</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Summary / Overview</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Summary of the policy rules and employee requirements..."
                  value={policyForm.summary}
                  onChange={(e) => setPolicyForm({ ...policyForm, summary: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowPolicyModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Publishing...' : 'Publish Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 6: UPDATE REPORTING LINE */}
      {/* =================================================================== */}
      {showManagerModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowManagerModal(false)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Update Reporting Hierarchy Line</h3>
              <button onClick={() => setShowManagerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateManager}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Employee *</label>
                <select
                  className="input"
                  value={managerForm.employeeId}
                  onChange={(e) => setManagerForm({ ...managerForm, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee...</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">Reporting Manager</label>
                <select
                  className="input"
                  value={managerForm.managerId}
                  onChange={(e) => setManagerForm({ ...managerForm, managerId: e.target.value })}
                >
                  <option value="">— Direct Executive (No Manager) —</option>
                  {clientEmployees
                    .filter((emp) => emp.id !== managerForm.employeeId)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowManagerModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">
                  {actionLoading ? 'Updating...' : 'Save Reporting Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
