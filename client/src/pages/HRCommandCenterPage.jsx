import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import hrService from '../services/hr.service';
import api from '../services/api';
import toast from 'react-hot-toast';
import { printElement } from '../utils/printHtml';
import {
  Calendar, Users, FileText, CheckCircle2, XCircle, Clock,
  ShieldCheck, AlertCircle, Plus, Search, Printer, Download,
  Laptop, Briefcase, FileCheck, Building, ChevronRight, X, UserPlus,
  Send, Award, Edit3, Eye, Check, Paperclip, Filter, RefreshCw
} from 'lucide-react';

export default function HRCommandCenterPage() {
  const { id: clientId } = useParams();
  const { selectedClient, syncClientFromId } = useClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'leaves' | 'assets' | 'directory' | 'letters'
  const [activeTab, setActiveTab] = useState('leaves');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data States
  const [overview, setOverview] = useState({ metrics: {}, recentLeaves: [], recentDocs: [] });
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [hierarchyData, setHierarchyData] = useState({ employees: [], departments: [] });
  const [policies, setPolicies] = useState([]);
  const [issuedLetters, setIssuedLetters] = useState([]);
  const [clientEmployees, setClientEmployees] = useState([]);

  // Filter / Search States
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [assetFilter, setAssetFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'RETURNED'

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);

  // Print ref for Letterhead Studio
  const letterPrintRef = useRef(null);

  // Form States
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1,
    reason: '',
  });

  const [assetForm, setAssetForm] = useState({
    employee_id: '',
    asset_name: '',
    asset_tag: '',
    serial_number: '',
  });

  // Letterhead Studio State
  const [letterModalData, setLetterModalData] = useState({
    title: 'Relieving & Experience Certificate',
    letterType: 'RELIEVING',
    employee: null,
    referenceNo: '',
    customTitle: 'TO WHOMSOEVER IT MAY CONCERN',
    issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    openingParagraph: '',
    bodyParagraph: '',
    closingParagraph: '',
    signatoryName: 'Aditya Singhania',
    signatoryTitle: 'Authorized Signatory · Managing Director',
    showLogo: true,
    logoUrl: '/logo.png',
    showSignature: true,
  });
  const [isEditingLetter, setIsEditingLetter] = useState(false);

  // Policy Form State
  const [policyForm, setPolicyForm] = useState({
    title: '',
    category: 'GENERAL',
    customCategory: '',
    summary: '',
    file_url: '',
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
      if (syncClientFromId) {
        syncClientFromId(clientId).catch(() => {});
      }

      const [
        overviewRes,
        balancesRes,
        requestsRes,
        assetsRes,
        hierarchyRes,
        policiesRes,
        lettersRes,
        employeesRes,
      ] = await Promise.all([
        hrService.getOverview(clientId).catch(() => ({ data: { data: {} } })),
        hrService.getLeaveBalances(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getLeaveRequests(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getAssets(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getOrgHierarchy(clientId).catch(() => ({ data: { data: { employees: [], departments: [] } } })),
        hrService.getPolicies(clientId).catch(() => ({ data: { data: [] } })),
        hrService.getIssuedLetters(clientId).catch(() => ({ data: { data: [] } })),
        api.get(`/clients/${clientId}/employees`, { params: { status: 'ALL' } }).catch(() => ({ data: { data: [] } })),
      ]);

      const hierarchyEmps = hierarchyRes.data.data?.employees || [];
      const fetchedEmployees = employeesRes.data.data?.length ? employeesRes.data.data : hierarchyEmps;

      setOverview(overviewRes.data.data || { metrics: {} });
      setLeaveBalances(balancesRes.data.data || []);
      setLeaveRequests(requestsRes.data.data || []);
      setAssets(assetsRes.data.data || []);
      setHierarchyData(hierarchyRes.data.data || { employees: [], departments: [] });
      setPolicies(policiesRes.data.data || []);
      setIssuedLetters(lettersRes.data.data || []);
      setClientEmployees(fetchedEmployees);
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
    if (!policyForm.title.trim()) return toast.error('Policy title is required');

    const categoryToSave = policyForm.category === 'CUSTOM'
      ? (policyForm.customCategory.trim() || 'CUSTOM')
      : policyForm.category;

    setActionLoading(true);
    try {
      await hrService.createPolicy(clientId, {
        title: policyForm.title.trim(),
        category: categoryToSave,
        summary: policyForm.summary.trim(),
        file_url: policyForm.file_url.trim() || null,
      });
      toast.success('Policy published to repository');
      setShowPolicyModal(false);
      setPolicyForm({ title: '', category: 'GENERAL', customCategory: '', summary: '', file_url: '' });
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
    const clientName = selectedClient?.name || 'Company';

    let customTitle = 'TO WHOMSOEVER IT MAY CONCERN';
    let opening = '';
    let body = '';
    let closing = '';

    if (templateType === 'RELIEVING') {
      customTitle = 'RELIEVING & EXPERIENCE CERTIFICATE';
      opening = `This is to formally certify that {EMPLOYEE_NAME} (Roll No: {ROLL_NO}) was employed with {COMPANY_NAME} as {DESIGNATION} in the {DEPARTMENT} department.`;
      body = `During their tenure, they demonstrated exemplary professional integrity, diligence, and operational excellence. They have completed all handover protocols and have been formally relieved of all duties and company assets in full clearance.`;
      closing = `We extend our highest appreciation for their valuable contributions and wish them every success in all future pursuits.`;
    } else if (templateType === 'APPOINTMENT') {
      customTitle = 'OFFER OF EMPLOYMENT & APPOINTMENT LETTER';
      opening = `We are pleased to offer you the position of {DESIGNATION} at {COMPANY_NAME} in the {DEPARTMENT} department.`;
      body = `Your terms of compensation, benefits, and statutory EPF/ESIC inclusions have been verified according to your CTC Structure annexure. This appointment is subject to the terms, code of conduct, and policies of the organization.`;
      closing = `We welcome you to the team and look forward to a rewarding and collaborative professional journey together.`;
    } else if (templateType === 'CONFIRMATION') {
      customTitle = 'CONFIRMATION OF PERMANENT EMPLOYMENT';
      opening = `Subsequent to the satisfactory completion of your probationary evaluation period, we have the pleasure to confirm your services as a permanent employee of {COMPANY_NAME} with effect from this date.`;
      body = `All terms and conditions specified in your initial appointment covenant remain in full force. Your designated role remains {DESIGNATION} in {DEPARTMENT}.`;
      closing = `We appreciate your dedication and look forward to your continued growth and leadership within the organization.`;
    } else if (templateType === 'BONAFIDE') {
      customTitle = 'BONAFIDE EMPLOYMENT CERTIFICATE';
      opening = `This certificate is issued at the request of {EMPLOYEE_NAME} (Roll No: {ROLL_NO}) to confirm that they are currently employed on a full-time, regular active status as {DESIGNATION} with {COMPANY_NAME}.`;
      body = `This letter is issued specifically for personal verification purposes (such as banking facilities, residential address proof, or passport verification).`;
      closing = `This document carries zero financial liability for the issuing organization.`;
    }

    setLetterModalData({
      title: templateTitle,
      letterType: templateType,
      employee: defaultEmp,
      referenceNo: `NH/2026/${templateType.substring(0, 4)}/${randomSuffix}`,
      customTitle,
      issueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      openingParagraph: opening,
      bodyParagraph: body,
      closingParagraph: closing,
      signatoryName: 'Aditya Singhania',
      signatoryTitle: 'Authorized Signatory · Managing Director',
      showLogo: true,
      logoUrl: '/logo.png',
      showSignature: true,
    });
    setIsEditingLetter(false);
    setShowLetterModal(true);
  }

  function renderDynamicLetterText(templateString) {
    if (!templateString) return '';
    const emp = letterModalData.employee;
    const clientName = selectedClient?.name || 'Company';
    return templateString
      .replace(/{EMPLOYEE_NAME}/g, emp?.name || 'Rahul Sharma')
      .replace(/{ROLL_NO}/g, emp?.roll_no || 'EMP-1002')
      .replace(/{DESIGNATION}/g, emp?.designation || 'Specialist')
      .replace(/{DEPARTMENT}/g, emp?.department || 'Operations')
      .replace(/{COMPANY_NAME}/g, clientName)
      .replace(/{JOIN_DATE}/g, emp?.start_date ? new Date(emp.start_date).toLocaleDateString() : 'immediate effect');
  }

  function handlePrintLetter() {
    if (!letterPrintRef.current) return;
    const empCode = letterModalData.employee?.roll_no || 'Document';
    printElement(letterPrintRef.current, `Letter_${letterModalData.letterType}_${empCode}`);
  }

  async function handleSaveLetter() {
    if (!letterModalData.employee) return toast.error('Please select an employee for the letter');
    setActionLoading(true);
    try {
      await hrService.issueLetter(clientId, {
        employee_id: letterModalData.employee.id,
        letter_type: letterModalData.letterType,
        reference_no: letterModalData.referenceNo,
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

  // ─── FILTERED EMPLOYEES & ASSETS ─────────────────────────────────────────────
  const filteredEmployees = (hierarchyData.employees.length ? hierarchyData.employees : clientEmployees).filter((emp) => {
    const matchesSearch =
      !employeeSearch ||
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      (emp.roll_no && emp.roll_no.toLowerCase().includes(employeeSearch.toLowerCase())) ||
      (emp.designation && emp.designation.toLowerCase().includes(employeeSearch.toLowerCase()));
    const matchesDept =
      selectedDeptFilter === 'ALL' || (emp.department || 'General') === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const filteredAssets = assets.filter((asset) => {
    if (assetFilter === 'ASSIGNED') return asset.status === 'ASSIGNED';
    if (assetFilter === 'RETURNED') return asset.status === 'RETURNED';
    return true;
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
              Coordinate attendance ledgers, hardware custody, reporting chains, and statutory letters with 100% tenant isolation.
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

        {/* Hardware Assets Custody (REPLACED KYC) */}
        <div className="hr-pulse-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>Hardware Asset Custody</span>
            <span style={{ color: '#10B981', fontWeight: 800 }}>⚡ Active</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
            {assets.filter(a => a.status === 'ASSIGNED').length} Assigned
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {assets.length} total registered workstations & devices
          </div>
        </div>

        {/* Official Letters Issued */}
        <div className="hr-pulse-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>Statutory Letters Issued</span>
            <span style={{ color: '#7C3AED' }}>🗂️ Registry</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>
            {issuedLetters.length} Letters
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Formal certificates with digital authentication
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
          onClick={() => setActiveTab('assets')}
          className={`hr-tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
        >
          <Laptop size={16} />
          2. Hardware & Asset Custody
          {assets.filter(a => a.status === 'ASSIGNED').length > 0 && (
            <span style={{ fontSize: 11, background: '#059669', color: '#FFF', padding: '2px 6px', borderRadius: 9999, fontWeight: 800 }}>
              {assets.filter(a => a.status === 'ASSIGNED').length}
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
      {/* MODULE 2: HARDWARE ASSET & DEVICE CUSTODY (REPLACED KYC) */}
      {/* =================================================================== */}
      {activeTab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Actions & Sub-heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
                Hardware Asset Custody & Laptop Allocation
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Official serial number registry, asset tag tracking, and return clearance protocols for distributed staff.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowAssetModal(true)}
                className="btn btn-primary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Laptop size={16} /> + Assign Hardware Device
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setAssetFilter('ALL')}
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                padding: '5px 14px',
                borderRadius: 9999,
                fontWeight: assetFilter === 'ALL' ? 800 : 500,
                backgroundColor: assetFilter === 'ALL' ? 'var(--accent)' : 'var(--bg-surface)',
                color: assetFilter === 'ALL' ? '#FFF' : 'var(--text-secondary)',
              }}
            >
              All Assets ({assets.length})
            </button>
            <button
              onClick={() => setAssetFilter('ASSIGNED')}
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                padding: '5px 14px',
                borderRadius: 9999,
                fontWeight: assetFilter === 'ASSIGNED' ? 800 : 500,
                backgroundColor: assetFilter === 'ASSIGNED' ? 'var(--accent)' : 'var(--bg-surface)',
                color: assetFilter === 'ASSIGNED' ? '#FFF' : 'var(--text-secondary)',
              }}
            >
              Active Assigned ({assets.filter(a => a.status === 'ASSIGNED').length})
            </button>
            <button
              onClick={() => setAssetFilter('RETURNED')}
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                padding: '5px 14px',
                borderRadius: 9999,
                fontWeight: assetFilter === 'RETURNED' ? 800 : 500,
                backgroundColor: assetFilter === 'RETURNED' ? 'var(--accent)' : 'var(--bg-surface)',
                color: assetFilter === 'RETURNED' ? '#FFF' : 'var(--text-secondary)',
              }}
            >
              Returned ({assets.filter(a => a.status === 'RETURNED').length})
            </button>
          </div>

          {/* Hardware Assets Registry Table */}
          <div className="card" style={{ padding: 24 }}>
            {filteredAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Laptop size={40} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  No Hardware Devices Found
                </div>
                <p style={{ fontSize: 13, maxWidth: 420, margin: '0 auto 16px' }}>
                  Assign company workstations, MacBooks, and peripherals to onboarded team members to keep track of custody.
                </p>
                <button
                  onClick={() => setShowAssetModal(true)}
                  className="btn btn-primary"
                  style={{ fontSize: 12.5 }}
                >
                  + Assign First Hardware Asset
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Asset Model & Specification</th>
                      <th>Asset Tag / Serial Number</th>
                      <th>Assigned Date</th>
                      <th>Custody Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {asset.employee?.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {asset.employee?.roll_no} · {asset.employee?.department || 'General'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>
                            {asset.asset_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Company Workstation Asset
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 11.5,
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--accent-light, var(--text-primary))',
                                fontWeight: 700,
                              }}
                            >
                              {asset.asset_tag || 'NO-TAG'}
                            </span>
                            {asset.serial_number && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                SN: {asset.serial_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {new Date(asset.assigned_date || asset.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: 9999,
                              backgroundColor: asset.status === 'ASSIGNED' ? '#E6F4EA' : '#F1F5F9',
                              color: asset.status === 'ASSIGNED' ? '#065F46' : '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: asset.status === 'ASSIGNED' ? '#10B981' : '#94A3B8' }} />
                            {asset.status === 'ASSIGNED' ? 'ACTIVE CUSTODY' : 'RETURNED'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {asset.status === 'ASSIGNED' ? (
                            <button
                              onClick={() => handleUpdateAssetStatus(asset.id, 'RETURNED')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 11.5, fontWeight: 700 }}
                            >
                              Log Device Return
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Returned {asset.returned_date ? new Date(asset.returned_date).toLocaleDateString() : 'on record'}
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
              All Departments ({filteredEmployees.length})
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
                  Enforced organizational compliance guidelines and downloadable employee handbooks.
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
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>📄</span> {policy.title}
                      <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--accent)', fontWeight: 700 }}>
                        {policy.category}
                      </span>
                      {policy.file_url && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Paperclip size={12} /> {policy.file_url}
                        </span>
                      )}
                    </div>
                    {policy.summary && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {policy.summary}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={() => toast.success(`Downloading policy: ${policy.file_url || policy.title}`)}
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Download size={12} /> Download PDF
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
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div
            className="modal"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.3)',
              padding: '24px 28px',
              maxWidth: 500,
              width: '100%',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)' }}>Submit Leave Request</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Log paid or unpaid time off</p>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Target Employee *
                </label>
                <select
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Target Employee --</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Leave Type *
                </label>
                <select
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: 'var(--text-primary)',
                      width: '100%',
                      fontSize: '13px',
                    }}
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: 'var(--text-primary)',
                      width: '100%',
                      fontSize: '13px',
                    }}
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Total Working Days *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  value={leaveForm.total_days}
                  onChange={(e) => setLeaveForm({ ...leaveForm, total_days: parseFloat(e.target.value) || 1 })}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Reason / Notes
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Family wedding, viral infection recovery..."
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
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
      {/* MODAL 2: ASSIGN HARDWARE ASSET */}
      {/* =================================================================== */}
      {showAssetModal && (
        <div className="modal-overlay" onClick={() => setShowAssetModal(false)}>
          <div
            className="modal"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.3)',
              padding: '24px 28px',
              maxWidth: 500,
              width: '100%',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)' }}>Assign Workstation Hardware Asset</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Allocate laptop or device to an employee</p>
              </div>
              <button
                onClick={() => setShowAssetModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignAsset}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Target Employee *
                </label>
                <select
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  value={assetForm.employee_id}
                  onChange={(e) => setAssetForm({ ...assetForm, employee_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Target Employee --</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Asset Model & Name *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  placeholder="e.g. Apple MacBook Pro 14 M3, Dell Latitude 5440"
                  value={assetForm.asset_name}
                  onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Asset Tag (Internal)
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: 'var(--text-primary)',
                      width: '100%',
                      fontSize: '13px',
                    }}
                    placeholder="e.g. NH-MBP-088"
                    value={assetForm.asset_tag}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_tag: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: 'var(--text-primary)',
                      width: '100%',
                      fontSize: '13px',
                    }}
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
      {/* MODAL 3: LETTERHEAD STUDIO (PRINTABLE & EDITABLE) */}
      {/* =================================================================== */}
      {showLetterModal && (
        <div className="modal-overlay" onClick={() => setShowLetterModal(false)}>
          <div
            className="modal"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
              padding: '24px 28px',
              maxWidth: 780,
              width: '100%',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Official Document Studio
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
                  {letterModalData.title}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingLetter(!isEditingLetter)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: isEditingLetter ? 'var(--accent)' : 'var(--bg-surface)',
                    color: isEditingLetter ? '#FFF' : 'var(--text-primary)',
                  }}
                >
                  <Edit3 size={14} />
                  {isEditingLetter ? 'Preview Letterhead' : 'Edit Letter Format'}
                </button>
                <button
                  onClick={() => setShowLetterModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Target Employee & Document Controls Bar */}
            <div
              style={{
                marginBottom: 18,
                background: 'var(--bg-elevated)',
                padding: '14px 16px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  Target Employee:
                </label>
                <select
                  className="input"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    height: 38,
                    fontSize: 13,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                  value={letterModalData.employee?.id || ''}
                  onChange={(e) => {
                    const emp = clientEmployees.find((x) => x.id === e.target.value);
                    setLetterModalData({ ...letterModalData, employee: emp || null });
                  }}
                >
                  <option value="">-- Select Target Employee --</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no} · {emp.designation || 'Staff'} · {emp.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles for Logo & Digital Signature */}
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={letterModalData.showLogo}
                    onChange={(e) => setLetterModalData({ ...letterModalData, showLogo: e.target.checked })}
                    style={{ accentColor: '#023326' }}
                  />
                  Show Company Logo
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={letterModalData.showSignature}
                    onChange={(e) => setLetterModalData({ ...letterModalData, showSignature: e.target.checked })}
                    style={{ accentColor: '#023326' }}
                  />
                  Include Digital Signature & Seal
                </label>

                <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Ref: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{letterModalData.referenceNo}</strong>
                </div>
              </div>
            </div>

            {/* If in Format Edit Mode: show fields to customize */}
            {isEditingLetter ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: 18,
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={14} color="#10B981" /> Custom Company Format Editor
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Letter Reference Number
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={letterModalData.referenceNo}
                      onChange={(e) => setLetterModalData({ ...letterModalData, referenceNo: e.target.value })}
                      style={{ fontSize: 12.5, padding: '7px 10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Document Heading / Subject
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={letterModalData.customTitle}
                      onChange={(e) => setLetterModalData({ ...letterModalData, customTitle: e.target.value })}
                      style={{ fontSize: 12.5, padding: '7px 10px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Opening Paragraph (Use placeholders: <code>{'{EMPLOYEE_NAME}'}</code>, <code>{'{ROLL_NO}'}</code>, <code>{'{DESIGNATION}'}</code>, <code>{'{DEPARTMENT}'}</code>)
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={letterModalData.openingParagraph}
                    onChange={(e) => setLetterModalData({ ...letterModalData, openingParagraph: e.target.value })}
                    style={{ fontSize: 12, padding: '8px 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Body Clauses / Terms
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={letterModalData.bodyParagraph}
                    onChange={(e) => setLetterModalData({ ...letterModalData, bodyParagraph: e.target.value })}
                    style={{ fontSize: 12, padding: '8px 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Closing Remarks
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={letterModalData.closingParagraph}
                    onChange={(e) => setLetterModalData({ ...letterModalData, closingParagraph: e.target.value })}
                    style={{ fontSize: 12, padding: '8px 10px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Signatory Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={letterModalData.signatoryName}
                      onChange={(e) => setLetterModalData({ ...letterModalData, signatoryName: e.target.value })}
                      style={{ fontSize: 12.5, padding: '7px 10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Signatory Designation / Title
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={letterModalData.signatoryTitle}
                      onChange={(e) => setLetterModalData({ ...letterModalData, signatoryTitle: e.target.value })}
                      style={{ fontSize: 12.5, padding: '7px 10px' }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Letterhead Body Preview (Printable Target) */}
            <div
              ref={letterPrintRef}
              style={{
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '36px 42px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: 14,
                lineHeight: 1.6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                maxHeight: '480px',
                overflowY: 'auto',
              }}
            >
              {/* Official Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '2.5px solid #023326',
                  paddingBottom: 16,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {letterModalData.showLogo && (
                    <img
                      src={letterModalData.logoUrl || '/logo.png'}
                      alt="Company Logo"
                      style={{ height: 42, width: 'auto', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#023326', fontFamily: 'sans-serif', letterSpacing: '0.02em' }}>
                      {selectedClient?.name?.toUpperCase() || 'CORPORATE CLIENT ENTITY'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'sans-serif', marginTop: 2 }}>
                      Managed via Ploy.pe by NH Associates · CIN: U72900HR2022PTC099120
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                  <strong>Ref:</strong> {letterModalData.referenceNo}<br />
                  <strong>Date:</strong> {letterModalData.issueDate}
                </div>
              </div>

              {/* Title */}
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  fontSize: 15,
                  textDecoration: 'underline',
                  marginBottom: 22,
                  fontFamily: 'sans-serif',
                  color: '#0F172A',
                  letterSpacing: '0.04em',
                }}
              >
                {letterModalData.customTitle}
              </div>

              {/* Opening */}
              <p style={{ marginBottom: 14, textAlign: 'justify' }}>
                {renderDynamicLetterText(letterModalData.openingParagraph)}
              </p>

              {/* Body Paragraph */}
              <p style={{ marginBottom: 14, textAlign: 'justify' }}>
                {renderDynamicLetterText(letterModalData.bodyParagraph)}
              </p>

              {/* Closing */}
              <p style={{ marginBottom: 28, textAlign: 'justify' }}>
                {renderDynamicLetterText(letterModalData.closingParagraph)}
              </p>

              {/* Signatory Footer */}
              {letterModalData.showSignature && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginTop: 36,
                    paddingTop: 12,
                    fontFamily: 'sans-serif',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Brush Script MT', cursive, sans-serif",
                        fontSize: 24,
                        color: '#023326',
                        marginBottom: 4,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {letterModalData.signatoryName}
                    </div>
                    <div style={{ fontWeight: 800, color: '#023326', fontSize: 13 }}>
                      {letterModalData.signatoryName}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      {letterModalData.signatoryTitle}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                      {selectedClient?.name || 'NH Associates'}
                    </div>
                  </div>

                  <div
                    style={{
                      border: '2px dashed #059669',
                      borderRadius: 8,
                      padding: '8px 16px',
                      textAlign: 'center',
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      ★ DIGITAL CORPORATE SEAL ★
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                      {selectedClient?.name || 'PEREGRINE'}
                    </div>
                    <div style={{ fontSize: 8.5, color: '#047857' }}>
                      VERIFIED & AUTHENTICATED
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => setShowLetterModal(false)} className="btn btn-secondary">
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintLetter}
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
      {/* MODAL 4: PUBLISH COMPANY POLICY */}
      {/* =================================================================== */}
      {showPolicyModal && (
        <div className="modal-overlay" onClick={() => setShowPolicyModal(false)}>
          <div
            className="modal"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.3)',
              padding: '24px 28px',
              maxWidth: 520,
              width: '100%',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)' }}>Publish Company Policy</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Add organizational compliance handbook</p>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Policy Title *
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  placeholder="e.g. PoSH Compliance Guideline 2026"
                  value={policyForm.title}
                  onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Category *
                </label>
                <select
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  value={policyForm.category}
                  onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                >
                  <option value="GENERAL">General Code of Conduct</option>
                  <option value="COMPLIANCE">Compliance & Statutory Guidelines</option>
                  <option value="LEAVE">Leave & Attendance Policy</option>
                  <option value="REMOTE_WORK">Remote Work & Asset Protection</option>
                  <option value="CUSTOM">+ Add New Custom Category...</option>
                </select>

                {policyForm.category === 'CUSTOM' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Custom Category Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'var(--text-primary)',
                        width: '100%',
                        fontSize: '13px',
                      }}
                      placeholder="e.g. Information Security, Travel & Expense..."
                      value={policyForm.customCategory}
                      onChange={(e) => setPolicyForm({ ...policyForm, customCategory: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Attach Policy Document / Handbook
                </label>
                <input
                  type="text"
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  placeholder="e.g. PoSH_Handbook_2026.pdf or document file name"
                  value={policyForm.file_url}
                  onChange={(e) => setPolicyForm({ ...policyForm, file_url: e.target.value })}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Reference document file name or link for employee handbook download.
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Summary / Overview
                </label>
                <textarea
                  className="input"
                  rows={3}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
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
      {/* MODAL 5: UPDATE REPORTING LINE */}
      {/* =================================================================== */}
      {showManagerModal && (
        <div className="modal-overlay" onClick={() => setShowManagerModal(false)}>
          <div
            className="modal"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.3)',
              padding: '24px 28px',
              maxWidth: 500,
              width: '100%',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)' }}>Update Reporting Hierarchy Line</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Set or reassign manager for employee</p>
              </div>
              <button
                onClick={() => setShowManagerModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateManager}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Target Employee *
                </label>
                <select
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
                  value={managerForm.employeeId}
                  onChange={(e) => setManagerForm({ ...managerForm, employeeId: e.target.value })}
                  required
                >
                  <option value="">-- Select Target Employee --</option>
                  {clientEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.roll_no} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Reporting Manager
                </label>
                <select
                  className="input"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '13px',
                  }}
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
