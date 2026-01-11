import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { ModuleLoader } from './core/server/module-loader/index.js';
import { ModelRegistry } from './core/server/orm/index.js';
import { generateAllModelAPIs } from './core/server/api/rest.js';
import { ViewService } from './core/server/api/views.js';
import { createUploadRouter } from './core/server/api/upload.js';
import { envMiddleware } from './core/server/services/Environment.js';

const { Pool } = pg;

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration interface
interface Config {
  server: {
    port: number;
    host: string;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max?: number;
    idleTimeoutMillis?: number;
  };
  addons_path: string[];
  modules: string[];
  session?: {
    secret: string;
    maxAge: number;
  };
  logging?: {
    level: string;
  };
}

// Load configuration
const configPath = path.join(__dirname, 'config/default.json');
const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

interface ErrorWithStatus extends Error {
  status?: number;
}

async function bootstrap(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  My ERP - Starting server...');
  console.log('='.repeat(60));

  // Connexion à la base de données
  console.log('\n[1/5] Connecting to database...');
  const pool = new Pool(config.database);

  try {
    await pool.query('SELECT NOW()');
    console.log(`  Connected to ${config.database.database}@${config.database.host}`);
  } catch (err) {
    console.error('  Failed to connect to database:', (err as Error).message);
    console.log('\n  Make sure PostgreSQL is running and the database exists.');
    console.log(`  You can create it with: createdb ${config.database.database}`);
    process.exit(1);
  }

  // Initialiser le registry des modèles
  console.log('\n[2/5] Initializing model registry...');
  const registry = new ModelRegistry();

  // Initialiser le service des vues
  const viewService = new ViewService();

  // Créer l'application Express
  const app: Express = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Middleware pour l'environnement ORM
  app.use(envMiddleware(pool, registry));

  // Découvrir et charger les modules
  console.log('\n[3/5] Discovering modules...');
  const addonsPaths = config.addons_path.map((p: string) => path.resolve(__dirname, p));
  const loader = new ModuleLoader(addonsPaths, { registry, pool, app });
  loader.discoverModules();

  console.log('\n[4/5] Loading modules...');
  try {
    const loadedModules = await loader.loadModules(config.modules);

    // Enregistrer les vues de chaque module
    for (const [, moduleData] of loadedModules) {
      for (const viewDef of moduleData.views) {
        viewService.registerViews(viewDef);
      }
    }

    console.log(`\n  Loaded ${loadedModules.size} modules successfully`);
  } catch (err) {
    console.error('  Error loading modules:', (err as Error).message);
    process.exit(1);
  }

  // Générer les API REST pour tous les modèles
  console.log('\n[5/5] Generating REST APIs...');
  generateAllModelAPIs(app, registry);

  // Routes pour les vues
  app.use(viewService.createRouter());

  // Routes pour l'upload de fichiers
  app.use(createUploadRouter());

  // Servir les fichiers statiques du client
  app.use(express.static(path.join(__dirname, 'core/client/dist')));
  
  // Servir les fichiers uploadés
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Route pour le client SPA
  app.get('/', (_req: Request, res: Response) => {
    // Vérifier si le bundle existe
    const bundlePath = path.join(__dirname, 'core/client/dist/bundle.js');

    if (fs.existsSync(bundlePath)) {
      // Client React compilé
      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>My ERP</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <div id="root"></div>
          <script src="/bundle.js"></script>
        </body>
        </html>
      `);
    } else {
      // Interface de test simple
      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>My ERP - Console</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
            .header { background: #714B67; color: white; padding: 15px 20px; }
            .header h1 { font-size: 20px; }
            .container { display: flex; height: calc(100vh - 54px); }
            .sidebar { width: 250px; background: white; border-right: 1px solid #ddd; padding: 15px; overflow-y: auto; }
            .main { flex: 1; padding: 20px; overflow-y: auto; }
            h2 { font-size: 14px; color: #666; margin: 15px 0 10px; text-transform: uppercase; }
            h2:first-child { margin-top: 0; }
            .menu-item { display: block; padding: 8px 12px; margin: 2px 0; border-radius: 4px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-size: 14px; }
            .menu-item:hover { background: #f0f0f0; }
            .menu-item.active { background: #714B67; color: white; }
            .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .card h3 { margin-bottom: 15px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
            th { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
            .btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; margin-right: 8px; }
            .btn-primary { background: #714B67; color: white; }
            .btn-secondary { background: #eee; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-size: 13px; color: #666; }
            .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
            .empty { color: #999; text-align: center; padding: 40px; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; background: #e0e0e0; }
            .badge.draft { background: #fff3cd; color: #856404; }
            .badge.open, .badge.sale { background: #d4edda; color: #155724; }
            .badge.done, .badge.close { background: #cce5ff; color: #004085; }
            #loading { text-align: center; padding: 20px; color: #666; }
            .actions { margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="header"><h1>My ERP</h1></div>
          <div class="container">
            <div class="sidebar" id="sidebar">
              <div id="menus">Chargement...</div>
            </div>
            <div class="main" id="main">
              <div class="card">
                <h3>Bienvenue dans My ERP</h3>
                <p>Sélectionnez un menu pour commencer.</p>
                <p style="margin-top:15px;color:#666;font-size:13px;">
                  Pour utiliser l'interface React complète, exécutez :<br>
                  <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">cd core/client && pnpm install && pnpm build</code>
                </p>
              </div>
            </div>
          </div>
          <script>
            let currentModel = null;

            async function loadMenus() {
              const res = await fetch('/api/menus');
              const data = await res.json();
              renderMenus(data.data);
            }

            function renderMenus(menus) {
              let html = '';
              for (const menu of menus) {
                html += '<h2>' + menu.label + '</h2>';
                if (menu.children) {
                  for (const child of menu.children) {
                    html += '<button class="menu-item" onclick="loadAction(\\'' + child.action + '\\')">' + child.label + '</button>';
                  }
                }
              }
              document.getElementById('menus').innerHTML = html;
            }

            async function loadAction(actionId) {
              if (!actionId) return;
              const res = await fetch('/api/actions/' + actionId);
              const data = await res.json();
              if (data.success) {
                currentModel = data.data.model;
                document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
                event.target.classList.add('active');
                loadRecords(currentModel);
              }
            }

            async function loadRecords(model) {
              const modelPath = model.replace(/\\./g, '/');
              const res = await fetch('/api/' + modelPath);
              const data = await res.json();

              const metaRes = await fetch('/api/models/' + modelPath);
              const meta = await metaRes.json();

              renderList(model, data.data, meta.data?.fields || {});
            }

            function renderList(model, records, fields) {
              const fieldNames = Object.keys(fields).filter(f => !['id','create_date','write_date'].includes(f) && !fields[f].type?.includes('2many')).slice(0, 6);

              let html = '<div class="card"><h3>' + model + '</h3>';
              html += '<div class="actions"><button class="btn btn-primary" onclick="showCreateForm(\\'' + model + '\\')">Nouveau</button></div>';

              if (!records || records.length === 0) {
                html += '<div class="empty">Aucun enregistrement</div>';
              } else {
                html += '<table><thead><tr><th>ID</th>';
                for (const f of fieldNames) {
                  html += '<th>' + (fields[f]?.label || f) + '</th>';
                }
                html += '</tr></thead><tbody>';
                for (const rec of records) {
                  html += '<tr onclick="loadRecord(\\'' + model + '\\',' + rec.id + ')" style="cursor:pointer">';
                  html += '<td>' + rec.id + '</td>';
                  for (const f of fieldNames) {
                    let val = rec[f];
                    if (val === null || val === undefined) val = '-';
                    if (typeof val === 'boolean') val = val ? 'Oui' : 'Non';
                    if (f === 'state') val = '<span class="badge ' + rec[f] + '">' + val + '</span>';
                    html += '<td>' + val + '</td>';
                  }
                  html += '</tr>';
                }
                html += '</tbody></table>';
              }
              html += '</div>';
              document.getElementById('main').innerHTML = html;
            }

            async function loadRecord(model, id) {
              const modelPath = model.replace(/\\./g, '/');
              const res = await fetch('/api/' + modelPath + '/' + id);
              const data = await res.json();

              const metaRes = await fetch('/api/models/' + modelPath);
              const meta = await metaRes.json();

              renderForm(model, data.data, meta.data?.fields || {});
            }

            function renderForm(model, record, fields) {
              const fieldNames = Object.keys(fields).filter(f => f !== 'id' && !fields[f].type?.includes('2many'));

              let html = '<div class="card"><h3>' + model + ' #' + record.id + '</h3>';
              html += '<div class="actions">';
              html += '<button class="btn btn-secondary" onclick="loadRecords(\\'' + model + '\\')">Retour</button>';
              html += '<button class="btn btn-primary" onclick="saveRecord(\\'' + model + '\\',' + record.id + ')">Enregistrer</button>';
              html += '</div>';
              html += '<form id="editForm">';

              for (const f of fieldNames) {
                const field = fields[f];
                const val = record[f] ?? '';
                html += '<div class="form-group">';
                html += '<label>' + (field.label || f) + '</label>';

                if (field.type === 'selection' && field.options) {
                  html += '<select name="' + f + '">';
                  for (const [optVal, optLabel] of field.options) {
                    html += '<option value="' + optVal + '"' + (val === optVal ? ' selected' : '') + '>' + optLabel + '</option>';
                  }
                  html += '</select>';
                } else if (field.type === 'boolean') {
                  html += '<input type="checkbox" name="' + f + '"' + (val ? ' checked' : '') + ' style="width:auto">';
                } else if (field.type === 'text') {
                  html += '<textarea name="' + f + '" rows="3">' + val + '</textarea>';
                } else if (field.type === 'date') {
                  html += '<input type="date" name="' + f + '" value="' + (val ? val.split('T')[0] : '') + '">';
                } else {
                  html += '<input type="text" name="' + f + '" value="' + val + '">';
                }
                html += '</div>';
              }

              html += '</form></div>';
              document.getElementById('main').innerHTML = html;
            }

            function showCreateForm(model) {
              fetch('/api/models/' + model.replace(/\\./g, '/')).then(r => r.json()).then(meta => {
                const fields = meta.data?.fields || {};
                const fieldNames = Object.keys(fields).filter(f => f !== 'id' && !fields[f].type?.includes('2many') && !f.includes('date'));

                let html = '<div class="card"><h3>Nouveau ' + model + '</h3>';
                html += '<div class="actions">';
                html += '<button class="btn btn-secondary" onclick="loadRecords(\\'' + model + '\\')">Annuler</button>';
                html += '<button class="btn btn-primary" onclick="createRecord(\\'' + model + '\\')">Créer</button>';
                html += '</div>';
                html += '<form id="createForm">';

                for (const f of fieldNames) {
                  const field = fields[f];
                  html += '<div class="form-group">';
                  html += '<label>' + (field.label || f) + (field.required ? ' *' : '') + '</label>';

                  if (field.type === 'selection' && field.options) {
                    html += '<select name="' + f + '">';
                    for (const [optVal, optLabel] of field.options) {
                      html += '<option value="' + optVal + '">' + optLabel + '</option>';
                    }
                    html += '</select>';
                  } else if (field.type === 'boolean') {
                    html += '<input type="checkbox" name="' + f + '" style="width:auto">';
                  } else {
                    html += '<input type="text" name="' + f + '">';
                  }
                  html += '</div>';
                }

                html += '</form></div>';
                document.getElementById('main').innerHTML = html;
              });
            }

            async function createRecord(model) {
              const form = document.getElementById('createForm');
              const formData = new FormData(form);
              const data = {};
              for (const [key, value] of formData.entries()) {
                if (value) data[key] = value;
              }

              const modelPath = model.replace(/\\./g, '/');
              await fetch('/api/' + modelPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });

              loadRecords(model);
            }

            async function saveRecord(model, id) {
              const form = document.getElementById('editForm');
              const formData = new FormData(form);
              const data = {};
              for (const [key, value] of formData.entries()) {
                data[key] = value;
              }

              const modelPath = model.replace(/\\./g, '/');
              await fetch('/api/' + modelPath + '/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });

              loadRecords(model);
            }

            loadMenus();
          </script>
        </body>
        </html>
      `);
    }
  });

  // Gestion des erreurs
  app.use(
    (
      err: ErrorWithStatus,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      console.error('Error:', err.message);
      res.status(err.status || 500).json({
        success: false,
        error: err.message,
      });
    }
  );

  // Route 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
    });
  });

  // Démarrer le serveur
  const { port, host } = config.server;
  app.listen(port, host, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`  My ERP is running!`);
    console.log(`  API:    http://${host}:${port}/api`);
    console.log(`  Client: http://${host}:${port}`);
    console.log('='.repeat(60));
    console.log('\nAvailable endpoints:');
    console.log('  GET  /api/models         - List all models');
    console.log('  GET  /api/menus          - Get menu structure');
    console.log('  GET  /api/<model>        - List records');
    console.log('  POST /api/<model>        - Create record');
    console.log('  GET  /api/<model>/:id    - Get record');
    console.log('  PUT  /api/<model>/:id    - Update record');
    console.log('  DELETE /api/<model>/:id  - Delete record');
    console.log('');
  });
}

// Gérer les signaux d'arrêt
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

// Démarrer l'application
bootstrap().catch((err: Error) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
