/**
 * Migration initiale pour le module sales
 * Crée les tables produits et commandes
 */

async function up(pool) {
  // Table product_product
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_product (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      default_code VARCHAR(64),
      barcode VARCHAR(64),
      list_price DECIMAL(15,2) DEFAULT 0,
      standard_price DECIMAL(15,2) DEFAULT 0,
      type VARCHAR(64) DEFAULT 'consu',
      categ_id INTEGER,
      uom_id VARCHAR(64) DEFAULT 'Unité',
      active BOOLEAN DEFAULT true,
      sale_ok BOOLEAN DEFAULT true,
      purchase_ok BOOLEAN DEFAULT true,
      image TEXT,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table sale_order
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sale_order (
      id SERIAL PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      partner_id INTEGER NOT NULL REFERENCES res_partner(id),
      date_order TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      validity_date DATE,
      state VARCHAR(32) DEFAULT 'draft',
      user_id INTEGER REFERENCES res_users(id),
      amount_untaxed DECIMAL(15,2) DEFAULT 0,
      amount_tax DECIMAL(15,2) DEFAULT 0,
      amount_total DECIMAL(15,2) DEFAULT 0,
      note TEXT,
      payment_term VARCHAR(255),
      origin VARCHAR(255),
      client_order_ref VARCHAR(255),
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table sale_order_line
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sale_order_line (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES sale_order(id) ON DELETE CASCADE,
      sequence INTEGER DEFAULT 10,
      product_id INTEGER REFERENCES product_product(id),
      name TEXT NOT NULL,
      product_uom_qty DECIMAL(15,4) DEFAULT 1,
      product_uom VARCHAR(64) DEFAULT 'Unité',
      price_unit DECIMAL(15,2) DEFAULT 0,
      discount DECIMAL(5,2) DEFAULT 0,
      price_subtotal DECIMAL(15,2) DEFAULT 0,
      tax_id VARCHAR(255),
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_name ON product_product(name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_code ON product_product(default_code);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_name ON sale_order(name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_partner ON sale_order(partner_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_state ON sale_order(state);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_order_line_order ON sale_order_line(order_id);`);
}

async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS sale_order_line;`);
  await pool.query(`DROP TABLE IF EXISTS sale_order;`);
  await pool.query(`DROP TABLE IF EXISTS product_product;`);
}

module.exports = { up, down };
