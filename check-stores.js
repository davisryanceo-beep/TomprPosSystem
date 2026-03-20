
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stores = await prisma.stores.findMany();
  console.log('Current Stores:', JSON.stringify(stores, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
