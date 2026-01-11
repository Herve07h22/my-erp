import { z } from 'zod';

/**
 * Schéma Zod pour valider la structure des fichiers de vues JSON
 */

// Button dans le header d'une vue form
const ButtonSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['action', 'object']).optional(),
  states: z.array(z.string()).optional(),
  class: z.string().optional(),
});

// Statusbar dans le header
const StatusbarSchema = z.object({
  field: z.string(),
});

// Header d'une vue form
const HeaderSchema = z.object({
  buttons: z.array(ButtonSchema).optional(),
  statusbar: StatusbarSchema.optional(),
});

// Champ dans un groupe (peut être string ou objet avec propriétés)
const FieldRefSchema = z.union([
  z.string(),
  z.object({
    field: z.string(),
    widget: z.string().optional(),
    readonly: z.boolean().optional(),
    required: z.boolean().optional(),
    invisible: z.boolean().optional(),
  }),
]);

// Groupe de champs
const GroupSchema = z.object({
  label: z.string().optional(),
  fields: z.array(FieldRefSchema),
  colspan: z.number().optional(),
});

// Contenu one2many dans un notebook
const One2ManyContentSchema = z.object({
  field: z.string(),
  widget: z.string().optional(),
  tree: z.array(z.string()).optional(),
  form: z.array(z.string()).optional(),
});

// Page de notebook
const NotebookPageSchema = z.object({
  label: z.string(),
  content: One2ManyContentSchema.optional(),
  fields: z.array(FieldRefSchema).optional(),
});

// Sheet d'une vue form
const SheetSchema = z.object({
  groups: z.array(GroupSchema).optional(),
  notebook: z.array(NotebookPageSchema).optional(),
});

// Architecture d'une vue form
const FormArchSchema = z.object({
  header: HeaderSchema.optional(),
  sheet: SheetSchema.optional(),
});

// Architecture d'une vue list
const ListArchSchema = z.object({
  fields: z.array(z.string()),
  allowGrid: z.boolean().optional(),
  editable: z.enum(['top', 'bottom']).optional(),
});

// Architecture d'une vue grid (timesheet)
const GridArchSchema = z.object({
  targetHours: z.number().optional(),
  showVariance: z.boolean().optional(),
});

// Architecture générique (union des différents types)
const ArchSchema = z.union([FormArchSchema, ListArchSchema, GridArchSchema, z.record(z.unknown())]);

// Vue
const ViewSchema = z.object({
  id: z.string(),
  model: z.string(),
  type: z.enum(['form', 'list', 'tree', 'grid', 'kanban', 'calendar', 'gantt', 'pivot', 'graph']),
  arch: ArchSchema,
  name: z.string().optional(),
  priority: z.number().optional(),
});

// Tuple [view_id, view_type] pour les actions
const ViewRefSchema = z.tuple([z.string(), z.string()]);

// Domain filter
const DomainTupleSchema = z.tuple([
  z.string(),
  z.enum(['=', '!=', '>', '<', '>=', '<=', 'in', 'not in', 'like', 'ilike', '=like', '=ilike']),
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.union([z.string(), z.number()]))]),
]);

const DomainSchema = z.array(DomainTupleSchema);

// Action
const ActionSchema = z.object({
  id: z.string(),
  type: z.enum(['ir.actions.act_window', 'ir.actions.server', 'ir.actions.report', 'ir.actions.client']),
  name: z.string(),
  model: z.string().optional(),
  views: z.array(ViewRefSchema).optional(),
  domain: DomainSchema.optional(),
  context: z.record(z.unknown()).optional(),
  target: z.enum(['current', 'new', 'inline', 'fullscreen']).optional(),
  res_id: z.number().optional(),
});

// Menu
const MenuSchema = z.object({
  id: z.string(),
  label: z.string(),
  sequence: z.number().optional(),
  parent: z.string().optional(),
  action: z.string().optional(),
  groups: z.array(z.string()).optional(),
});

// Fichier de définition de vues complet
export const ViewDefinitionsSchema = z.object({
  views: z.array(ViewSchema).optional(),
  actions: z.array(ActionSchema).optional(),
  menus: z.array(MenuSchema).optional(),
}).refine(
  (data) => data.views || data.actions || data.menus,
  { message: 'Le fichier doit contenir au moins views, actions ou menus' }
);

// Export des types inférés
export type ViewDefinitions = z.infer<typeof ViewDefinitionsSchema>;
export type View = z.infer<typeof ViewSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Menu = z.infer<typeof MenuSchema>;
