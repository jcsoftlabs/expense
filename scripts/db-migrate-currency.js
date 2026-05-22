const mysql = require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL variable is missing in environment configuration.");
  process.exit(1);
}

async function addColumnIfNotExists(connection, tableName, columnName, definition) {
  try {
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
      [tableName, columnName]
    );
    
    if (columns.length === 0) {
      console.log(`Ajout de la colonne "${columnName}" dans la table "${tableName}"...`);
      await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
      console.log(`- Colonne "${columnName}" ajoutée avec succès.`);
    } else {
      console.log(`- La colonne "${columnName}" existe déjà dans la table "${tableName}".`);
    }
  } catch (err) {
    console.error(`Erreur lors de la modification de la table ${tableName}:`, err);
    throw err;
  }
}

async function main() {
  console.log('Connexion à la base de données MySQL pour migration...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Connecté avec succès.');

  // Désactiver les contraintes temporairement
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  // Migration des 3 tables clés
  await addColumnIfNotExists(connection, 'transactions', 'currency', "VARCHAR(3) NOT NULL DEFAULT 'USD'");
  await addColumnIfNotExists(connection, 'receivables', 'currency', "VARCHAR(3) NOT NULL DEFAULT 'USD'");
  await addColumnIfNotExists(connection, 'projects', 'currency', "VARCHAR(3) NOT NULL DEFAULT 'USD'");

  // Réactiver les contraintes
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  await connection.end();
  console.log('Migration de la base de données terminée avec succès !');
}

main().catch(err => {
  console.error('Erreur lors de la migration :', err);
  process.exit(1);
});
