# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My ERP is a modular open-source ERP system inspired by Odoo's architecture, built with Node.js, TypeScript, PostgreSQL, and React. It features an ORM with inheritance, auto-generated REST APIs, and a dynamic view rendering system.

## Development Commands

```bash
# Install dependencies (pnpm workspace monorepo)
pnpm install

# Development
pnpm dev              # Server with hot-reload (tsx watch)
pnpm client:dev       # React dev server on :3000

# Build
pnpm build            # Compile TypeScript
pnpm client:build     # Build React client

# Testing
pnpm test             # Run vitest in watch mode
pnpm test -- --run    # Run test in one shot (usefull for IA or CI/CD)
pnpm test:coverage    # Run with coverage
vitest run path/to/file.test.ts  # Run single test file

# Database (PostgreSQL)
pnpm db:create        # createdb my_erp
pnpm db:drop          # dropdb my_erp
pnpm db:reset         # Drop, create, and start server

# Linting
pnpm lint             # ESLint check
```

## Architecture

### Core Framework (`core/`)

- **`core/server/orm/`** - ORM with Odoo-like model inheritance
  - `model.ts` - BaseModel class and ModelRegistry
  - `types.ts` - Type definitions (Domain, Fields, etc.)
  - `fields.ts` - Field type system (integer, float, string, text, boolean, date, datetime, selection, many2one, one2many, many2many, json, monetary, image)

- **`core/server/api/`** - Auto-generated REST endpoints
  - `rest.ts` - CRUD routes: `/api/<model>` (dots become slashes: `sale.order` → `/api/sale/order`)
  - `views.ts` - View/menu API endpoints
  - Model actions: `POST /api/<model>/:id/action/:name`

- **`core/server/module-loader/`** - Addon discovery and dependency resolution

- **`core/client/engine/`** - React view rendering engine
  - `ViewRenderer.tsx` - Main dynamic view renderer
  - `views/` - List, Form, Grid views
  - `fields/` - Field renderers

### Addons (`addons/`)

Business modules following Odoo conventions. Each addon contains:
- `manifest.json` - Module metadata and dependencies
- `models/*.ts` - TypeScript model definitions
- `views/*.json` - View, action, and menu definitions
- `migrations/*.js` - Database migrations (CommonJS, `up(pool)`/`down(pool)`)
- `security/access.json` - Access control rules
- `tests/*.test.ts` - Vitest test files

Current addons: `base`, `sales`, `project`, `timesheet`

### Path Aliases

```typescript
import { BaseModel } from '@core/server/orm';
import SomeModel from '@addons/module/models/model.js';
```

## Key Patterns

### Model Definition

```typescript
import { BaseModel } from '@core/server/orm/index.js';
import type { FieldsCollection } from '@core/server/orm/types.js';

class MyModel extends BaseModel {
  static override _name = 'module.model';
  static override _table = 'module_model';  // Convention: dots → underscores
  static override _order = 'create_date DESC';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Name' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Partner' },
    state: {
      type: 'selection',
      options: [['draft', 'Draft'], ['done', 'Done']],
      default: 'draft',
    },
  };

  // Model action methods (callable from view buttons)
  async actionConfirm(): Promise<boolean> {
    return this.write({ state: 'done' });
  }
}

export default MyModel;
```

### Model Inheritance (extending existing models)

```typescript
// Use ModelRegistry.extend() for _inherit behavior
import { registry } from '@core/server/orm';

registry.extend({
  inherit: 'sale.order',
  fields: {
    custom_field: { type: 'string', label: 'Custom' }
  },
  methods: {
    async actionConfirm() {
      // Call original method via super pattern
      await this._super?.();
      // Additional logic...
    }
  }
});
```

### View Definition (JSON)

```json
{
  "views": [
    {
      "id": "model_form",
      "model": "module.model",
      "type": "form",
      "arch": {
        "header": {
          "buttons": [
            { "name": "actionConfirm", "label": "Confirm", "type": "action", "states": ["draft"] }
          ],
          "statusbar": { "field": "state" }
        },
        "sheet": {
          "groups": [{ "label": "Info", "fields": ["name", "partner_id"] }],
          "notebook": [{ "label": "Lines", "content": { "field": "line_ids", "widget": "one2many", "tree": ["product_id", "qty"] }}]
        }
      }
    }
  ],
  "actions": [
    { "id": "action_model", "type": "ir.actions.act_window", "name": "My Model", "model": "module.model", "views": [["model_list", "list"], ["model_form", "form"]] }
  ],
  "menus": [
    { "id": "menu_root", "label": "Module", "sequence": 10 },
    { "id": "menu_item", "parent": "menu_root", "action": "action_model", "label": "Items", "sequence": 1 }
  ]
}
```

### Domain Syntax (Odoo-like search filters)

```typescript
// Format: [['field', 'operator', 'value'], ...]
const orders = await Order.search([
  ['state', '=', 'draft'],
  ['amount_total', '>', 1000],
  ['partner_id', '!=', false],
]);
```

## Testing

Tests use Vitest with helpers in `core/test-helpers/`:
- `test-env.ts` - Test environment setup
- `mock-pool.ts` - PostgreSQL mock
- `view-schema.ts` - Zod schema for view JSON validation
- `addon-views-tests.ts` - Reusable view tests for addons

### View Tests for Addons

Each addon should have a `tests/views.test.ts` file that validates view definitions:

```typescript
import path from 'path';
import { fileURLToPath } from 'url';
import { createAddonViewsTests } from '../../../core/test-helpers/addon-views-tests.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

createAddonViewsTests({
  addonName: 'mymodule',
  addonPath: path.resolve(__dirname, '..'),
  dependencies: ['base'],  // Optional: modules to load before this one
});
```

This generates 2 tests:
1. **JSON syntax validation** - Validates view files against a Zod schema
2. **Model consistency** - Checks that referenced fields, button actions, and models exist

## Configuration

Server and database settings in `config/default.json`:
- Server runs on port 8069 by default
- Modules to load are specified in the `modules` array
- Database connection settings for PostgreSQL

## Reference

This project follows Odoo architectural patterns. When making design decisions, consult the Odoo reference in `.claude/skills/odoo-reference.md` for guidance on module structure, ORM patterns, and view definitions.
