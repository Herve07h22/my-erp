import fs from 'fs';
import path from 'path';
import type {
  ModelRegistryInterface,
  ModelConstructor,
  FieldsCollection,
} from '../server/orm/types.js';
import type { ViewDefinitions, ViewDefinition, ActionDefinition, MenuDefinition } from '../server/module-loader/index.js';

export interface ValidationError {
  type: 'json' | 'field' | 'action' | 'model' | 'menu';
  message: string;
  field?: string;
  view?: string;
  action?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Valide un fichier de vues JSON
 */
export function validateViewFile(
  viewPath: string,
  registry: ModelRegistryInterface
): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Vérifier que le fichier existe et est lisible
  if (!fs.existsSync(viewPath)) {
    return {
      valid: false,
      errors: [
        {
          type: 'json',
          message: `View file not found: ${viewPath}`,
        },
      ],
    };
  }

  // 2. Parser le JSON
  let viewDefinitions: ViewDefinitions;
  try {
    const content = fs.readFileSync(viewPath, 'utf-8');
    viewDefinitions = JSON.parse(content);
  } catch (err) {
    return {
      valid: false,
      errors: [
        {
          type: 'json',
          message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }

  // 3. Valider la structure
  if (!viewDefinitions.views && !viewDefinitions.actions && !viewDefinitions.menus) {
    errors.push({
      type: 'json',
      message: 'View file must contain at least one of: views, actions, menus',
    });
  }

  // 4. Valider les vues
  if (viewDefinitions.views) {
    for (const view of viewDefinitions.views) {
      const viewErrors = validateView(view, registry);
      errors.push(...viewErrors);
    }
  }

  // 5. Valider les actions
  if (viewDefinitions.actions) {
    const actionIds = new Set<string>();
    for (const action of viewDefinitions.actions) {
      const actionErrors = validateAction(action, registry, actionIds);
      errors.push(...actionErrors);
      actionIds.add(action.id);
    }
  }

  // 6. Valider les menus
  if (viewDefinitions.menus) {
    const menuErrors = validateMenus(
      viewDefinitions.menus,
      viewDefinitions.actions || []
    );
    errors.push(...menuErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valide une vue individuelle
 */
function validateView(
  view: ViewDefinition,
  registry: ModelRegistryInterface
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Vérifier que le modèle existe
  if (!registry.has(view.model)) {
    errors.push({
      type: 'model',
      message: `Model "${view.model}" not found in registry`,
      view: view.id,
    });
    return errors; // Pas la peine de continuer si le modèle n'existe pas
  }

  // Compiler le modèle pour accéder aux champs
  let ModelClass: ModelConstructor;
  try {
    ModelClass = registry.compile(view.model);
  } catch (err) {
    errors.push({
      type: 'model',
      message: `Error compiling model "${view.model}": ${err instanceof Error ? err.message : String(err)}`,
      view: view.id,
    });
    return errors;
  }

  const fields = ModelClass._fields;

  // Extraire tous les champs référencés dans la vue
  const referencedFields = extractReferencedFields(view);

  // Vérifier que chaque champ existe
  for (const fieldName of referencedFields) {
    if (!fields[fieldName]) {
      errors.push({
        type: 'field',
        message: `Field "${fieldName}" referenced in view but not found in model "${view.model}"`,
        field: fieldName,
        view: view.id,
      });
    }
  }

  // Extraire et valider les actions de boutons
  const buttonActions = extractButtonActions(view);
  for (const actionName of buttonActions) {
    if (!hasModelAction(ModelClass, actionName)) {
      errors.push({
        type: 'action',
        message: `Action "${actionName}" referenced in button but not found in model "${view.model}"`,
        action: actionName,
        view: view.id,
      });
    }
  }

  return errors;
}

/**
 * Extrait tous les champs référencés dans une vue
 * Note: Les champs "tree" des one2many sont ignorés car ils référencent des champs
 * du modèle lié, pas du modèle courant
 */
function extractReferencedFields(view: ViewDefinition): string[] {
  const fields: Set<string> = new Set();

  if (!view.arch) return [];

  const arch = view.arch as Record<string, unknown>;

  // Fonction récursive pour extraire les champs
  function extract(obj: unknown, skipTree: boolean = false): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach((item) => extract(item, skipTree));
      return;
    }

    const record = obj as Record<string, unknown>;

    // Champs directs (peut être un tableau de strings ou d'objets avec propriété field)
    if (record.fields && Array.isArray(record.fields)) {
      for (const f of record.fields) {
        if (typeof f === 'string') {
          fields.add(f);
        } else if (typeof f === 'object' && f !== null && 'field' in f) {
          fields.add((f as { field: string }).field);
        }
      }
    }

    // Champ unique (pour one2many)
    if (typeof record.field === 'string') {
      fields.add(record.field);
    }

    // Tree fields (pour one2many) - ne pas les valider car ils appartiennent au modèle lié
    // On ignore record.tree intentionnellement

    // Parcourir récursivement (mais pas les propriétés tree)
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'tree') {
        extract(value, skipTree);
      }
    }
  }

  extract(arch);

  return Array.from(fields);
}

/**
 * Extrait les actions de boutons référencées dans une vue
 */
function extractButtonActions(view: ViewDefinition): string[] {
  const actions: string[] = [];

  if (!view.arch) return [];

  const arch = view.arch as Record<string, unknown>;
  const header = arch.header as Record<string, unknown> | undefined;

  if (header && header.buttons && Array.isArray(header.buttons)) {
    for (const button of header.buttons as Array<Record<string, unknown>>) {
      if (button.type === 'action' && typeof button.name === 'string') {
        actions.push(button.name);
      }
    }
  }

  return actions;
}

/**
 * Vérifie si un modèle a une action (méthode) donnée
 */
function hasModelAction(
  ModelClass: ModelConstructor,
  actionName: string
): boolean {
  // Vérifier dans le prototype
  const proto = ModelClass.prototype;
  if (actionName in proto && typeof proto[actionName as keyof typeof proto] === 'function') {
    return true;
  }

  // Vérifier dans la classe elle-même
  if (actionName in ModelClass) {
    const classMethod = Object.getOwnPropertyDescriptor(ModelClass, actionName)?.value;
    if (typeof classMethod === 'function') {
      return true;
    }
  }

  return false;
}

/**
 * Valide une action de navigation
 */
function validateAction(
  action: ActionDefinition,
  registry: ModelRegistryInterface,
  existingActionIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Vérifier que l'ID est unique
  if (existingActionIds.has(action.id)) {
    errors.push({
      type: 'action',
      message: `Duplicate action ID: "${action.id}"`,
      action: action.id,
    });
  }

  // Vérifier que le modèle existe si spécifié
  if (action.model && !registry.has(action.model)) {
    errors.push({
      type: 'model',
      message: `Model "${action.model}" referenced in action "${action.id}" not found`,
      action: action.id,
    });
  }

  // Vérifier que les vues référencées existent (on ne peut pas le faire ici sans contexte)
  // Cette vérification sera faite dans les tests de vues

  return errors;
}

/**
 * Valide les menus
 * Note: Les références de menu parent vers d'autres fichiers sont autorisées
 * car les menus peuvent être définis dans plusieurs fichiers d'un même addon
 */
function validateMenus(
  menus: MenuDefinition[],
  actions: ActionDefinition[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const menuIds = new Set<string>();
  const actionIds = new Set(actions.map((a) => a.id));

  // Premier passage : collecter les IDs
  for (const menu of menus) {
    if (menuIds.has(menu.id)) {
      errors.push({
        type: 'menu',
        message: `Duplicate menu ID: "${menu.id}"`,
      });
    }
    menuIds.add(menu.id);
  }

  // Deuxième passage : valider les références
  for (const menu of menus) {
    // Note: On ne vérifie pas les parents car ils peuvent être définis
    // dans d'autres fichiers de vues du même addon

    // Vérifier que l'action existe si spécifiée (seulement dans ce fichier)
    // Les actions externes sont autorisées
    if (menu.action && !actionIds.has(menu.action)) {
      // On ne génère pas d'erreur car l'action peut être définie ailleurs
    }
  }

  return errors;
}

/**
 * Valide tous les fichiers de vues d'un addon
 */
export function validateAddonViews(
  addonPath: string,
  registry: ModelRegistryInterface
): ValidationResult {
  const errors: ValidationError[] = [];
  const viewsPath = path.join(addonPath, 'views');

  if (!fs.existsSync(viewsPath)) {
    return {
      valid: true,
      errors: [], // Pas de vues = pas d'erreur
    };
  }

  const viewFiles = fs
    .readdirSync(viewsPath)
    .filter((f) => f.endsWith('.json'));

  for (const file of viewFiles) {
    const viewPath = path.join(viewsPath, file);
    const result = validateViewFile(viewPath, registry);
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
