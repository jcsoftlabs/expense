import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:MvEXmPGTEEhIMwtQXEGKhnwHdtOpcylY@kodama.proxy.rlwy.net:10549/railway";

// Ensure global pool cache so Next.js HMR doesn't spawn endless pools
interface GlobalWithDb {
  dbPool?: mysql.Pool;
}

const globalWithDb = global as typeof global & GlobalWithDb;

if (!globalWithDb.dbPool) {
  globalWithDb.dbPool = mysql.createPool({
    uri: DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

const pool = globalWithDb.dbPool;

/**
 * Execute a SQL query securely with parameterization.
 * Prevents SQL injections and manages connection lifecycle.
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows as T;
  } catch (error) {
    console.error('Database Query Error:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export default pool;
