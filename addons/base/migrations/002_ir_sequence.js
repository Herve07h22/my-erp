/**
 * Migration pour le modèle ir.sequence
 * Crée la table de gestion des séquences automatiques
 */

async function up(pool) {
  // Table ir_sequence
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ir_sequence (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(128) NOT NULL UNIQUE,
      prefix VARCHAR(64),
      suffix VARCHAR(64),
      padding INTEGER DEFAULT 5,
      number_next INTEGER DEFAULT 1,
      number_increment INTEGER DEFAULT 1,
      use_date_range BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index sur le code pour les lookups rapides
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ir_sequence_code ON ir_sequence(code) WHERE active = true;`);
}

async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS ir_sequence;`);
}

module.exports = { up, down };
