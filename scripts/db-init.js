const mysql = require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL variable is missing in environment configuration.");
  process.exit(1);
}

async function main() {
  console.log('Connecting to MySQL database...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Successfully connected.');

  // Enable foreign keys
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  console.log('Creating tables...');

  // 1. Clients Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('- "clients" table verified.');

  // 2. Projects Table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      client_id VARCHAR(36),
      budget DECIMAL(12, 2) DEFAULT 0.00,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('- "projects" table verified.');

  // 3. Transactions Table (Income & Expenses)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(50) NOT NULL, -- INCOME, EXPENSE
      amount DECIMAL(12, 2) NOT NULL,
      date DATE NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      project_id VARCHAR(36),
      client_id VARCHAR(36),
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      payment_method VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('- "transactions" table verified.');

  // 4. Receivables Table (Accounts Receivable / Invoices)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS receivables (
      id VARCHAR(36) PRIMARY KEY,
      invoice_number VARCHAR(100) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
      client_id VARCHAR(36),
      project_id VARCHAR(36),
      notes TEXT,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      payment_method VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('- "receivables" table verified.');

  // Re-enable foreign keys
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  // Seed Data if completely empty
  const [clientRows] = await connection.query('SELECT COUNT(*) as count FROM clients');
  if (clientRows[0].count === 0) {
    console.log('Seeding initial developer-focused demo data with multi-currency (USD & HTG)...');

    const client1Id = 'c1-seed-id-uuid-1111';
    const client2Id = 'c2-seed-id-uuid-2222';
    
    // Seed Clients
    await connection.query(`
      INSERT INTO clients (id, name, email, phone, company) VALUES
      ('${client1Id}', 'Jean Dupont', 'jean.dupont@acme.com', '+509 3123-4567', 'Acme Corp'),
      ('${client2Id}', 'Sarah Connor', 'sarah@cyberdyne.io', '+509 3755-0199', 'Cyberdyne Systems');
    `);

    const project1Id = 'p1-seed-id-uuid-1111';
    const project2Id = 'p2-seed-id-uuid-2222';

    // Seed Projects (p1 in USD, p2 in HTG)
    await connection.query(`
      INSERT INTO projects (id, name, description, status, client_id, budget, currency) VALUES
      ('${project1Id}', 'E-Commerce Platform', 'Migration from Magento to a modern Next.js stack with headless commerce.', 'ACTIVE', '${client1Id}', 12500.00, 'USD'),
      ('${project2Id}', 'AI Integration Audit', 'Audit existing infrastructure and recommend LLM fine-tuning options.', 'COMPLETED', '${client2Id}', 450000.00, 'HTG');
    `);

    // Seed Transactions (Expenses & some Income in USD and HTG)
    await connection.query(`
      INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency) VALUES
      ('t1', 'EXPENSE', 49.00, '2026-05-01', 'Hosting/Cloud', 'Vercel Pro Team Subscription', '${project1Id}', '${client1Id}', 'USD'),
      ('t2', 'EXPENSE', 10.00, '2026-05-03', 'SaaS Subscriptions', 'GitHub Copilot Individual', NULL, NULL, 'USD'),
      ('t3', 'EXPENSE', 18500.00, '2026-05-10', 'Hardware', 'Ergonomic keyboard replacement (bought locally)', NULL, NULL, 'HTG'),
      ('t4', 'INCOME', 450000.00, '2026-05-12', 'Consulting', 'AI Audit - Full payment milestone', '${project2Id}', '${client2Id}', 'HTG'),
      ('t5', 'INCOME', 5000.00, '2026-05-15', 'Freelance Dev', 'E-Commerce - Milestone 1 deposit', '${project1Id}', '${client1Id}', 'USD');
    `);

    // Seed Receivables (Invoices in USD and HTG)
    await connection.query(`
      INSERT INTO receivables (id, invoice_number, amount, paid_amount, issue_date, due_date, status, client_id, project_id, notes, currency) VALUES
      ('r1', 'INV-2026-001', 3750.00, 0.00, '2026-05-15', '2026-06-15', 'PENDING', '${client1Id}', '${project1Id}', 'E-Commerce Milestone 2 - Frontend complete', 'USD'),
      ('r2', 'INV-2026-002', 250000.00, 0.00, '2026-05-18', '2026-05-20', 'OVERDUE', '${client1Id}', '${project1Id}', 'Urgent: Local consulting and custom backend integration (HTG invoice)', 'HTG'),
      ('r3', 'INV-2026-003', 450000.00, 450000.00, '2026-05-01', '2026-05-12', 'PAID', '${client2Id}', '${project2Id}', 'AI Audit Project Completion Invoice', 'HTG');
    `);

    console.log('Seeding completed successfully!');
  } else {
    console.log('Database already has data. Skipping seed.');
  }

  await connection.end();
  console.log('Database initialization script finished successfully.');
}

main().catch(err => {
  console.error('Error during database initialization:', err);
  process.exit(1);
});
