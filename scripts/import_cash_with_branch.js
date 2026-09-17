import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRANCH_NAME = "CMK HEALTHCARE PVT. LTD";

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

async function ensureBranch() {
  const existing = await prisma.masterOption.findFirst({
    where: {
      category: 'branches',
      value: BRANCH_NAME,
    },
  });

  if (!existing) {
    console.log(`Creating branch: ${BRANCH_NAME}`);
    await prisma.masterOption.create({
      data: {
        category: 'branches',
        value: BRANCH_NAME,
        sortOrder: 99,
      },
    });
    console.log(`✅ Branch created: ${BRANCH_NAME}`);
  } else {
    console.log(`✅ Branch already exists: ${BRANCH_NAME}`);
  }
}

async function importCashCollection(csvFilePath) {
  console.log(`Processing Cash Collection from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  await ensureBranch();

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
      if (parsed) {
        currentDate = parsed;
        console.log(`Processing date: ${dateMatch[1]}`);
      }
    }

    if (joined.includes('IPD Bill') || joined.includes('IP Bill') || joined.includes('IP')) {
      currentBillType = 'IP';
    } else if (joined.includes('OPD Bill') || joined.includes('OP Bill') || joined.includes('OPD')) {
      currentBillType = 'OP';
    }

    // Look for valid transaction rows - receipt number or bill number
    const receiptNo = values.find(v => /^(OPCA|IPCA|REC|INV|BILL)[A-Za-z0-9\/-]+/i.test(v));
    if (!receiptNo) continue;

    // Filter out header lines or summary lines
    if (receiptNo.includes('RECEIPT NO') || receiptNo.includes('BILL NO') || joined.includes('Total')) continue;

    // Find UHID
    const uhidIndex = values.findIndex(v => /^\d{1,8}$/.test(v) || /^UHID[- ]/i.test(v));
    let uhid = uhidIndex !== -1 ? values[uhidIndex] : null;

    // Find Patient Name
    let patientName = 'Unknown Patient';
    const nameIndex = values.findIndex(v => /^(Mr\.|Mrs\.|Ms\.|Dr\.)/i.test(v));
    if (nameIndex !== -1) {
      patientName = values[nameIndex];
    }

    // Find numerical amounts
    const amounts = values.filter(v => /^\d+(\.\d+)?$/.test(v)).map(Number);
    if (amounts.length === 0) continue;

    const billAmount = amounts[0] || 0;
    const amountCollected = amounts[amounts.length - 1] || billAmount;

    // Mode detection from the line
    let mode = 'Cash';
    const lowerJoined = joined.toLowerCase();
    if (lowerJoined.includes('online payment') || lowerJoined.includes('online') || lowerJoined.includes('upi')) {
      mode = 'UPI';
    } else if (lowerJoined.includes('card') || lowerJoined.includes('swipe')) {
      mode = 'Card';
    } else if (lowerJoined.includes('cheque')) {
      mode = 'Cheque';
    } else if (lowerJoined.includes('bank')) {
      mode = 'Bank Transfer';
    }

    const company = 'CASH';
    const invoiceNo = receiptNo; // Use receipt number as invoice number

    try {
      // Create or update invoice
      const invoice = await prisma.invoice.upsert({
        where: { invoiceNo },
        update: {
          encNo: `ENC-${invoiceNo}`,
          uhid: uhid || 'UNKNOWN',
          patientName,
          type: currentBillType,
          grossAmt: billAmount,
          netAmt: billAmount,
          paidPatient: amountCollected,
          balance: Math.max(0, billAmount - amountCollected),
          status: billAmount - amountCollected <= 0 ? 'Settled' : 'Outstanding',
          company: BRANCH_NAME,
          date: currentDate || new Date(),
        },
        create: {
          invoiceNo,
          encNo: `ENC-${invoiceNo}`,
          uhid: uhid || 'UNKNOWN',
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
          company: BRANCH_NAME,
          date: currentDate || new Date(),
        },
      });

      // Create associated payment receipt
      await prisma.receipt.create({
        data: {
          receiptNo: `REC-${invoiceNo}`,
          invoiceId: invoice.id,
          uhid: uhid || 'UNKNOWN',
          patientName,
          mode,
          amount: amountCollected,
          type: 'Settlement',
          createdAt: currentDate || new Date(),
        },
      });

      successCount++;
      if (successCount % 50 === 0) {
        console.log(`Progress: ${successCount} records imported...`);
      }
    } catch (err) {
      console.error(`Error importing bill ${invoiceNo}:`, err.message);
      skipCount++;
    }
  }

  console.log(`\n✨ Cash Collection Import Summary:`);
  console.log(`- Branch: ${BRANCH_NAME}`);
  console.log(`- Invoices & Receipts Created/Updated: ${successCount}`);
  console.log(`- Errors/Skipped: ${skipCount}`);

  await prisma.$disconnect();
}

const csvFile = process.argv[2] || '/home/srisir/Downloads/CashCollection.csv';
importCashCollection(csvFile);
