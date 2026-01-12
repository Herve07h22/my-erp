# Tutoriel : Créer un nouvel addon

Ce tutoriel vous guide pas à pas pour créer un nouvel addon dans My ERP. Nous allons créer un module de gestion immobilière qui permet de gérer des annonces de biens immobiliers à vendre.

## Exemple : Module de gestion immobilière

Notre addon permettra de :
- Créer et gérer des annonces immobilières
- Stocker les informations d'un bien (adresse, prix, surface, etc.)
- Gérer des photos pour chaque bien
- Avoir une vue liste et une vue formulaire

## Étape 1 : Créer la structure de dossiers

Créez la structure suivante dans le répertoire `addons/` :

```
addons/
└── real_estate/
    ├── manifest.json
    ├── models/
    │   ├── index.ts
    │   └── property.ts
    ├── migrations/
    │   └── 001_initial.js
    ├── views/
    │   └── property.json
    ├── security/
    │   └── access.json
    ├── tests/
    │   └── views.test.ts
    └── data/
        └── init.json (optionnel)
```

Créez le dossier et les fichiers :

```bash
mkdir -p addons/real_estate/{models,migrations,views,security,tests,data}
touch addons/real_estate/manifest.json
touch addons/real_estate/models/index.ts
touch addons/real_estate/models/property.ts
touch addons/real_estate/migrations/001_initial.js
touch addons/real_estate/views/property.json
touch addons/real_estate/security/access.json
touch addons/real_estate/tests/views.test.ts
```

## Étape 2 : Créer le manifest.json

Le fichier `manifest.json` décrit votre module et indique au système quels fichiers charger.

**`addons/real_estate/manifest.json`** :

```json
{
  "name": "real_estate",
  "version": "1.0.0",
  "label": "Immobilier",
  "category": "Sales",
  "description": "Gestion des annonces immobilières",
  "depends": ["base"],
  "autoInstall": false,
  "models": ["models/*.js"],
  "views": ["views/*.json"],
  "data": [],
  "security": ["security/access.json"],
  "migrations": ["migrations/*.js"],
  "author": "Votre nom",
  "license": "LGPL-3"
}
```

**Explication :**
- `name` : Identifiant unique du module (sans espaces, en minuscules)
- `depends` : Modules requis (ici `base` pour avoir accès aux partenaires)
- `models` : Patterns pour trouver les fichiers de modèles (compilés en `.js`)
- `views` : Patterns pour trouver les fichiers de vues
- `migrations` : Patterns pour trouver les migrations

## Étape 3 : Créer le modèle TypeScript

Le modèle définit la structure des données et les méthodes métier.

**`addons/real_estate/models/property.ts`** :

