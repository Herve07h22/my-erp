/**
 * Migration initiale pour le module base
 * Crée les tables fondamentales
 */

async function up(pool) {
  // Table res_partner
  await pool.query(`
    CREATE TABLE IF NOT EXISTS res_partner (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(64),
      mobile VARCHAR(64),
      street VARCHAR(255),
      street2 VARCHAR(255),
      city VARCHAR(128),
      zip VARCHAR(24),
      country VARCHAR(128),
      vat VARCHAR(64),
      website VARCHAR(255),
      is_company BOOLEAN DEFAULT false,
      company_type VARCHAR(64) DEFAULT 'person',
      parent_id INTEGER REFERENCES res_partner(id),
      active BOOLEAN DEFAULT true,
      comment TEXT,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table res_company
  await pool.query(`
    CREATE TABLE IF NOT EXISTS res_company (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      partner_id INTEGER REFERENCES res_partner(id),
      currency_id VARCHAR(10) DEFAULT 'EUR',
      street VARCHAR(255),
      street2 VARCHAR(255),
      city VARCHAR(128),
      zip VARCHAR(24),
      country VARCHAR(128),
      email VARCHAR(255),
      phone VARCHAR(64),
      website VARCHAR(255),
      vat VARCHAR(64),
      logo TEXT,
      active BOOLEAN DEFAULT true,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table res_users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS res_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      login VARCHAR(128) NOT NULL UNIQUE,
      password VARCHAR(255),
      email VARCHAR(255),
      partner_id INTEGER REFERENCES res_partner(id),
      active BOOLEAN DEFAULT true,
      lang VARCHAR(16) DEFAULT 'fr_FR',
      tz VARCHAR(64) DEFAULT 'Europe/Paris',
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_res_partner_name ON res_partner(name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_res_partner_email ON res_partner(email);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_res_users_login ON res_users(login);`);
}

async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS res_users;`);
  await pool.query(`DROP TABLE IF EXISTS res_company;`);
  await pool.query(`DROP TABLE IF EXISTS res_partner;`);
}

module.exports = { up, down };
