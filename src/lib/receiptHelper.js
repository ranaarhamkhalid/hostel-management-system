import { fmtDate, formatMoney } from './utils';

export const printReceipt = (db, data, type = 'invoice') => {
  const r = db.residents.find(res => res.id === data.resident_id);
  if (!r) return;
  
  const isInvoice = type === 'invoice';
  const docTitle = isInvoice ? "INVOICE / BILL" : "PAYMENT RECEIPT";
  const id = data.id.slice(0, 8).toUpperCase();
  const dateStr = isInvoice ? new Date().toLocaleDateString() : fmtDate(data.date);

  // Helper to get room number
  const getRoomNum = () => {
     const seat = db.seats.find(s => s.resident_id === r.id);
     if (seat) {
       const room = db.rooms.find(rm => rm.id === seat.room_id);
       return room ? room.number : "?";
     }
     if (db.residentHistory) {
         const lastHist = db.residentHistory.filter(h => h.resident_id === r.id).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
         return lastHist ? lastHist.room_number : "?";
     }
     return "?";
  };
  const roomNum = getRoomNum();

  // Prepare Invoice Data
  const monthLabel = isInvoice && data.month === "Security Deposit" ? "Type" : "Month";
  const monthValue = isInvoice ? data.month : "";

  const w = window.open('', '_blank');
  
  const css = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; background: #f9f9f9; -webkit-print-color-adjust: exact; }
    .page-container { max-width: 800px; margin: 0 auto; background: white; }
    .receipt-box { border: 2px solid #333; padding: 25px; margin-bottom: 30px; position: relative; background: #fff; }
    .cut-line { border-top: 2px dashed #999; margin: 30px 0; position: relative; height: 1px; }
    .cut-line::after { content: '✂ Cut Here'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; color: #777; font-size: 12px; }
    
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
    .brand h1 { margin: 0; font-size: 24px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
    .brand .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
    
    .meta { text-align: right; }
    .copy-badge { display: inline-block; background: #333; color: #fff; padding: 4px 8px; font-size: 10px; text-transform: uppercase; font-weight: bold; border-radius: 4px; margin-bottom: 8px; }
    .meta-row { font-size: 13px; margin-bottom: 4px; }
    
    .grid { display: flex; gap: 30px; margin-bottom: 20px; }
    .col { flex: 1; }
    .box-title { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .info-row { font-size: 13px; margin-bottom: 4px; display: flex; }
    .info-row strong { width: 80px; color: #555; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600; color: #444; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .right { text-align: right; }
    .total-row td { font-weight: 700; border-top: 2px solid #ddd; }
    .grand-total td { font-size: 16px; font-weight: 800; background: #f1f5f9; border-bottom: none; }
    
    .footer { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .sig-box { text-align: center; width: 200px; }
    .sig-line { border-top: 1px solid #333; padding-top: 8px; font-size: 12px; font-weight: 600; }
    
    .system-note { font-size: 10px; color: #999; text-align: center; margin-top: 20px; }
    
    @media print { 
      body { padding: 0; background: white; }
      .page-container { max-width: 100%; }
      .receipt-box { border: 2px solid #000; break-inside: avoid; }
      .no-print { display: none; }
    }
  `;

  const getTemplate = (copyName) => `
    <div class="receipt-box">
      <div class="header">
        <div class="brand">
          <h1>HostelPro</h1>
          <div class="subtitle">Management System</div>
        </div>
        <div class="meta">
          <div class="copy-badge">${copyName}</div>
          <div class="meta-row"><strong>${docTitle} #</strong> ${id}</div>
          <div class="meta-row"><strong>Date:</strong> ${dateStr}</div>
        </div>
      </div>

      <div class="grid">
        <div class="col">
          <div class="box-title">Student Details</div>
          <div class="info-row"><strong>Name:</strong> <span>${r.name}</span></div>
          <div class="info-row"><strong>Phone:</strong> <span>${r.phone || 'N/A'}</span></div>
          <div class="info-row"><strong>CNIC:</strong> <span>${r.cnic || 'N/A'}</span></div>
          <div class="info-row"><strong>Room:</strong> <span>${roomNum}</span></div>
        </div>
        <div class="col">
          <div class="box-title">Transaction Info</div>
          ${isInvoice ? `
            <div class="info-row"><strong>${monthLabel}:</strong> <span>${monthValue}</span></div>
            <div class="info-row"><strong>Status:</strong> <span>${data.status}</span></div>
          ` : `
            <div class="info-row"><strong>Method:</strong> <span>${data.method}</span></div>
            <div class="info-row"><strong>Notes:</strong> <span>${data.notes || '-'}</span></div>
          `}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${isInvoice ? `
            ${data.room_rent > 0 ? `<tr><td>Monthly Room Rent</td><td class="right">${formatMoney(data.room_rent)}</td></tr>` : ''}
            ${data.mess_total > 0 ? `<tr><td>Mess Charges</td><td class="right">${formatMoney(data.mess_total)}</td></tr>` : ''}
            ${data.custom_total > 0 ? `<tr><td>Utilities / Other</td><td class="right">${formatMoney(data.custom_total)}</td></tr>` : ''}
            ${data.prev_dues > 0 ? `<tr><td>Previous Dues Arrears</td><td class="right">${formatMoney(data.prev_dues)}</td></tr>` : ''}
            <tr class="total-row"><td>Total Payable</td><td class="right">${formatMoney(data.total_due)}</td></tr>
            <tr><td>Amount Paid</td><td class="right">(${formatMoney(data.amount_paid)})</td></tr>
            <tr class="grand-total"><td>Balance Due</td><td class="right">${formatMoney((Number(data.total_due)||0) - (Number(data.amount_paid)||0))}</td></tr>
          ` : `
            <tr><td>Payment Received (${data.method})</td><td class="right">${formatMoney(data.amount)}</td></tr>
            <tr class="grand-total"><td>Total Received</td><td class="right">${formatMoney(data.amount)}</td></tr>
          `}
        </tbody>
      </table>

      <div class="footer">
        <div class="sig-box">
          <div class="sig-line">Manager Signature</div>
        </div>
        <div class="sig-box">
          <div class="sig-line">Student Signature</div>
        </div>
      </div>
      <div class="system-note">Generated by HostelPro System • ${new Date().toLocaleString()}</div>
    </div>
  `;

  w.document.write(`
    <html>
      <head>
        <title>${docTitle} #${id}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="page-container">
          ${getTemplate("STUDENT COPY")}
          <div class="cut-line"></div>
          ${getTemplate("HOSTEL COPY")}
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  w.document.close();
};