```typescript
import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';
import type IrSequence from '../../base/models/ir_sequence.js';

/**
 * Modèle Bien Immobilier
 * Représente une annonce immobilière
 */
class Property extends BaseModel {
  static override _name = 'real_estate.property';
  static override _table = 'real_estate_property';
  static override _order = 'create_date DESC';

  /** Code de la séquence utilisée pour générer les références automatiques */
  static _sequence = 'real_estate.property';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },

    // Informations de base
    name: {
      type: 'string',
      required: true,
      label: 'Titre de l\'annonce',
      size: 255
    },
    reference: {
      type: 'string',
      label: 'Référence',
      size: 64
    },
    
    // Type de bien
    property_type: {
      type: 'selection',
      options: [
        ['house', 'Maison'],
        ['apartment', 'Appartement'],
        ['land', 'Terrain'],
        ['commercial', 'Local commercial'],
        ['office', 'Bureau'],
      ],
      required: true,
      default: 'house',
      label: 'Type de bien',
    },
    
    // Localisation
    street: { type: 'string', label: 'Rue', size: 255 },
    street2: { type: 'string', label: 'Complément d\'adresse', size: 255 },
    city: { type: 'string', required: true, label: 'Ville', size: 128 },
    zip: { type: 'string', label: 'Code postal', size: 24 },
    country: { type: 'string', default: 'France', label: 'Pays', size: 128 },
    
    // Caractéristiques
    surface: { 
      type: 'float', 
      label: 'Surface (m²)',
      default: 0
    },
    rooms: { 
      type: 'integer', 
      label: 'Nombre de pièces',
      default: 0
    },
    bedrooms: { 
      type: 'integer', 
      label: 'Chambres',
      default: 0
    },
    bathrooms: { 
      type: 'integer', 
      label: 'Salles de bain',
      default: 0
    },
    floor: { 
      type: 'integer', 
      label: 'Étage',
      default: 0
    },
    has_elevator: { 
      type: 'boolean', 
      default: false, 
      label: 'Ascenseur' 
    },
    has_parking: { 
      type: 'boolean', 
      default: false, 
      label: 'Parking' 
    },
    has_balcony: { 
      type: 'boolean', 
      default: false, 
      label: 'Balcon' 
    },
    has_garden: { 
      type: 'boolean', 
      default: false, 
      label: 'Jardin' 
    },
    garden_surface: { 
      type: 'float', 
      label: 'Surface du jardin (m²)',
      default: 0
    },
    
    // Prix et vente
    selling_price: { 
      type: 'monetary', 
      required: true, 
      label: 'Prix de vente',
      default: 0
    },
    state: {
      type: 'selection',
      options: [
        ['draft', 'Brouillon'],
        ['published', 'Publié'],
        ['sold', 'Vendu'],
        ['cancelled', 'Annulé'],
      ],
      default: 'draft',
      label: 'État',
    },
    
    // Relations
    partner_id: {
      type: 'many2one',
      relation: 'res.partner',
      label: 'Propriétaire/Vendeur',
    },
    agent_id: {
      type: 'many2one',
      relation: 'res.users',
      label: 'Agent immobilier',
    },
    seller_id: {
      type: 'many2one',
      relation: 'res.users',
      label: 'Vendeur (utilisateur ayant réalisé la vente)',
    },
    
    // Description et photos
    description: { 
      type: 'text', 
      label: 'Description' 
    },
    photo_urls: {
      type: 'json',
      label: 'URLs des photos',
      default: (): string[] => [],
    },
    main_photo_url: {
      type: 'image',
      label: 'Photo principale',
    },
    
    // Métadonnées
    active: { type: 'boolean', default: true, label: 'Actif' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Crée un bien avec génération automatique de la référence via ir.sequence
   */
  override async create(values: Record<string, unknown>): Promise<Property> {
    if (!values.reference) {
      // Utilise le système de séquences pour générer une référence unique
      const Sequence = this.env.model<IrSequence>('ir.sequence');
      values.reference = await Sequence.nextByCode(
        (this.constructor as typeof Property)._sequence
      );
    }
    return (await super.create(values)) as Property;
  }

  /**
   * Publie l'annonce
   */
  async actionPublish(): Promise<boolean> {
    return this.write({ state: 'published' });
  }

  /**
   * Marque le bien comme vendu
   * @throws Error si aucun vendeur n'est assigné
   */
  async actionSold(): Promise<boolean> {
    const data = await this.read(['seller_id']);
    if (!data[0]?.seller_id) {
      throw new Error('Veuillez assigner un vendeur avant de marquer le bien comme vendu');
    }
    return this.write({ state: 'sold' });
  }

  /**
   * Annule l'annonce
   */
  async actionCancel(): Promise<boolean> {
    return this.write({ state: 'cancelled' });
  }

  /**
   * Remet en brouillon
   */
  async actionDraft(): Promise<boolean> {
    return this.write({ state: 'draft' });
  }
}

export default Property;
```

**`addons/real_estate/models/index.ts`** :

```typescript
export { default as Property } from './property.js';
```

**Points importants :**
- Le nom du modèle suit la convention `module_name.model_name` (ex: `real_estate.property`)
- Le nom de la table suit la convention `module_name_model_name` (ex: `real_estate_property`)
- Les champs `many2one` créent des relations avec d'autres modèles
- Le type `json` permet de stocker un tableau d'URLs pour les photos
- Les méthodes `action*` peuvent être appelées depuis les boutons des vues

## Étape 4 : Créer la migration

La migration crée la table dans la base de données.

**`addons/real_estate/migrations/001_initial.js`** :

