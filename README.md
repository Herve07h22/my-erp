# My ERP

ERP modulaire open-source inspiré de l'architecture d'Odoo, construit avec Node.js, TypeScript, PostgreSQL et React.

## Architecture

```
my-erp/
├── core/                    # Framework
│   ├── server/              # Backend Node.js/TypeScript
│   │   ├── module-loader/   # Découverte et chargement des addons
│   │   ├── orm/             # ORM avec héritage
│   │   ├── api/             # Routes REST auto-générées
│   │   └── services/        # Auth, environnement...
│   ├── client/              # Frontend React
│   │   ├── engine/          # Rendu dynamique des vues
│   │   │   ├── components/  # Composants de navigation
│   │   │   ├── fields/      # Rendu des champs
│   │   │   ├── hooks/       # Hooks React
│   │   │   └── views/       # Vues (List, Form, TimesheetGrid)
│   │   └── components/      # Composants UI
│   └── shared/              # Code partagé
│       └── utils/           # Utilitaires partagés
├── addons/                  # Modules métier
│   ├── base/                # Utilisateurs, partenaires, config
│   ├── sales/               # Ventes, produits, commandes
│   ├── project/             # Projets et tâches
│   └── timesheet/           # Feuilles de temps
├── config/
│   └── default.json         # Configuration
└── server.ts                # Point d'entrée
```

## Prérequis

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 9.15.0

## Installation

```bash
# Cloner le projet
cd /Users/herve/Documents/projets/my-erp

# Installer les dépendances (workspace monorepo)
pnpm install

# Créer la base de données
pnpm run db:create
# ou manuellement: createdb my_erp

# Compiler le projet TypeScript
pnpm run build

# Compiler le client React
pnpm run client:build

# Lancer le serveur
pnpm start
```

## Scripts disponibles

- `pnpm start` - Lance le serveur (nécessite un build préalable)
- `pnpm dev` - Lance le serveur en mode développement avec hot-reload
- `pnpm build` - Compile le code TypeScript
- `pnpm client:build` - Compile le client React
- `pnpm client:dev` - Lance le client React en mode développement
- `pnpm db:create` - Crée la base de données
- `pnpm db:drop` - Supprime la base de données
- `pnpm db:reset` - Réinitialise la base de données
- `pnpm test` - Lance les tests
- `pnpm lint` - Vérifie le code avec ESLint

## Configuration

Modifier `config/default.json` :

```json
{
  "server": {
    "port": 8069,
    "host": "localhost"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "my_erp",
    "user": "postgres",
    "password": "postgres",
    "max": 20,
    "idleTimeoutMillis": 30000
  },
  "addons_path": ["./addons"],
  "modules": ["base", "sales", "project", "timesheet"],
  "session": {
    "secret": "change-this-secret-in-production",
    "maxAge": 86400000
  },
  "logging": {
    "level": "info"
  }
}
```

## API REST

Une fois le serveur démarré, l'API est accessible sur `http://localhost:8069/api` :

| Endpoint | Description |
|----------|-------------|
| `GET /api/models` | Liste des modèles |
| `GET /api/models/:model` | Métadonnées d'un modèle |
| `GET /api/menus` | Structure des menus |
| `GET /api/actions/:id` | Détails d'une action |
| `GET /api/<model>` | Liste des enregistrements |
| `POST /api/<model>` | Créer un enregistrement |
| `GET /api/<model>/:id` | Lire un enregistrement |
| `PUT /api/<model>/:id` | Modifier un enregistrement |
| `DELETE /api/<model>/:id` | Supprimer un enregistrement |
| `POST /api/<model>/:id/action/:name` | Exécuter une action de modèle (méthode) |

Note: Les modèles utilisent des points dans leur nom (ex: `sale.order`), mais dans l'URL ils sont remplacés par des slashes (ex: `/api/sale/order`).

## Créer un Addon

1. Créer un dossier dans `addons/`
2. Ajouter un `manifest.json` :

