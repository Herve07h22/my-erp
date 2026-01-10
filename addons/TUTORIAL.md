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
    └── data/
        └── init.json (optionnel)
```

Créez le dossier et les fichiers :

```bash
mkdir -p addons/real_estate/{models,migrations,views,security,data}
touch addons/real_estate/manifest.json
touch addons/real_estate/models/index.ts
touch addons/real_estate/models/property.ts
touch addons/real_estate/migrations/001_initial.js
touch addons/real_estate/views/property.json
touch addons/real_estate/security/access.json
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

/**
 * Modèle Bien Immobilier
 * Représente une annonce immobilière
 */
class Property extends BaseModel {
  static override _name = 'real_estate.property';
  static override _table = 'real_estate_property';
  static override _order = 'create_date DESC';

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
   * Génère automatiquement une référence unique
   */
  async create(values: Record<string, unknown>): Promise<unknown> {
    if (!values.reference) {
      // Générer une référence : PROP-YYYYMMDD-XXX
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      values.reference = `PROP-${dateStr}-${random}`;
    }
    return super.create(values);
  }

  /**
   * Publie l'annonce
   */
  async actionPublish(): Promise<boolean> {
    return this.write({ state: 'published' });
  }

  /**
   * Marque le bien comme vendu
   */
  async actionSold(): Promise<boolean> {
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

## Étape 5 : Créer les vues

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
              "fields": ["selling_price", "partner_id", "agent_id"]
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

## Étape 6 : Créer le fichier de sécurité

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

## Étape 7 : Gérer les images avec upload

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

## Étape 8 : Activer l'addon

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

## Étape 9 : Tester l'addon

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
└── security/
    └── access.json
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
- ✅ Définir des vues (formulaire et liste)
- ✅ Créer des actions et menus
- ✅ Ajouter des méthodes métier au modèle
- ✅ Gérer les images (via URLs pour l'instant)

Le système est maintenant prêt à gérer vos annonces immobilières !
