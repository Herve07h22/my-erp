# ORM - Object-Relational Mapping

ORM inspiré d'Odoo pour la gestion des modèles de données avec PostgreSQL. Il offre un système de types riche, des relations entre modèles, l'héritage de modèles et une syntaxe de domaine pour les recherches.

## Architecture

```
core/server/orm/
├── index.ts          # Point d'entrée et exports publics
├── types.ts          # Définitions TypeScript (interfaces, types)
├── fields.ts         # Types de champs et génération SQL
├── guards.ts         # Type guards et helpers de validation
├── BaseModel.ts      # Classe de base des modèles (CRUD)
├── ModelRegistry.ts  # Registry central et système d'héritage
└── tests/
    └── fields.test.ts
```

## Types de champs supportés

| Type | Type SQL | Type JS | Description |
|------|----------|---------|-------------|
| `integer` | INTEGER | number | Entier |
| `float` | DECIMAL(15,4) | number | Décimal haute précision |
| `monetary` | DECIMAL(15,2) | number | Montant monétaire |
| `string` | VARCHAR(size) | string | Chaîne de caractères (défaut: 255) |
| `text` | TEXT | string | Texte long |
| `boolean` | BOOLEAN | boolean | Booléen |
| `date` | DATE | ErpDate | Date sans heure |
| `datetime` | TIMESTAMP | ErpDateTime | Date et heure |
| `selection` | VARCHAR(64) | string | Choix parmi une liste d'options |
| `json` | JSONB | object | Données JSON |
| `image` | TEXT | string | Image encodée en base64 |
| `many2one` | INTEGER (FK) | number | Relation N-1 |
| `one2many` | - (virtuel) | array | Relation 1-N inverse |
| `many2many` | - (table pivot) | array | Relation N-N |

## Définition d'un modèle

```typescript
import { BaseModel } from '@core/server/orm/index.js';
import type { FieldsCollection } from '@core/server/orm/types.js';

class SaleOrder extends BaseModel {
  // Nom technique du modèle (convention: module.model)
  static override _name = 'sale.order';

  // Nom de la table SQL (convention: module_model)
  static override _table = 'sale_order';

  // Ordre de tri par défaut
  static override _order = 'create_date DESC';

  // Définition des champs
  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Reference' },
    partner_id: {
      type: 'many2one',
      relation: 'res.partner',
      required: true,
      onDelete: 'RESTRICT',
      label: 'Client'
    },
    amount_total: { type: 'monetary', label: 'Total' },
    state: {
      type: 'selection',
      options: [
        ['draft', 'Brouillon'],
        ['confirmed', 'Confirmé'],
        ['done', 'Terminé'],
      ],
      default: 'draft',
      label: 'Statut',
    },
    order_date: { type: 'date', label: 'Date de commande' },
    notes: { type: 'text', label: 'Notes' },
    line_ids: {
      type: 'one2many',
      relation: 'sale.order.line',
      inverse: 'order_id',
      label: 'Lignes',
    },
  };

  // Méthodes d'action (appelables depuis les vues)
  async actionConfirm(): Promise<boolean> {
    return this.write({ state: 'confirmed' });
  }
}

export default SaleOrder;
```

### Options des champs

| Option | Type | Description |
|--------|------|-------------|
| `type` | FieldType | Type du champ (obligatoire) |
| `label` | string | Libellé affiché |
| `required` | boolean | Champ obligatoire |
| `unique` | boolean | Valeur unique |
| `primaryKey` | boolean | Clé primaire |
| `default` | any \| () => any | Valeur par défaut (valeur ou fonction) |
| `size` | number | Taille max pour les strings |
| `options` | [string, string][] | Options pour selection |
| `relation` | string | Modèle cible pour les relations |
| `inverse` | string | Champ inverse pour one2many |
| `onDelete` | 'CASCADE' \| 'SET NULL' \| 'RESTRICT' | Action on delete pour many2one |
| `compute` | string | Nom de la méthode de calcul |
| `store` | boolean | Stocker le champ calculé en base |

## ModelRegistry

Le `ModelRegistry` gère l'enregistrement et la compilation des modèles.

### Enregistrer un modèle

```typescript
import { ModelRegistry } from '@core/server/orm/index.js';
import SaleOrder from './models/sale_order.js';

const registry = new ModelRegistry();
registry.define(SaleOrder);
```

### Étendre un modèle existant (héritage)

Équivalent du `_inherit` d'Odoo pour ajouter des champs ou surcharger des méthodes :

```typescript
registry.extend({
  inherit: 'sale.order',
  fields: {
    custom_field: { type: 'string', label: 'Champ personnalisé' },
    priority: { type: 'selection', options: [['low', 'Basse'], ['high', 'Haute']] },
  },
  methods: {
    async actionConfirm() {
      // Appeler la méthode originale via _super
      await this._super?.();
      // Logique supplémentaire
      console.log('Commande confirmée avec extension !');
    },
  },
});
```

### Compiler un modèle

La compilation fusionne le modèle de base avec toutes ses extensions :

```typescript
const CompiledSaleOrder = registry.compile('sale.order');
```

## Environnement

L'environnement (`env`) encapsule le contexte d'exécution :

```typescript
interface EnvironmentInterface {
  pool: Queryable;              // Connexion PostgreSQL
  registry: ModelRegistryInterface;
  user: RecordData | null;      // Utilisateur courant
  context: Record<string, unknown>;
  lang: string;
  timezone: string;

  model(name: string): ModelInstance;  // Accéder à un modèle
  withContext(ctx: object): EnvironmentInterface;
  withUser(user: RecordData): EnvironmentInterface;
}
```

