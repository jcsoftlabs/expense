const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\s]+)["']?/);
    if (match && match[1]) {
      process.env.DATABASE_URL = match[1];
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL variable is missing in environment configuration.');
  process.exit(1);
}

async function addColumn(connection, sql, duplicateName) {
  try {
    await connection.query(sql);
    console.log(`- ${duplicateName} ajoutée.`);
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log(`- ${duplicateName} existe déjà.`);
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log('Connexion à la base de données MySQL pour la migration Stripe...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Connecté avec succès.');

  await addColumn(connection, `ALTER TABLE receivables ADD COLUMN public_payment_token VARCHAR(64) DEFAULT NULL`, 'public_payment_token');
  await addColumn(connection, `ALTER TABLE receivables ADD COLUMN stripe_checkout_session_id VARCHAR(255) DEFAULT NULL`, 'stripe_checkout_session_id');
  await addColumn(connection, `ALTER TABLE receivables ADD COLUMN stripe_payment_intent_id VARCHAR(255) DEFAULT NULL`, 'stripe_payment_intent_id');
  await addColumn(connection, `ALTER TABLE receivables ADD COLUMN stripe_payment_status VARCHAR(50) DEFAULT NULL`, 'stripe_payment_status');
  await addColumn(connection, `ALTER TABLE receivables ADD COLUMN stripe_customer_email VARCHAR(255) DEFAULT NULL`, 'stripe_customer_email');

  try {
    await connection.query(`CREATE UNIQUE INDEX uniq_receivables_public_payment_token ON receivables (public_payment_token)`);
    console.log('- Index unique sur public_payment_token ajouté.');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('- Index unique sur public_payment_token existe déjà.');
    } else {
      throw err;
    }
  }

  const [rows] = await connection.query(`SELECT id FROM receivables WHERE public_payment_token IS NULL OR public_payment_token = ''`);

  for (const row of rows) {
    const token = crypto.randomBytes(24).toString('hex');
    await connection.query(`UPDATE receivables SET public_payment_token = ? WHERE id = ?`, [token, row.id]);
  }

  console.log(`- ${rows.length} facture(s) existante(s) ont reçu un token de paiement public.`);

  await connection.end();
  console.log('Migration Stripe terminée avec succès.');
}

main().catch((err) => {
  console.error('Erreur lors de la migration Stripe :', err);
  process.exit(1);
});
