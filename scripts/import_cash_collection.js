import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

async function importCashCollection(csvFilePath) {
  console.log(`Processing Cash Collection from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvFilePath, 'utf8');
  const lines = content.split(/\r?\n/);

  let currentDate = null;
  let currentBillType = 'OP';
  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const values = parseCSVLine(rawLine).map(v => v.replace(/^"+|"+$/g, '').trim());

    // Check if line contains a date header like "30/01/2021"
    const joined = values.join(' ');
    const dateMatch = joined.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch && !joined.includes('From') && !joined.includes('Total')) {
      const parsed = parseDate(dateMatch[1]);
      if (parsed) currentDate = parsed;
    }

    if (joined.includes('IPD Bill') || joined.includes('IP Bill')) {
      currentBillType = 'IP';
    } else if (joined.includes('OPD Bill') || joined.includes('OP Bill')) {
      currentBillType = 'OP';
    }

    // Look for valid transaction rows
    // Columns layout based on exported report structure:
    // values containing bill number e.g. OPCA20-21/1, UHID, Patient Name, Bill Amount, Amount Collected, Mode
    const invoiceNo = values.find(v => /^(OP|IP|REC|INV|BILL|OPCA|IPCA)[A-Za-z0-9\/-]+/i.test(v));
    if (!invoiceNo) continue;

    // Filter out header lines or summary lines
    if (invoiceNo.includes('RECEIPT NO') || invoiceNo.includes('BILL NO')) continue;

    // Find UHID (numeric or UHID- string)
    const uhidIndex = values.findIndex(v => /^\d{1,8}$/.test(v) || /^UHID-/i.test(v));
    let uhid = uhidIndex !== -1 ? values[uhidIndex] : 'UNKNOWN';

    // Find Patient Name
    let patientName = 'Unknown Patient';
    const nameIndex = values.findIndex(v => /^(Mr\.|Mrs\.|Ms\.|Dr\.)/i.test(v));
    if (nameIndex !== -1) {
      patientName = values[nameIndex];
    }

    // Find numerical amounts
    const amounts = values.filter(v => /^\d+(\.\d+)?$/.test(v)).map(Number);
    if (amounts.length === 0) continue;

    const billAmount = amounts[amounts.length - 2] || amounts[0];
    const amountCollected = amounts[amounts.length - 1] || billAmount;

    // Mode detection
    let mode = 'Cash';
    if (joined.toLowerCase().includes('line payment') || joined.toLowerCase().includes('online') || joined.toLowerCase().includes('upi')) {
      mode = 'UPI';
    } else if (joined.toLowerCase().includes('card')) {
      mode = 'Card';
    } else if (joined.toLowerCase().includes('cheque')) {
      mode = 'Cheque';
    }

    const company = values[values.length - 1] || 'CASH';

    try {
      const invoice = await prisma.invoice.upsert({
        where: { invoiceNo },
        update: {
          encNo: `ENC-${invoiceNo}`,
          uhid,
          patientName,
          type: currentBillType,
          grossAmt: billAmount,
          netAmt: billAmount,
          paidPatient: amountCollected,
          balance: Math.max(0, billAmount - amountCollected),
          status: billAmount - amountCollected <= 0 ? 'Settled' : 'Outstanding',
          company,
          date: currentDate || new Date(),
        },
        create: {
          invoiceNo,
          encNo: `ENC-${invoiceNo}`,
          uhid,
          patientName,
          type: currentBillType,
          grossAmt: billAmount,
          netAmt: billAmount,
          paidPatient: amountCollected,
          paidPayer: 0,
          adjusted: 0,
          refund: 0,
          creditNote: 0,
          balance: Math.max(0, billAmount - amountCollected),
          status: billAmount - amountCollected <= 0 ? 'Settled' : 'Outstanding',
          company,
          date: currentDate || new Date(),
        },
      });

      // Create associated payment receipt
      await prisma.receipt.create({
        data: {
          receiptNo: `REC-${invoiceNo}`,
          invoiceId: invoice.id,
          uhid,
          patientName,
          mode,
          amount: amountCollected,
          type: 'Settlement',
          createdAt: currentDate || new Date(),
        },
      });

      successCount++;
    } catch (err) {
      console.error(`Error importing bill ${invoiceNo}:`, err.message);
      skipCount++;
    }
  }

  console.log(`\nCash Collection Import Summary:`);
  console.log(`- Invoices & Receipts Created/Updated: ${successCount}`);
  console.log(`- Errors/Skipped: ${skipCount}`);

  await prisma.$disconnect();
}

const csvFile = process.argv[2] || '/tmp/CashCollection (1).csv';
importCashCollection(csvFile);