```javascript
/**
 * Migration initiale pour le module real_estate
 * Crée la table real_estate_property
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS real_estate_property (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      reference VARCHAR(64),
      property_type VARCHAR(64) NOT NULL DEFAULT 'house',
      street VARCHAR(255),
      street2 VARCHAR(255),
      city VARCHAR(128) NOT NULL,
      zip VARCHAR(24),
      country VARCHAR(128) DEFAULT 'France',
      surface DECIMAL(15,4) DEFAULT 0,
      rooms INTEGER DEFAULT 0,
      bedrooms INTEGER DEFAULT 0,
      bathrooms INTEGER DEFAULT 0,
      floor INTEGER DEFAULT 0,
      has_elevator BOOLEAN DEFAULT false,
      has_parking BOOLEAN DEFAULT false,
      has_balcony BOOLEAN DEFAULT false,
      has_garden BOOLEAN DEFAULT false,
      garden_surface DECIMAL(15,4) DEFAULT 0,
      selling_price DECIMAL(15,2) NOT NULL DEFAULT 0,
      state VARCHAR(64) DEFAULT 'draft',
      partner_id INTEGER REFERENCES res_partner(id),
      agent_id INTEGER REFERENCES res_users(id),
      seller_id INTEGER REFERENCES res_users(id),
      description TEXT,
      photo_urls JSONB DEFAULT '[]'::jsonb,
      main_photo_url TEXT,
      active BOOLEAN DEFAULT true,
      create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      write_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index pour améliorer les performances
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_real_estate_property_city 
    ON real_estate_property(city);
  `);
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_real_estate_property_state 
    ON real_estate_property(state);
  `);
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_real_estate_property_type 
    ON real_estate_property(property_type);
  `);
}

async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS real_estate_property;`);
}

module.exports = { up, down };
```

**Note :** Les migrations sont exécutées automatiquement au démarrage du serveur si la table n'existe pas.

## Étape 5 : Configurer la séquence pour les références automatiques

Le système `ir.sequence` permet de générer automatiquement des références uniques pour les enregistrements (comme `PROP2026-00001` pour un bien immobilier). Cette fonctionnalité est fournie par le module `base`.

### Comment fonctionne une séquence ?

Une séquence est composée de :
- **code** : Identifiant technique unique (ex: `real_estate.property`)
- **prefix** : Préfixe ajouté avant le numéro (ex: `PROP%(year)` → `PROP2026`)
- **suffix** : Suffixe ajouté après le numéro (optionnel)
- **padding** : Nombre de chiffres pour le numéro (ex: 5 → `00001`)
- **number_next** : Prochain numéro à utiliser
- **number_increment** : Pas d'incrémentation (généralement 1)
- **use_date_range** : Active l'interpolation des dates dans prefix/suffix

### Variables de date disponibles

Dans le préfixe et le suffixe, vous pouvez utiliser ces variables :
- `%(year)` ou `%y` : Année complète (ex: 2026)
- `%(month)` ou `%m` : Mois sur 2 chiffres (ex: 01)
- `%(day)` ou `%d` : Jour sur 2 chiffres (ex: 15)

Exemples de format :
- `PROP%(year)-` + padding 5 → `PROP2026-00001`
- `RE%(year)%(month)-` + padding 4 → `RE202601-0001`
- `` (vide) + padding 6 + suffix `-%(year)` → `000001-2026`

### Créer les données initiales de séquence

Créez le fichier `data/init.json` qui sera chargé au démarrage du module :

**`addons/real_estate/data/init.json`** :

```json
{
  "ir.sequence": [
    {
      "id": 100,
      "name": "Biens immobiliers",
      "code": "real_estate.property",
      "prefix": "PROP%(year)-",
      "padding": 5,
      "number_next": 1,
      "number_increment": 1,
      "use_date_range": true,
      "active": true
    }
  ]
}
```

**Explication :**
- `id: 100` : Un ID unique (utilisez des valeurs élevées pour éviter les conflits)
- `code: "real_estate.property"` : Doit correspondre à `static _sequence` dans le modèle
- `prefix: "PROP%(year)-"` : Génère `PROP2026-` pour l'année 2026
- `padding: 5` : Numéros sur 5 chiffres → `00001`, `00002`, etc.

Avec cette configuration, les références générées seront : `PROP2026-00001`, `PROP2026-00002`, etc.

