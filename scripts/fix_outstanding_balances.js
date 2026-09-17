import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOutstandingBalances() {
  console.log('🔧 Starting to fix outstanding balances...');
  
  // Get all invoices from CMK HEALTHCARE PVT. LTD
  const invoices = await prisma.invoice.findMany({
    where: { company: 'CMK HEALTHCARE PVT. LTD' },
    include: {
      receipts: true
    }
  });
  
  console.log(`\nProcessing ${invoices.length} invoices...`);
  
  let fixedCount = 0;
  let alreadyCorrectCount = 0;
  
  for (const invoice of invoices) {
    // Calculate total paid from receipts
    const totalPaidFromReceipts = invoice.receipts.reduce((sum, receipt) => {
      return sum + receipt.amount;
    }, 0);
    
    // Calculate correct balance
    const correctBalance = Math.max(0, invoice.netAmt - totalPaidFromReceipts);
    const correctStatus = correctBalance === 0 ? 'Settled' : 'Outstanding';
    
    // Check if it needs updating
    if (invoice.paidPatient !== totalPaidFromReceipts || invoice.balance !== correctBalance || invoice.status !== correctStatus) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidPatient: totalPaidFromReceipts,
          balance: correctBalance,
          status: correctStatus
        }
      });
      fixedCount++;
      
      if (fixedCount % 100 === 0) {
        console.log(`  Progress: ${fixedCount} invoices fixed...`);
      }
    } else {
      alreadyCorrectCount++;
    }
  }
  
  console.log(`\n✨ Balance Fix Complete:`);
  console.log(`  - Fixed: ${fixedCount} invoices`);
  console.log(`  - Already correct: ${alreadyCorrectCount} invoices`);
  
  // Show summary after fix
  const updatedInvoices = await prisma.invoice.findMany({
    where: { company: 'CMK HEALTHCARE PVT. LTD' },
    select: { balance: true, status: true }
  });
  
  const totalOutstanding = updatedInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  const outstandingCount = updatedInvoices.filter(inv => inv.balance > 0).length;
  const settledCount = updatedInvoices.filter(inv => inv.balance === 0).length;
  
  console.log(`\n📊 Updated Financial Summary:`);
  console.log(`  Total Invoices: ${updatedInvoices.length}`);
  console.log(`  Settled Invoices: ${settledCount}`);
  console.log(`  Outstanding Invoices: ${outstandingCount}`);
  console.log(`  Total Outstanding Amount: ₹${totalOutstanding.toFixed(2)}`);
  
  await prisma.$disconnect();
}

fixOutstandingBalances().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
