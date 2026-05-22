const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env.local if DATABASE_URL is not in process.env
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
  console.error("DATABASE_URL variable is missing in environment configuration.");
  process.exit(1);
}

async function main() {
  console.log('Connexion à la base de données MySQL pour la migration des paiements partiels...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Connecté avec succès.');

  console.log('Ajout de la colonne "paid_amount" sur la table "receivables"...');
  try {
    await connection.query(`
      ALTER TABLE receivables 
      ADD COLUMN paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
    `);
    console.log('- Colonne "paid_amount" ajoutée à la table "receivables".');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('- La colonne "paid_amount" existe déjà dans la table "receivables".');
    } else {
      throw err;
    }
  }

  await connection.end();
  console.log('Migration des paiements partiels terminée avec succès !');
}

main().catch(err => {
  console.error('Erreur lors de la migration des paiements partiels :', err);
  process.exit(1);
});