### Mise à jour du manifest.json

N'oubliez pas d'ajouter le fichier init.json au manifest :

```json
{
  "name": "real_estate",
  "version": "1.0.0",
  "label": "Immobilier",
  "category": "Sales",
  "description": "Gestion des annonces immobilières",
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

### Utilisation dans le modèle

La séquence est utilisée automatiquement lors de la création d'un enregistrement grâce au code suivant dans `property.ts` :

```typescript
/** Code de la séquence utilisée pour générer les références automatiques */
static _sequence = 'real_estate.property';

override async create(values: Record<string, unknown>): Promise<Property> {
  if (!values.reference) {
    // Utilise le système de séquences pour générer une référence unique
    const Sequence = this.env.model<IrSequence>('ir.sequence');
    values.reference = await Sequence.nextByCode(
      (this.constructor as typeof Property)._sequence
    );
  }
  return (await super.create(values)) as Property;
}
```

**Points importants :**
- `_sequence` est une convention : c'est le code de la séquence à utiliser
- `nextByCode()` est atomique : pas de risque de doublon même avec des créations simultanées
- La référence n'est générée que si elle n'est pas déjà fournie

### Méthode `previewByCode` (optionnel)

Pour afficher un aperçu de la prochaine référence sans l'incrémenter (utile dans un formulaire) :

```typescript
const Sequence = this.env.model<IrSequence>('ir.sequence');
const preview = await Sequence.previewByCode('real_estate.property');
// Retourne "PROP2026-00042" sans incrémenter le compteur
```

## Étape 6 : Créer les vues

Les vues définissent comment afficher et éditer les données.

**`addons/real_estate/views/property.json`** :

```json
{
  "views": [
    {
      "id": "property_form",
      "model": "real_estate.property",
      "type": "form",
      "arch": {
        "header": {
          "buttons": [
            { "name": "actionPublish", "label": "Publier", "type": "action", "states": ["draft"] },
            { "name": "actionSold", "label": "Marquer comme vendu", "type": "action", "states": ["published"] },
            { "name": "actionCancel", "label": "Annuler", "type": "action", "states": ["draft", "published"] },
            { "name": "actionDraft", "label": "Remettre en brouillon", "type": "action", "states": ["cancelled"] }
          ],
          "statusbar": { "field": "state" }
        },
        "sheet": {
          "groups": [
            {
              "label": "Informations générales",
              "fields": ["name", "reference", "property_type", "state"]
            },
            {
              "label": "Localisation",
              "fields": ["street", "street2", "city", "zip", "country"]
            },
            {
              "label": "Caractéristiques",
              "fields": ["surface", "rooms", "bedrooms", "bathrooms", "floor"]
            },
            {
              "label": "Équipements",
              "fields": ["has_elevator", "has_parking", "has_balcony", "has_garden", "garden_surface"]
            },
            {
              "label": "Vente",
              "fields": ["selling_price", "partner_id", "agent_id", "seller_id"]
            }
          ],
          "notebook": [
            {
              "label": "Description",
              "content": {
                "fields": ["description"]
              }
            },
            {
              "label": "Photos",
              "content": {
                "fields": ["main_photo_url", "photo_urls"]
              }
            }
          ],
          "footer": {
            "fields": [
              { "field": "selling_price", "widget": "monetary" }
            ]
          }
        }
      }
    },
    {
      "id": "property_list",
      "model": "real_estate.property",
      "type": "list",
      "arch": {
        "fields": ["reference", "name", "property_type", "city", "surface", "rooms", "selling_price", "state"]
      }
    }
  ],
  "actions": [
    {
      "id": "action_properties",
      "type": "ir.actions.act_window",
      "name": "Annonces immobilières",
      "model": "real_estate.property",
      "views": [["property_list", "list"], ["property_form", "form"]]
    },
    {
      "id": "action_properties_published",
      "type": "ir.actions.act_window",
      "name": "Annonces publiées",
      "model": "real_estate.property",
      "domain": [["state", "=", "published"]],
      "views": [["property_list", "list"], ["property_form", "form"]]
    }
  ],
  "menus": [
    { "id": "menu_real_estate_root", "label": "Immobilier", "sequence": 20 },
    { 
      "id": "menu_real_estate_all", 
      "parent": "menu_real_estate_root", 
      "action": "action_properties", 
      "label": "Toutes les annonces", 
      "sequence": 1 
    },
    { 
      "id": "menu_real_estate_published", 
      "parent": "menu_real_estate_root", 
      "action": "action_properties_published", 
      "label": "Annonces publiées", 
      "sequence": 2 
    }
  ]
}
```

**Explication :**
- **Vue formulaire** : Organise les champs en groupes et onglets
- **Vue liste** : Affiche les colonnes principales
- **Actions** : Définissent les vues accessibles depuis les menus
- **Menus** : Créent la navigation dans l'interface

## Étape 7 : Créer le fichier de sécurité

Même si basique, il est requis.

**`addons/real_estate/security/access.json`** :

```json
{
  "access_rules": [
    {
      "model": "real_estate.property",
      "groups": ["base.group_user"],
      "perm_read": true,
      "perm_write": true,
      "perm_create": true,
      "perm_unlink": true
    }
  ]
}
```

## Étape 8 : Gérer les images avec upload

Le système supporte maintenant l'upload de fichiers ! Vous pouvez utiliser le type de champ `image` pour une image unique, ou un champ `json` pour plusieurs images.

### Utilisation du type `image` pour une photo principale

Dans votre modèle, utilisez le type `image` pour stocker l'URL d'une image unique :

```typescript
main_photo_url: {
  type: 'image',
  label: 'Photo principale (URL)',
  size: 512,
},
```

Dans la migration, créez une colonne TEXT :

```javascript
main_photo_url TEXT,
```

### Utilisation du type `json` pour plusieurs photos

Pour gérer plusieurs photos, utilisez le type `json` qui stocke un tableau d'URLs :

```typescript
photo_urls: {
  type: 'json',
  label: 'URLs des photos',
  default: (): string[] => [],
},
```

Dans la migration :

```javascript
photo_urls JSONB DEFAULT '[]'::jsonb,
```

**Important** : Le composant `ImageField` détecte automatiquement si un champ est pour plusieurs images en vérifiant si le nom se termine par `_urls` ou s'il s'appelle `photo_urls`.

### Comment ça fonctionne

1. **Backend** : Le système expose deux routes API :
   - `POST /api/upload` : Upload d'un seul fichier
   - `POST /api/upload/multiple` : Upload de plusieurs fichiers
   - `GET /uploads/:filename` : Servir les fichiers uploadés

2. **Frontend** : Le composant `ImageField` :
   - Affiche un aperçu des images existantes
   - Permet de sélectionner un ou plusieurs fichiers
   - Upload automatiquement les fichiers vers le serveur
   - Met à jour le champ avec l'URL retournée

3. **Stockage** : Les fichiers sont stockés dans le dossier `uploads/` à la racine du projet avec des noms uniques.

### Exemple dans la vue

Dans votre fichier de vue JSON, les champs `image` et `json` (pour les photos) sont automatiquement rendus avec le composant d'upload :

```json
{
  "notebook": [
    {
      "label": "Photos",
      "content": {
        "fields": ["main_photo_url", "photo_urls"]
      }
    }
  ]
}
```

Le champ `main_photo_url` (type `image`) affichera un bouton pour uploader une seule image.

Le champ `photo_urls` (type `json` avec nom se terminant par `_urls`) affichera une galerie avec possibilité d'ajouter plusieurs images.

### Configuration

Les fichiers sont stockés dans `uploads/` (créé automatiquement). Pour changer l'emplacement, modifiez `core/server/api/upload.ts`.

**Limites par défaut** :
- Taille max : 10 MB par fichier
- Formats acceptés : JPEG, PNG, GIF, WebP
- Max 10 fichiers pour l'upload multiple

### Note sur la migration

Si vous avez déjà créé votre addon avec des champs `string` pour les images, vous pouvez les convertir en `image` :

```sql
-- Dans une nouvelle migration
ALTER TABLE real_estate_property 
  ALTER COLUMN main_photo_url TYPE TEXT;