```json
{
  "name": "mon_module",
  "version": "1.0.0",
  "label": "Mon Module",
  "category": "Custom",
  "description": "Description du module",
  "depends": ["base"],
  "autoInstall": false,
  "models": ["models/*.js"],
  "views": ["views/*.json"],
  "data": ["data/init.json"],
  "security": ["security/access.json"],
  "migrations": ["migrations/*.js"],
  "author": "Votre nom",
  "license": "LGPL-3"
}
```

3. Créer la structure de dossiers :
   - `models/` - Modèles TypeScript (compilés en `.js`)
   - `views/` - Définitions de vues JSON
   - `data/` - Données initiales (optionnel)
   - `security/` - Règles d'accès (optionnel)
   - `migrations/` - Migrations de base de données

4. Créer les modèles dans `models/` (fichiers `.ts`)
5. Créer les vues dans `views/` (fichiers `.json`)
6. Ajouter le module à `config/default.json` dans la liste `modules`

## Les Vues

Les vues définissent comment les modèles sont affichés dans l'interface utilisateur. Chaque fichier JSON dans `views/` peut contenir des **vues**, des **actions** et des **menus**.

### Structure d'un fichier de vues

```json
{
  "views": [...],
  "actions": [...],
  "menus": [...]
}
```

### Types de vues

Le système supporte plusieurs types de vues :

- **`form`** : Formulaire pour créer/éditer un enregistrement
- **`list`** : Liste/tableau pour afficher plusieurs enregistrements
- **`grid`** : Vue grille spécialisée (ex: feuilles de temps)

### Vue Formulaire (form)

La vue formulaire permet de créer et modifier un enregistrement. Elle utilise une architecture déclarative via l'objet `arch` :

```json
{
  "id": "res_partner_form",
  "model": "res.partner",
  "type": "form",
  "arch": {
    "header": {
      "buttons": [
        { "name": "actionArchive", "label": "Archiver", "type": "action" }
      ],
      "statusbar": { "field": "state" }
    },
    "sheet": {
      "groups": [
        {
          "label": "Informations générales",
          "fields": ["name", "email", "phone"]
        }
      ],
      "notebook": [
        {
          "label": "Contacts",
          "content": {
            "field": "child_ids",
            "widget": "one2many",
            "tree": ["name", "email", "phone"]
          }
        }
      ],
      "footer": {
        "fields": [
          { "field": "amount_total", "widget": "monetary" }
        ]
      }
    }
  }
}
```

**Structure de l'architecture (`arch`) :**

