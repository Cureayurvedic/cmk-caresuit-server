import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_ACCESSORIES = [
  {
    code: "KB-101",
    name: "Hinged Knee Brace (Heavy Duty)",
    price: 1850,
    sizes: [
      { size: "S", stockQuantity: 5 },
      { size: "M", stockQuantity: 10 },
      { size: "L", stockQuantity: 15 },
      { size: "XL", stockQuantity: 8 },
      { size: "Universal", stockQuantity: 24 },
    ],
    minStockWarning: 5,
    description: "Provides maximum medial-lateral support for knee stability post-surgery or ligament injury.",
  },
  {
    code: "KC-201",
    name: "Elastic Knee Cap (Pair)",
    price: 450,
    sizes: [
      { size: "S", stockQuantity: 20 },
      { size: "M", stockQuantity: 30 },
      { size: "L", stockQuantity: 50 },
      { size: "XL", stockQuantity: 15 },
    ],
    minStockWarning: 10,
    description: "Breathable stretch elastic knee support for everyday mild compression and joint warmth.",
  },
  {
    code: "KB-102",
    name: "Patella Knee Support Band",
    price: 650,
    sizes: [
      { size: "Universal", stockQuantity: 35 },
      { size: "M", stockQuantity: 15 },
      { size: "L", stockQuantity: 20 },
    ],
    minStockWarning: 8,
    description: "Targeted patellar tendon strap for jumper's knee and tendonitis support.",
  },
  {
    code: "KI-301",
    name: 'Neoprene Knee Immobilizer 19"',
    price: 1200,
    sizes: [
      { size: "S", stockQuantity: 2 },
      { size: "M", stockQuantity: 4 },
      { size: "L", stockQuantity: 6 },
      { size: "XL", stockQuantity: 1 },
    ],
    minStockWarning: 5,
    description: "Rigid aluminum stay immobilizer for complete knee joint stabilization.",
  },
  {
    code: "KB-103",
    name: "ROM Knee Brace (Range of Motion)",
    price: 3500,
    sizes: [
      { size: "Universal", stockQuantity: 8 },
      { size: "L", stockQuantity: 4 },
    ],
    minStockWarning: 3,
    description: "Adjustable angle range of motion brace for post-op ACL/PCL rehabilitation.",
  },
  {
    code: "KC-202",
    name: "Compression Knee Sleeve (3D Weave)",
    price: 550,
    sizes: [
      { size: "S", stockQuantity: 10 },
      { size: "M", stockQuantity: 0 },
      { size: "L", stockQuantity: 25 },
      { size: "XL", stockQuantity: 0 },
    ],
    minStockWarning: 10,
    description: "Graduated ergonomic 3D knitting sleeve for joint compression and active motion support.",
  },
  {
    code: "KB-104",
    name: "Silicone Ring Knee Support",
    price: 890,
    sizes: [
      { size: "S", stockQuantity: 8 },
      { size: "M", stockQuantity: 18 },
      { size: "L", stockQuantity: 12 },
      { size: "XL", stockQuantity: 5 },
    ],
    minStockWarning: 5,
    description: "Integrated silicone gel pad for patella centering and dual lateral coil spring stays.",
  },
  {
    code: "KB-105",
    name: "Ligament Knee Stabilizer",
    price: 2100,
    sizes: [
      { size: "M", stockQuantity: 6 },
      { size: "L", stockQuantity: 15 },
      { size: "XL", stockQuantity: 8 },
    ],
    minStockWarning: 4,
    description: "Cross-strap bilateral support for collateral ligament injuries and severe arthritic pain.",
  },
];

async function seedAccessories() {
  console.log("🌱 Seeding accessories...");

  for (const accessory of INITIAL_ACCESSORIES) {
    try {
      // Check if already exists
      const existing = await prisma.accessory.findUnique({
        where: { code: accessory.code },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${accessory.code} - already exists`);
        continue;
      }

      // Create the accessory
      await prisma.accessory.create({
        data: {
          code: accessory.code,
          name: accessory.name,
          price: accessory.price,
          sizesJson: JSON.stringify(accessory.sizes),
          minStockWarning: accessory.minStockWarning,
          description: accessory.description,
        },
      });

      console.log(`✅ Created: ${accessory.name}`);
    } catch (error) {
      console.error(`❌ Error creating ${accessory.code}:`, error.message);
    }
  }

  console.log("✨ Accessories seeding completed!");
}

seedAccessories()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