```

Le système fonctionne avec les deux types (`string` et `image`), mais `image` est recommandé pour une meilleure sémantique.

## Étape 9 : Activer l'addon

1. **Ajouter le module à la configuration** :

Éditez `config/default.json` et ajoutez `"real_estate"` à la liste des modules :

```json
{
  "modules": [
    "base",
    "sales",
    "project",
    "timesheet",
    "real_estate"
  ]
}
```

2. **Compiler le TypeScript** :

```bash
pnpm run build
```

3. **Démarrer le serveur** :

```bash
pnpm start
```

Le serveur va :
- Découvrir le module `real_estate`
- Charger les modèles
- Exécuter la migration (créer la table)
- Enregistrer les vues
- Créer les routes API

4. **Vérifier dans l'interface** :

- Connectez-vous à `http://localhost:8069`
- Vous devriez voir un nouveau menu "Immobilier" dans la barre latérale
- Cliquez dessus pour accéder aux annonces

## Étape 10 : Ajouter les tests automatiques

Chaque addon devrait avoir des tests pour valider ses vues. Le framework fournit un helper réutilisable.

1. **Créer le dossier et fichier de tests** :

```bash
mkdir -p addons/real_estate/tests
touch addons/real_estate/tests/views.test.ts
```

2. **Créer le test des vues** :

