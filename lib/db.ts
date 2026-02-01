import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getConnectionString() {
  let connectionString = process.env.DATABASE_URL || "";
  if (connectionString && !connectionString.includes("sslmode=")) {
    connectionString += connectionString.includes("?") ? "&sslmode=verify-full" : "?sslmode=verify-full";
  }
  return connectionString;
}

function createPrismaClient() {
  // Reuse existing pool or create new one
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: getConnectionString(),
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Timeout for new connections
    });
  }
  
  const adapter = new PrismaPg(globalForPrisma.pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
