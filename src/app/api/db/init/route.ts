import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const rootDir = process.cwd();
    const schemaSql = fs.readFileSync(path.join(rootDir, 'database', 'schema.sql'), 'utf-8');
    const routinesSql = fs.readFileSync(path.join(rootDir, 'database', 'procedures_triggers.sql'), 'utf-8');
    const seedSql = fs.readFileSync(path.join(rootDir, 'database', 'seed.sql'), 'utf-8');

    // Execute scripts sequentially
    await prisma.$executeRawUnsafe(schemaSql);
    await prisma.$executeRawUnsafe(routinesSql);
    await prisma.$executeRawUnsafe(seedSql);

    return NextResponse.json({
      status: 'success',
      message: 'Successfully initialized 3NF Schema, PL/pgSQL Triggers/Procedures, and Seed Dataset!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Database Initialization Failed', details: error.message },
      { status: 500 }
    );
  }
}
