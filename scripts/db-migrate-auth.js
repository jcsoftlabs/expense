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
  console.log('Connexion à la base de données MySQL pour la migration de sécurité...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Connecté avec succès.');

  // Désactiver temporairement les contraintes de clés étrangères
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  console.log('Création de la table "app_settings"...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      biometric_enabled TINYINT(1) DEFAULT 0,
      pin_hash VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('- Table "app_settings" vérifiée.');

  // Assurer qu'il y a au moins une ligne de paramètres initiale
  const [rows] = await connection.query('SELECT COUNT(*) as count FROM app_settings');
  if (rows[0].count === 0) {
    console.log('Insertion des paramètres de sécurité par défaut...');
    await connection.query('INSERT INTO app_settings (biometric_enabled, pin_hash) VALUES (0, NULL)');
    console.log('- Paramètres par défaut insérés.');
  }

  console.log('Création de la table "authenticators"...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS authenticators (
      credential_id VARCHAR(255) PRIMARY KEY,
      public_key TEXT NOT NULL,
      counter INT DEFAULT 0,
      transports VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('- Table "authenticators" vérifiée.');

  // Réactiver les contraintes de clés étrangères
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  await connection.end();
  console.log('Migration de sécurité terminée avec succès !');
}

main().catch(err => {
  console.error('Erreur lors de la migration de sécurité :', err);
  process.exit(1);
});
