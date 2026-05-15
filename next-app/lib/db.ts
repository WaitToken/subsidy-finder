import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Connection pool. Reuse across requests.
declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

export const sql = global.__sql ?? postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  transform: { undefined: null },
});

if (process.env.NODE_ENV !== 'production') {
  global.__sql = sql;
}
