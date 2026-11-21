import api from './api';

export const hrService = {
  getOverview: (clientId) => api.get(`/clients/${clientId}/hr/overview`),

  // Leaves & Attendance
  getLeaveBalances: (clientId, year) =>
    api.get(`/clients/${clientId}/hr/leaves/balances`, { params: { year } }),
  getLeaveRequests: (clientId, params = {}) =>
    api.get(`/clients/${clientId}/hr/leaves/requests`, { params }),
  createLeaveRequest: (clientId, data) =>
    api.post(`/clients/${clientId}/hr/leaves/requests`, data),
  updateLeaveStatus: (clientId, id, status) =>
    api.patch(`/clients/${clientId}/hr/leaves/requests/${id}/status`, { status }),
  getMonthlyLOP: (clientId, month, year) =>
    api.get(`/clients/${clientId}/hr/leaves/lop`, { params: { month, year } }),

  // Digital Onboarding & KYC Documents
  getDocuments: (clientId, params = {}) =>
    api.get(`/clients/${clientId}/hr/documents`, { params }),
  addDocument: (clientId, data) =>
    api.post(`/clients/${clientId}/hr/documents`, data),
  verifyDocument: (clientId, id, verification_status) =>
    api.patch(`/clients/${clientId}/hr/documents/${id}/verify`, { verification_status }),

  // Asset Assignment
  getAssets: (clientId, params = {}) =>
    api.get(`/clients/${clientId}/hr/assets`, { params }),
  assignAsset: (clientId, data) =>
    api.post(`/clients/${clientId}/hr/assets`, data),
  updateAssetStatus: (clientId, id, status) =>
    api.patch(`/clients/${clientId}/hr/assets/${id}/status`, { status }),

  // Org Directory & Reporting Hierarchy
  getOrgHierarchy: (clientId) =>
    api.get(`/clients/${clientId}/hr/hierarchy`),
  updateEmployeeManager: (clientId, employeeId, manager_id) =>
    api.patch(`/clients/${clientId}/hr/hierarchy/${employeeId}/manager`, { manager_id }),

  // Policies
  getPolicies: (clientId) =>
    api.get(`/clients/${clientId}/hr/policies`),
  createPolicy: (clientId, data) =>
    api.post(`/clients/${clientId}/hr/policies`, data),
  deletePolicy: (clientId, id) =>
    api.delete(`/clients/${clientId}/hr/policies/${id}`),

  // Letterhead Studio
  getIssuedLetters: (clientId, params = {}) =>
    api.get(`/clients/${clientId}/hr/letters`, { params }),
  issueLetter: (clientId, data) =>
    api.post(`/clients/${clientId}/hr/letters`, data),
};

export default hrService;