**`addons/real_estate/tests/views.test.ts`** :

```typescript
import path from 'path';
import { fileURLToPath } from 'url';
import { createAddonViewsTests } from '../../../core/test-helpers/addon-views-tests.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

createAddonViewsTests({
  addonName: 'real_estate',
  addonPath: path.resolve(__dirname, '..'),
  dependencies: ['base'],
});
```

Ce simple fichier génère automatiquement 2 tests :
- **Validation JSON** : Vérifie que les fichiers de vues respectent le schéma Zod
- **Cohérence modèle** : Vérifie que les champs, actions de boutons et modèles référencés existent

3. **Lancer les tests** :

```bash
pnpm test -- --run addons/real_estate
```

4. **Structure de tests recommandée** :

```
addons/real_estate/
├── tests/
│   ├── views.test.ts      # Tests de validation des vues
│   └── actions.test.ts    # Tests des actions métier (optionnel)
```

### Tester les actions métier

Les actions métier (méthodes `action*` des modèles) contiennent souvent de la logique importante qui doit être testée. Le framework fournit un helper `createTestEnv` qui crée un environnement de test complet avec une base de données en mémoire.

Par exemple, notre méthode `actionSold()` vérifie qu'un vendeur est assigné avant de marquer le bien comme vendu.

**`addons/real_estate/tests/actions.test.ts`** :

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import type { RecordData } from '../../../core/server/orm/types.js';
import Property from '../models/property.js';

describe('Real Estate - Actions métier', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];

  beforeEach(async () => {
    // Créer un environnement de test avec le module real_estate et ses dépendances
    const testEnv = await createTestEnv('real_estate', ['base']);
    env = testEnv.env;
  });

  describe('actionSold', () => {
    it('devrait lever une erreur si aucun vendeur n\'est assigné', async () => {
      const Property = env.model<Property>('real_estate.property');

      // Créer un bien sans seller_id
      const record: RecordData = {
        id: 1,
        name: 'Maison de test',
        property_type: 'house',
        city: 'Paris',
        selling_price: 300000,
        state: 'published',
        // Pas de seller_id
      };

      const created = await Property.create(record);

      // Vérifier que l'action lève une erreur
      await expect(created.actionSold()).rejects.toThrow(
        'Veuillez assigner un vendeur avant de marquer le bien comme vendu'
      );

      // Vérifier que le statut n'a pas changé
      const property = await Property.browse(1);
      expect(property.first?.state).toBe('published');
    });

    it('devrait passer le bien en statut "sold" si un vendeur est assigné', async () => {
      const Property = env.model<Property>('real_estate.property');

      // Créer un bien avec un seller_id
      const record: RecordData = {
        id: 1,
        name: 'Appartement de test',
        property_type: 'apartment',
        city: 'Lyon',
        selling_price: 250000,
        state: 'published',
        seller_id: 1, // Vendeur assigné
      };

      const created = await Property.create(record);
      const result = await created.actionSold();

      expect(result).toBe(true);

      // Vérifier que le statut a bien changé en base
      const updated = await Property.browse(1);
      expect(updated.first?.state).toBe('sold');
    });
  });

  describe('actionPublish', () => {
    it('devrait passer le bien de "draft" à "published"', async () => {
      const Property = env.model<Property>('real_estate.property');

      const record: RecordData = {
        id: 1,
        name: 'Terrain de test',
        property_type: 'land',
        city: 'Marseille',
        selling_price: 150000,
        state: 'draft',
      };

      const created = await Property.create(record);
      const result = await created.actionPublish();

      expect(result).toBe(true);

      const updated = await Property.browse(1);
      expect(updated.first?.state).toBe('published');
    });
  });

});
```

**Explication du test :**

1. **`createTestEnv`** : Crée un environnement de test complet avec une base de données en mémoire. Les modèles du module et de ses dépendances sont chargés.

2. **Création d'enregistrements** : On crée de vrais enregistrements avec `Property.create()` pour tester les actions.

3. **Test du cas d'erreur** : On vérifie que `actionSold()` lève une exception quand `seller_id` est absent, et que le statut reste inchangé.

4. **Test du cas nominal** : On vérifie que `actionSold()` change bien le statut à "sold" quand un vendeur est assigné.

5. **Vérification en base** : Après chaque action, on relit l'enregistrement avec `browse()` pour vérifier que les modifications ont bien été persistées.

**Lancer les tests** :

```bash
# Lancer tous les tests du module
pnpm test -- --run addons/real_estate

