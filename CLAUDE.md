# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My ERP is a modular open-source ERP system inspired by Odoo's architecture, built with Node.js, TypeScript, PostgreSQL, and React. It features an ORM with inheritance, auto-generated REST APIs, and a dynamic view rendering system.

## Documentation

For detailed architecture documentation, see:
- [core/client/README.md](./core/client/README.md) - Client architecture (API, stores, components)
- [core/server/README.md](./core/server/README.md) - Server architecture (API REST, module loader)
- [core/server/orm/README.md](./core/server/orm/README.md) - ORM documentation (models, fields, domains)
- [addons/TUTORIAL.md](./addons/TUTORIAL.md) - Tutorial: creating an addon from scratch

## Development Commands

```bash
# Install dependencies (pnpm workspace monorepo)
pnpm install

# Development
pnpm dev              # Server with hot-reload (tsx watch)
pnpm client:dev       # React dev server on :3000

# Build
pnpm build            # Compile TypeScript to dist/server/
pnpm client:build     # Build React client to dist/client/

# Testing
pnpm test             # Run vitest in watch mode
pnpm test -- --run    # Run tests once (useful for CI/CD)
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
  - `BaseModel.ts` - Base class for all models (CRUD operations)
  - `ModelRegistry.ts` - Model registration and inheritance system
  - `types.ts` - Type definitions (Domain, Fields, etc.)
  - `fields.ts` - Field type system (integer, float, string, text, boolean, date, datetime, selection, many2one, one2many, many2many, json, monetary, image)
  - `guards.ts` - Type guards and validation helpers

- **`core/server/api/`** - Auto-generated REST endpoints
  - `rest.ts` - CRUD routes: `/api/<model>` (dots become slashes: `sale.order` → `/api/sale/order`)
  - `views.ts` - View/menu API endpoints (ViewService)
  - `upload.ts` - File upload handling
  - Model actions: `POST /api/<model>/:id/action/:name`

- **`core/server/module-loader/`** - Addon discovery and dependency resolution
  - `index.ts` - ModuleLoader class
  - `graph.ts` - Topological sort for dependency resolution

- **`core/server/services/`** - Core services
  - `Environment.ts` - Execution context with model access (`env.model()`)
  - `PoolQueryable.ts` - PostgreSQL pool abstraction

- **`core/client/api/`** - API abstraction layer (dependency injection for testing)
  - `client.ts` - FetchApiClient (production HTTP client)
  - `mock.ts` - MockApiClient (for unit tests)
  - `types.ts` - ApiClient interface and types

- **`core/client/stores/`** - State management (observable pattern)
  - `base.ts` - Base Store class (compatible with useSyncExternalStore)
  - `model.ts` - ModelStore (CRUD operations)
  - `view.ts` - ViewStore, ActionStore, MenuStore
  - `useStore.ts` - React hooks bridge

- **`core/client/engine/`** - React view rendering engine
  - `ViewRenderer.tsx` - Main dynamic view renderer
  - `views/` - ListView, FormView, TimesheetGridView
  - `fields/` - Field renderers (TextField, NumberField, DateField, etc.)
  - `hooks/` - useView, useAction, useMenus

- **`core/client/components/`** - Application UI
  - `App.tsx` - Root component with routing
  - `layout/` - AppHeader, Sidebar, MainContent, MenuTree

- **`core/shared/`** - Code shared between server and client
  - `erp-date/` - ErpDate and ErpDateTime value objects (immutable, timezone-safe)
  - `erp-hours/` - ErpHours value object for time tracking
  - `utils/` - Shared utilities (errors, query-params)

### Addons (`addons/`)

Business modules following Odoo conventions. Each addon contains:
- `manifest.json` - Module metadata and dependencies
- `models/*.ts` - TypeScript model definitions
- `views/*.json` - View, action, and menu definitions
- `migrations/*.cjs` - Database migrations (CommonJS, `up(pool)`/`down(pool)`)
- `security/access.json` - Access control rules
- `data/*.json` - Initial data (loaded via `data` array in manifest)
- `tests/*.test.ts` - Vitest test files

Current addons: `base`, `sales`, `project`, `timesheet`

### Path Aliases

```typescript
import { BaseModel } from '@core/server/orm/index.js';
import type { FieldsCollection } from '@core/server/orm/types.js';
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

  // Optional: sequence code for automatic reference generation
  static _sequence = 'module.model';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Name' },
    reference: { type: 'string', label: 'Reference' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Partner' },
    state: {
      type: 'selection',
      options: [['draft', 'Draft'], ['done', 'Done']],
      default: 'draft',
    },
  };

  // Override create to generate automatic reference
  override async create(values: Record<string, unknown>): Promise<MyModel> {
    if (!values.reference) {
      const Sequence = this.env.model<typeof IrSequence>('ir.sequence');
      values.reference = await Sequence.nextByCode('module.model');
    }
    return super.create(values) as Promise<MyModel>;
  }

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
import { registry } from '@core/server/orm/index.js';

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

### Environment and Model Access

```typescript
// Access a model with generic typing
const Partner = env.model<typeof ResPartner>('res.partner');
const partners = await Partner.search([['is_company', '=', true]]);

// Read data
const data = await partners.read(['name', 'email']);

// Create with context
const envFR = env.withContext({ lang: 'fr_FR' });
const Order = envFR.model('sale.order');
```

### Automatic Sequences (ir.sequence)

Configure in `data/init.json`:
```json
{
  "ir.sequence": [
    {
      "id": 100,
      "name": "My Model",
      "code": "module.model",
      "prefix": "MOD%(year)-",
      "padding": 5,
      "number_next": 1,
      "use_date_range": true
    }
  ]
}
```

Available variables in prefix/suffix: `%(year)`, `%(month)`, `%(day)`

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
          "notebook": [{ "label": "Lines", "content": { "field": "line_ids", "widget": "one2many", "tree": ["product_id", "qty"] }}],
          "footer": {
            "fields": [{ "field": "amount_total", "widget": "monetary" }]
          }
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

// Operators: =, !=, >, >=, <, <=, in, not in, like, ilike
```

### ErpDate and ErpDateTime (Value Objects)

```typescript
import { ErpDate, ErpDateTime } from '@core/shared/erp-date/index.js';

// ErpDate - for calendar dates (no time component)
const today = ErpDate.today();
const date = ErpDate.fromISOString('2026-01-15');
const nextWeek = today.addDays(7);
console.log(date.toISOString()); // '2026-01-15'

// ErpDateTime - for timestamps
const now = ErpDateTime.now();
const dt = ErpDateTime.fromISO('2026-01-15T14:30:00');
console.log(dt.toISO()); // '2026-01-15T14:30:00'
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

### Testing Stores (Client)

```typescript
import { MockApiClient } from '@core/client/api/mock.js';
import { ModelStore } from '@core/client/stores/model.js';

const mockApi = new MockApiClient({
  'res.partner': [{ id: 1, name: 'Test Partner' }],
});

const store = new ModelStore(mockApi, 'res.partner');
await store.search();
expect(store.getSnapshot().records).toHaveLength(1);
```

## Configuration

Server and database settings in `config/default.json`:
- Server runs on port 8069 by default
- Modules to load are specified in the `modules` array
- Database connection settings for PostgreSQL

## Build Output

- `dist/server/` - Compiled server TypeScript
- `dist/client/` - Built React application

## Reference

This project follows Odoo architectural patterns. When making design decisions, consult the Odoo reference in `.claude/skills/odoo-reference.md` for guidance on module structure, ORM patterns, and view definitions.
