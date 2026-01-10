/**
 * Migration initiale pour le module timesheet
 */

async function up(pool) {
  // Table account_analytic_line (feuilles de temps)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS account_analytic_line (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      user_id INTEGER NOT NULL REFERENCES res_users(id),
      project_id INTEGER REFERENCES project_project(id),
      task_id INTEGER REFERENCES project_task(id),
      unit_amount DECIMAL(10,2) DEFAULT 0,
      amount DECIMAL(15,2) DEFAULT 0,
      partner_id INTEGER REFERENCES res_partner(id),
      company_id INTEGER REFERENCES res_company(id),
      is_timesheet BOOLEAN DEFAULT true,
      validated BOOLEAN DEFAULT false,
      validated_date TIMESTAMP,
      validated_by INTEGER REFERENCES res_users(id),
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index pour optimiser les requêtes fréquentes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timesheet_user ON account_analytic_line(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timesheet_date ON account_analytic_line(date);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timesheet_project ON account_analytic_line(project_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timesheet_task ON account_analytic_line(task_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timesheet_validated ON account_analytic_line(validated);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_timesheet_is_timesheet ON account_analytic_line(is_timesheet);`);
}

async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS account_analytic_line;`);
}

module.exports = { up, down };
