import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Properly parse full CSV content handling multi-line quoted fields
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let cur = '';
  let inQuotes = false;
  // Strip BOM if present
  let i = content.charCodeAt(0) === 0xFEFF ? 1 : 0;
  
  for (; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      // Handle escaped double quote ""
      if (inQuotes && content[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(cur.trim());
      cur = '';
    } else if ((c === '\n' || (c === '\r' && content[i + 1] === '\n')) && !inQuotes) {
      if (c === '\r') i++; // skip \n of \r\n
      currentRow.push(cur.trim());
      if (currentRow.some(v => v)) rows.push(currentRow);
      currentRow = [];
      cur = '';
    } else if (c === '\r' && !inQuotes) {
      // bare CR
      currentRow.push(cur.trim());
      if (currentRow.some(v => v)) rows.push(currentRow);
      currentRow = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  // last row
  currentRow.push(cur.trim());
  if (currentRow.some(v => v)) rows.push(currentRow);
  return rows;
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

async function importRegistrations(csvFilePath) {
  console.log(`Reading CSV from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvFilePath, 'utf8');
  const rows = parseCSV(content);
  if (rows.length < 2) {
    console.error('CSV file has no data rows.');
    process.exit(1);
  }

  const headers = rows[0].map(h => h.replace(/^[\uFEFF"]+|"+$/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  console.log('Detected Headers:', headers);
  console.log('Total data rows:', rows.length - 1);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (!values || values.length === 0 || values.every(v => !v)) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const uhid = row['registrationno'] || row['uhid'] || row['regno'] || `UHID-OLD-${i}`;
    let rawName = row['patientname'] || row['fullname'] || row['name'] || 'Unknown Patient';
    
    let title = 'Mr.';
    const titleMatch = rawName.match(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+/i);
    if (titleMatch) {
      const t = titleMatch[1];
      title = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      rawName = rawName.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+/i, '').trim();
    }

    const nameParts = rawName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'Patient';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const gender = row['gender'] || 'Male';
    const mobile = row['mobileno'] || row['mobile'] || row['phone'] || '0000000000';
    const address = row['address'] || 'N/A';
    const state = row['statename'] || row['state'] || 'New Delhi';
    const districtCity = row['cityname'] || row['city'] || 'NEW DELHI';
    const pinCode = row['localpin'] || row['pincode'] || null;
    const country = row['countryname'] || row['country'] || 'India';

    const dob = parseDate(row['dateofbirth'] || row['dob']);
    const regDate = parseDate(row['encodeddate'] || row['regdate']) || new Date();
    
    let age = null;
    if (row['ageyear'] || row['age']) {
      const parsedAge = parseInt(String(row['ageyear'] || row['age']).replace(/\D/g, ''), 10);
      if (!isNaN(parsedAge)) age = parsedAge;
    }

    const payer = row['companyname'] || row['company'] || 'CASH';
    const payerType = row['companytype'] || row['payertype'] || 'Cash Paying';
    const referredBy = row['doctorname'] || row['doctor'] || null;
    const guardianName = `${firstName}'s Guardian`;
    const maritalStatus = row['maritalstatus'] || null;
    const email = row['email'] || null;
    const nationality = row['nationalityname'] || row['nationality'] || 'Indian';
    const occupation = row['occupation'] || null;
    const leadSource = row['leadsource'] || null;
    const area = row['areaname'] || row['area'] || null;
    const isVip = (row['vip'] || '').toLowerCase() === 'yes';

    try {
      await prisma.patient.upsert({
        where: { uhid },
        update: {
          title,
          firstName,
          lastName,
          fullName,
          gender,
          maritalStatus,
          email,
          nationality,
          occupation,
          leadSource,
          area,
          isVip,
          mobile,
          address,
          state,
          districtCity,
          pinCode,
          country,
          dob,
          regDate,
          age,
          payer,
          payerType,
          referredBy,
        },
        create: {
          registrationType: 'Legacy Import',
          uhid,
          title,
          firstName,
          lastName,
          fullName,
          gender,
          maritalStatus,
          email,
          nationality,
          occupation,
          leadSource,
          area,
          isVip,
          mobile,
          address,
          state,
          districtCity,
          pinCode,
          country,
          dob,
          regDate,
          age,
          guardianName,
          guardianRelation: 'Self',
          payer,
          payerType,
          referredBy,
        },
      });
      successCount++;
    } catch (err) {
      console.error(`Error importing row ${i} (${uhid}):`, err.message);
      skipCount++;
    }
  }

  console.log(`\nImport Summary:`);
  console.log(`- Successfully inserted/updated: ${successCount} patients`);
  console.log(`- Skipped/Errors: ${skipCount}`);
  await prisma.$disconnect();
}

const targetFile = process.argv[2] || '/home/srisir/Downloads/cmk_clinic_data/Registrations_list.csv';
importRegistrations(targetFile);