# Lancer uniquement les tests des actions
pnpm test -- --run addons/real_estate/tests/actions.test.ts
```

**Bonnes pratiques pour les tests d'actions métier** :

- Utiliser `createTestEnv` pour avoir un environnement réaliste
- Créer des enregistrements de test avec des données représentatives
- Tester les cas d'erreur (validations, contraintes métier)
- Tester les cas nominaux (happy path)
- Toujours vérifier l'état final en base avec `browse()`

## Étape 11 : Tester manuellement l'addon

1. **Créer une annonce** :
   - Cliquez sur "Toutes les annonces"
   - Cliquez sur "Nouveau"
   - Remplissez les champs (titre, ville, prix, etc.)
   - Ajoutez des URLs de photos dans le champ `photo_urls` (format JSON : `["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]`)
   - Cliquez sur "Enregistrer"

2. **Tester les actions** :
   - Cliquez sur "Publier" pour changer l'état
   - Cliquez sur "Marquer comme vendu" une fois publié

3. **Vérifier la liste** :
   - Retournez à la vue liste
   - Vérifiez que les colonnes s'affichent correctement

## Structure finale

Votre addon devrait ressembler à ceci :

```
addons/real_estate/
├── manifest.json
├── models/
│   ├── index.ts
│   └── property.ts
├── migrations/
│   └── 001_initial.js
├── views/
│   └── property.json
├── security/
│   └── access.json
└── tests/
    └── views.test.ts
```

## Prochaines étapes

Pour aller plus loin, vous pourriez :

1. **Ajouter des relations** :
   - Créer un modèle `real_estate.visit` pour les visites
   - Créer un modèle `real_estate.offer` pour les offres d'achat

2. **Améliorer les photos** :
   - Implémenter un vrai upload de fichiers
   - Créer un widget personnalisé pour gérer plusieurs photos

3. **Ajouter des vues spécialisées** :
   - Vue carte (map) pour localiser les biens
   - Vue galerie pour afficher les photos

4. **Ajouter des calculs** :
   - Prix au m² calculé automatiquement
   - Estimation automatique basée sur le quartier

## Résumé

Vous avez appris à :
- ✅ Créer la structure d'un addon
- ✅ Définir un modèle avec différents types de champs
- ✅ Créer une migration de base de données
- ✅ Configurer une séquence pour générer des références automatiques (ex: `PROP2026-00001`)
- ✅ Définir des vues (formulaire et liste)
- ✅ Créer des actions et menus
- ✅ Ajouter des méthodes métier au modèle avec validation
- ✅ Gérer les images (via URLs pour l'instant)
- ✅ Ajouter des tests automatiques pour valider les vues
- ✅ Tester les actions métier avec des mocks (validation du seller avant vente)

Le système est maintenant prêt à gérer vos annonces immobilières !