### Accéder à un modèle

```typescript
const Partner = env.model('res.partner');
const SaleOrder = env.model('sale.order');
```

## Opérations CRUD

### Create - Créer un enregistrement

```typescript
const partner = await Partner.create({
  name: 'John Doe',
  email: 'john@example.com',
  is_company: false,
});

console.log(partner.first.id); // ID du nouvel enregistrement
```

### Search - Rechercher des enregistrements

```typescript
// Recherche simple
const orders = await SaleOrder.search([
  ['state', '=', 'draft'],
]);

// Avec options
const recentOrders = await SaleOrder.search(
  [['partner_id', '=', partnerId]],
  { limit: 10, offset: 0, order: 'create_date DESC' }
);

// Compter les résultats
const count = await SaleOrder.searchCount([['state', '=', 'confirmed']]);
```

### Browse - Récupérer par ID

```typescript
const order = await SaleOrder.browse(42);
const orders = await SaleOrder.browse([1, 2, 3]);
```

### Read - Lire les champs

```typescript
// Lire tous les champs
const data = await order.read();

// Lire des champs spécifiques
const data = await order.read(['name', 'state', 'amount_total']);

// Résultat: [{ id: 42, name: 'SO001', state: 'draft', amount_total: 1500.00 }]
```

### Write - Mettre à jour

```typescript
await order.write({
  state: 'confirmed',
  notes: 'Commande validée',
});
```

### Unlink - Supprimer

```typescript
await order.unlink();
```

## Domaines de recherche

Les domaines utilisent une syntaxe inspirée d'Odoo : `[['champ', 'operateur', 'valeur'], ...]`

### Opérateurs disponibles

| Opérateur | Description | Exemple |
|-----------|-------------|---------|
| `=` | Égal | `['state', '=', 'draft']` |
| `!=` | Différent | `['state', '!=', 'done']` |
| `>` | Supérieur | `['amount', '>', 1000]` |
| `>=` | Supérieur ou égal | `['qty', '>=', 5]` |
| `<` | Inférieur | `['age', '<', 18]` |
| `<=` | Inférieur ou égal | `['stock', '<=', 0]` |
| `in` | Dans la liste | `['state', 'in', ['draft', 'confirmed']]` |
| `not in` | Pas dans la liste | `['type', 'not in', ['internal']]` |
| `like` | Contient (sensible casse) | `['name', 'like', '%test%']` |
| `ilike` | Contient (insensible casse) | `['email', 'ilike', '%@gmail.com']` |

### Exemples de domaines

```typescript
// Commandes en brouillon avec un montant > 1000
const domain = [
  ['state', '=', 'draft'],
  ['amount_total', '>', 1000],
];

// Partenaires dont le nom contient "acme" (insensible à la casse)
const domain = [
  ['name', 'ilike', '%acme%'],
];

// Produits dans plusieurs catégories
const domain = [
  ['category_id', 'in', [1, 2, 3]],
];
```

## Champs calculés

Les champs calculés sont définis avec l'option `compute` :

```typescript
static override _fields: FieldsCollection = {
  amount_untaxed: { type: 'monetary' },
  amount_tax: { type: 'monetary' },
  amount_total: {
    type: 'monetary',
    compute: '_computeAmountTotal',
    store: false, // Calculé à la volée
  },
};

async _computeAmountTotal(record: RecordData): Promise<number> {
  const untaxed = record.amount_untaxed as number || 0;
  const tax = record.amount_tax as number || 0;
  return untaxed + tax;
}
```

Si `store: true`, le champ est stocké en base et recalculé à chaque write.

## Itération sur les enregistrements

Le modèle implémente `Symbol.iterator` pour parcourir les enregistrements :

```typescript
const orders = await SaleOrder.search([['state', '=', 'draft']]);

for (const order of orders) {
  console.log(order.first?.id);
  await order.write({ state: 'confirmed' });
}
```

## Propriétés utiles

```typescript
const orders = await SaleOrder.search([]);

orders.ids;      // [1, 2, 3] - Liste des IDs
orders.length;   // 3 - Nombre d'enregistrements
orders.first;    // { id: 1, ... } - Premier enregistrement ou null
orders.records;  // Tableau complet des données
```

## Génération SQL

L'ORM peut générer le SQL de création de table :

```typescript
import { generateCreateTable } from '@core/server/orm/index.js';

const sql = generateCreateTable({
  _name: 'sale.order',
  _table: 'sale_order',
  _fields: SaleOrder._fields,
});

// Résultat:
// CREATE TABLE IF NOT EXISTS sale_order (
//   id SERIAL PRIMARY KEY,
//   name VARCHAR(255) NOT NULL,
//   partner_id INTEGER REFERENCES res_partner(id) ON DELETE RESTRICT,
//   amount_total DECIMAL(15,2),
//   state VARCHAR(64) DEFAULT 'draft',
//   ...
// );
```

## Typage TypeScript

L'ORM fournit des types pour une meilleure intégration TypeScript :

```typescript
import type {
  FieldType,
  FieldDefinition,
  FieldsCollection,
  Domain,
  DomainOperator,
  SearchOptions,
  RecordData,
  ModelInstance,
  EnvironmentInterface,
} from '@core/server/orm/types.js';
```

### Type helper ModelType

Pour typer correctement les modèles :

```typescript
import type { ModelType } from '@core/server/orm/types.js';

// Accepte soit typeof Model soit une instance
function processOrder<T extends typeof SaleOrder>(
  order: ModelType<T>
) {
  // ...
}
```