- **`header.buttons`** : Boutons d'action dans l'en-tête (voir [Actions de modèle](#2-actions-de-modèle-boutons-dans-les-vues) ci-dessous)
  - `name` : Nom de la méthode du modèle à appeler (ex: `actionConfirm`)
  - `label` : Libellé du bouton
  - `type` : Toujours `"action"` pour les actions de modèle
  - `states` : États où le bouton est visible/enabled (ex: `["draft", "sent"]`)
  - Le bouton appelle la méthode via `/api/<model>/:id/action/:name`

- **`header.statusbar`** : Barre de statut affichant les états possibles
  - `field` : Nom du champ de type `selection` à afficher

- **`sheet.groups`** : Groupes de champs avec un label
  - `label` : Titre du groupe
  - `fields` : Liste des noms de champs à afficher

- **`sheet.notebook`** : Onglets pour organiser les champs
  - `label` : Titre de l'onglet
  - `content.fields` : Champs simples à afficher
  - `content.field` + `widget: "one2many"` : Champ relationnel avec liste
    - `tree` : Colonnes à afficher dans la liste

- **`sheet.footer`** : Pied de page avec champs calculés
  - `fields` : Liste de champs (souvent en lecture seule)

### Vue Liste (list)

La vue liste affiche les enregistrements dans un tableau :

```json
{
  "id": "res_partner_list",
  "model": "res.partner",
  "type": "list",
  "arch": {
    "fields": ["name", "email", "phone", "city", "country"]
  }
}
```

**Propriétés :**

- **`fields`** : Liste des colonnes à afficher (ordre respecté)
- **`allowGrid`** : Si `true`, permet de basculer vers la vue grille

### Actions

Il existe **deux types d'actions** distincts dans le système :

#### 1. Actions de navigation (`ir.actions.act_window`)

Ces actions définissent comment ouvrir une vue depuis un menu ou un autre endroit. Elles sont déclarées dans le tableau `actions` du fichier JSON et utilisées par les menus.

```json
{
  "id": "action_res_partner",
  "type": "ir.actions.act_window",
  "name": "Contacts",
  "model": "res.partner",
  "views": [["res_partner_list", "list"], ["res_partner_form", "form"]],
  "domain": [["is_company", "=", false]]
}
```

**Signification de `ir.actions.act_window` :**

Cette notation est héritée de la convention d'Odoo et suit le format `module.model` :

- **`ir`** : Module "Infrastructure" (infrastructure système)
- **`actions`** : Modèle "Actions" (actions système)
- **`act_window`** : Type d'action "Act Window" (action qui ouvre une fenêtre/vue)

Dans ce projet, `ir.actions.act_window` est le seul type d'action de navigation supporté. Il indique que l'action doit ouvrir une vue (fenêtre) pour afficher un modèle. La structure permet d'ajouter d'autres types d'actions à l'avenir (comme `ir.actions.act_url` pour ouvrir une URL, `ir.actions.server` pour exécuter du code serveur, etc.).

**Propriétés :**

- **`id`** : Identifiant unique de l'action (référencé par les menus)
- **`type`** : Toujours `ir.actions.act_window` pour les actions de navigation
- **`name`** : Titre affiché dans l'interface
- **`model`** : Modèle cible à afficher
- **`views`** : Liste des vues disponibles `[["vue_id", "type"], ...]`
  - La première vue est utilisée par défaut
  - L'utilisateur peut basculer entre les vues
- **`domain`** : Filtre par défaut (format domaine Odoo, optionnel)

**Fonctionnement :**
- Lorsqu'un menu avec une `action` est cliqué, le système récupère l'action via `/api/actions/:id`
- L'action définit quel modèle afficher et quelles vues utiliser
- Le frontend navigue vers la vue appropriée

#### 2. Actions de modèle (boutons dans les vues)

Ces actions invoquent des méthodes définies dans le modèle TypeScript. Elles sont déclarées dans `arch.header.buttons` des vues formulaire.

```json
{
  "header": {
    "buttons": [
      { "name": "actionConfirm", "label": "Confirmer", "type": "action", "states": ["draft", "sent"] },
      { "name": "actionCancel", "label": "Annuler", "type": "action", "states": ["draft", "sent", "sale"] }
    ]
  }
}
```

**Propriétés :**

- **`name`** : Nom de la méthode du modèle à appeler (ex: `actionConfirm`, `actionCancel`)
- **`label`** : Libellé du bouton
- **`type`** : Toujours `"action"` pour les actions de modèle
- **`states`** : États où le bouton est visible/enabled (optionnel)
  - Le bouton est désactivé si l'état actuel n'est pas dans la liste

**Fonctionnement :**
- Lorsqu'un bouton est cliqué, le frontend appelle `/api/<model>/:id/action/:name`
- Le backend exécute la méthode correspondante sur le recordset
- La méthode doit être définie dans le modèle TypeScript :

```typescript
// Dans le modèle sale.order
export default Model.define({
  name: 'sale.order',
  // ...
  methods: {
    async actionConfirm() {
      // Logique métier pour confirmer la commande
      this.state = 'sale';
      await this.save();
      return { success: true };
    },
    async actionCancel() {
      this.state = 'cancel';
      await this.save();
      return { success: true };
    }
  }
});
```

**Différence clé :**
- **Actions de navigation** : Déclenchent un changement de vue (menu → vue)
- **Actions de modèle** : Exécutent du code métier sur l'enregistrement actuel (bouton → méthode)

### Menus

Les menus créent la structure de navigation :

```json
{
  "id": "menu_contacts_root",
  "label": "Contacts",
  "sequence": 5
},
{
  "id": "menu_contacts_all",
  "parent": "menu_contacts_root",
  "action": "action_res_partner",
  "label": "Tous les contacts",
  "sequence": 1
}
```

**Propriétés :**

- **`id`** : Identifiant unique
- **`label`** : Libellé affiché
- **`parent`** : ID du menu parent (optionnel, pour créer une hiérarchie)
- **`action`** : ID de l'action à exécuter au clic
- **`sequence`** : Ordre d'affichage (plus petit = plus haut)

### Exemple complet

Voici un exemple complet pour un modèle de commande :

```json
{
  "views": [
    {
      "id": "sale_order_form",
      "model": "sale.order",
      "type": "form",
      "arch": {
        "header": {
          "buttons": [
            { "name": "actionConfirm", "label": "Confirmer", "type": "action", "states": ["draft", "sent"] },
            { "name": "actionCancel", "label": "Annuler", "type": "action", "states": ["draft", "sent", "sale"] }
          ],
          "statusbar": { "field": "state" }
        },
        "sheet": {
          "groups": [
            {
              "label": "Informations générales",
              "fields": ["name", "partner_id", "date_order"]
            }
          ],
          "notebook": [
            {
              "label": "Lignes de commande",
              "content": {
                "field": "line_ids",
                "widget": "one2many",
                "tree": ["product_id", "name", "product_uom_qty", "price_unit", "price_subtotal"]
              }
            }
          ],
          "footer": {
            "fields": [
              { "field": "amount_untaxed", "widget": "monetary" },
              { "field": "amount_total", "widget": "monetary" }
            ]
          }
        }
      }
    },
    {
      "id": "sale_order_list",
      "model": "sale.order",
      "type": "list",
      "arch": {
        "fields": ["name", "partner_id", "date_order", "amount_total", "state"]
      }
    }
  ],
  "actions": [
    {
      "id": "action_sale_orders",
      "type": "ir.actions.act_window",
      "name": "Commandes",
      "model": "sale.order",
      "views": [["sale_order_list", "list"], ["sale_order_form", "form"]]
    }
  ],
  "menus": [
    { "id": "menu_sales_root", "label": "Ventes", "sequence": 10 },
    { "id": "menu_sales_orders", "parent": "menu_sales_root", "action": "action_sale_orders", "label": "Commandes", "sequence": 1 }
  ]
}
```

### Rendu côté client

Le frontend React charge automatiquement les définitions de vues via l'API `/api/views/<model>/<type>` et les rend dynamiquement :

- Les champs sont rendus selon leur type (texte, nombre, date, sélection, relation, etc.)
- Les boutons d'action appellent les méthodes du modèle via `/api/<model>/:id/action/:name`
- Les champs `one2many` permettent d'ajouter/supprimer des enregistrements liés
- La validation des champs requis est effectuée automatiquement

### API des vues

- `GET /api/views` - Liste toutes les vues
- `GET /api/views/<model>` - Liste les vues d'un modèle
- `GET /api/views/<model>/<type>` - Récupère une vue spécifique
- `GET /api/actions/:id` - Récupère une action de navigation (`ir.actions.act_window`)
- `GET /api/menus` - Récupère l'arbre des menus
- `POST /api/<model>/:id/action/:name` - Exécute une action de modèle (méthode du modèle)

## Concepts Clés

### Héritage de Modèles

```typescript
// Extension d'un modèle existant
import { Model } from '@core/server/orm';

export default Model.define({
  name: 'sale.order',
  inherit: 'sale.order',
  fields: {
    custom_field: { type: 'string', label: 'Mon champ' }
  },
  methods: {
    async actionConfirm() {
      await super.actionConfirm();  // Appel méthode parente
      // Logique additionnelle...
    }
  }
});
```

### Domaines de Recherche

```typescript
// Format Odoo-like
const orders = await Order.search([
  ['state', '=', 'draft'],
  ['amount_total', '>', 1000]
]);
```

### Structure d'un Addon

Chaque addon peut contenir :
- **models/** : Modèles TypeScript définissant les entités métier
- **views/** : Définitions JSON des vues (list, form, etc.)
- **data/** : Données initiales au format JSON
- **security/** : Règles de contrôle d'accès
- **migrations/** : Scripts de migration de base de données JavaScript

## Licence

LGPL-3.0
