const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * POST /api/v1/leads
 * Public endpoint to submit callback inquiry
 */
async function createLead(req, res) {
  const { name, email, phone, company_name, team_size, notes } = req.body;

  if (!name || !email || !phone || !company_name) {
    return errorResponse(res, 'Name, email, phone number, and company are required.', 400);
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      company_name: company_name.trim(),
      team_size: team_size || '21-100',
      notes: notes || null,
      status: 'NEW',
    },
  });

  return successResponse(res, lead, 'Inquiry received. An advisor will contact you shortly.', 201);
}

/**
 * GET /api/v1/admin/leads
 * Admin-only: list all leads
 */
async function getLeads(req, res) {
  const leads = await prisma.lead.findMany({
    orderBy: { created_at: 'desc' },
  });
  return successResponse(res, leads);
}

/**
 * PATCH /api/v1/admin/leads/:id
 * Admin-only: update lead status
 */
async function updateLeadStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['NEW', 'CONTACTED', 'CONVERTED'];
  const updateData = {};
  if (status && validStatuses.includes(status)) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  return successResponse(res, updated, 'Lead status updated.');
}

module.exports = { createLead, getLeads, updateLeadStatus };
