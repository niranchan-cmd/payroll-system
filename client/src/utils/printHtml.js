/**
 * Universal Print & PDF Export Utility
 * Renders payslips or reports into an isolated printable iframe/window
 * ensuring 100% crisp, full-bleed PDF generation with NO empty pages or style clipping.
 */

export function printElement(element, title = 'Payslip') {
  if (!element) {
    window.print();
    return;
  }

  // Create an isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  // Collect all stylesheet links and embedded style tags from the current document
  let styles = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    styles += node.outerHTML;
  });

  // Inline fallback CSS specifically tailored for printable documents
  const printCSS = `
    <style>
      @page {
        size: A4 portrait;
        margin: 12mm 15mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 12.5px;
      }
      .no-print {
        display: none !important;
      }
      .payslip-page-wrapper {
        page-break-after: always;
        break-after: page;
        margin-bottom: 0;
        padding: 0;
      }
      .payslip-page-wrapper:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .payslip-box {
        border: 2px solid #0f172a !important;
        border-radius: 6px !important;
        padding: 24px !important;
        background: #ffffff !important;
        color: #0f172a !important;
        box-shadow: none !important;
      }
      .payslip-header {
        text-align: center;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 14px;
        margin-bottom: 16px;
      }
      .payslip-client-title {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
      }
      .payslip-client-sub {
        font-size: 11.5px;
        color: #475569;
        margin-top: 2px;
      }
      .payslip-doc-badge {
        display: inline-block;
        background: #0f172a !important;
        color: #ffffff !important;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.08em;
        padding: 4px 16px;
        border-radius: 4px;
        margin-top: 10px;
      }
      .payslip-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 24px;
        background: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 16px;
        font-size: 12.5px;
      }
      .payslip-info-row {
        display: flex;
        justify-content: space-between;
        padding: 2px 0;
      }
      .payslip-info-label {
        color: #64748b;
        font-weight: 500;
      }
      .payslip-info-val {
        color: #0f172a;
      }
      .payslip-table-wrapper {
        margin-bottom: 14px;
      }
      .payslip-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12.5px;
      }
      .payslip-table th, .payslip-table td {
        border: 1px solid #cbd5e1 !important;
        padding: 7px 12px;
      }
      .payslip-th {
        background: #e2e8f0 !important;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.05em;
        color: #0f172a !important;
        text-align: center;
      }
      .payslip-subth th {
        background: #f8fafc !important;
        color: #475569 !important;
        font-size: 11.5px;
        font-weight: 700;
      }
      .payslip-tfoot-row td {
        background: #f1f5f9 !important;
        font-size: 13px;
        color: #0f172a !important;
        border-top: 2px solid #0f172a !important;
      }
      .payslip-net-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ecfdf5 !important;
        border: 2px solid #10b981 !important;
        border-radius: 6px;
        padding: 12px 18px;
        margin-bottom: 14px;
      }
      .payslip-net-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .payslip-net-label {
        font-size: 11.5px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #065f46 !important;
      }
      .payslip-net-words {
        font-size: 13px;
        font-weight: 600;
        color: #047857 !important;
      }
      .payslip-net-amount {
        font-size: 24px;
        font-weight: 900;
        color: #065f46 !important;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      .payslip-employer-box {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 4px;
        padding: 8px 14px;
        font-size: 11.5px;
        color: #334155 !important;
        margin-bottom: 14px;
      }
      .payslip-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0 !important;
        font-size: 11px;
        color: #64748b !important;
      }
    </style>
  `;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styles}
        ${printCSS}
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Wait for styles and fonts to paint, then trigger print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Clean up iframe after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 350);
}
