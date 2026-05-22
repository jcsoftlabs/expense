const mysql = require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL variable is missing in environment configuration.");
  process.exit(1);
}

async function main() {
  console.log('Connexion à la base de données MySQL pour nettoyage...');
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('Connecté avec succès.');

  // Désactiver temporairement les contraintes de clés étrangères
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  console.log('Nettoyage des tables de la base de données...');

  // Nettoyer les tables
  await connection.query('TRUNCATE TABLE receivables;');
  console.log('- Table "receivables" vidée.');

  await connection.query('TRUNCATE TABLE transactions;');
  console.log('- Table "transactions" vidée.');

  await connection.query('TRUNCATE TABLE projects;');
  console.log('- Table "projects" vidée.');

  await connection.query('TRUNCATE TABLE clients;');
  console.log('- Table "clients" vidée.');

  // Réactiver les clés étrangères
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

  await connection.end();
  console.log('La base de données est maintenant vierge et prête pour la production !');
}

main().catch(err => {
  console.error('Erreur lors du nettoyage de la base de données :', err);
  process.exit(1);
});
