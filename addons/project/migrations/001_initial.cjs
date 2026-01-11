/**
 * Migration initiale pour le module project
 */

async function up(pool) {
  // Table project_task_stage
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_task_stage (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sequence INTEGER DEFAULT 10,
      fold BOOLEAN DEFAULT false,
      is_closed BOOLEAN DEFAULT false,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table project_tag
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tag (
      id SERIAL PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      color INTEGER DEFAULT 0
    );
  `);

  // Table project_project
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_project (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sequence INTEGER DEFAULT 10,
      active BOOLEAN DEFAULT true,
      partner_id INTEGER REFERENCES res_partner(id),
      user_id INTEGER REFERENCES res_users(id),
      date_start DATE,
      date_end DATE,
      state VARCHAR(32) DEFAULT 'draft',
      privacy_visibility VARCHAR(32) DEFAULT 'employees',
      color INTEGER DEFAULT 0,
      task_count INTEGER DEFAULT 0,
      allow_timesheets BOOLEAN DEFAULT true,
      allocated_hours DECIMAL(10,2) DEFAULT 0,
      total_timesheet_time DECIMAL(10,2) DEFAULT 0,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table project_task
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_task (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sequence INTEGER DEFAULT 10,
      priority VARCHAR(8) DEFAULT '0',
      project_id INTEGER NOT NULL REFERENCES project_project(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES res_users(id),
      partner_id INTEGER REFERENCES res_partner(id),
      stage_id INTEGER REFERENCES project_task_stage(id),
      stage_name VARCHAR(255),
      state VARCHAR(32) DEFAULT 'draft',
      kanban_state VARCHAR(32) DEFAULT 'normal',
      date_deadline DATE,
      date_assign TIMESTAMP,
      date_end TIMESTAMP,
      planned_hours DECIMAL(10,2) DEFAULT 0,
      effective_hours DECIMAL(10,2) DEFAULT 0,
      remaining_hours DECIMAL(10,2) DEFAULT 0,
      progress DECIMAL(5,2) DEFAULT 0,
      parent_id INTEGER REFERENCES project_task(id),
      color INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_name ON project_project(name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_state ON project_project(state);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_project ON project_task(project_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_user ON project_task(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_state ON project_task(state);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_task_deadline ON project_task(date_deadline);`);
}

async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS project_task;`);
  await pool.query(`DROP TABLE IF EXISTS project_project;`);
  await pool.query(`DROP TABLE IF EXISTS project_tag;`);
  await pool.query(`DROP TABLE IF EXISTS project_task_stage;`);
}

module.exports = { up, down };
