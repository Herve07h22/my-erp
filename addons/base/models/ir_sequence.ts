import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection } from '../../../core/server/orm/types.js';

/**
 * Interpole les variables de date dans une chaîne
 * Supporte: %(year), %(month), %(day), %y, %m, %d
 */
function interpolateDate(template: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return template
    .replace(/%\(year\)|%y/gi, String(year))
    .replace(/%\(month\)|%m/gi, month)
    .replace(/%\(day\)|%d/gi, day);
}

/**
 * Modèle Séquence
 * Gère la génération automatique de références uniques (numéros de devis, factures, etc.)
 * Équivalent de ir.sequence dans Odoo
 */
class IrSequence extends BaseModel {
  static override _name = 'ir.sequence';
  static override _table = 'ir_sequence';
  static override _order = 'name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom de la séquence' },
    code: { type: 'string', required: true, label: 'Code technique' },
    prefix: { type: 'string', label: 'Préfixe' },
    suffix: { type: 'string', label: 'Suffixe' },
    padding: { type: 'integer', default: 5, label: 'Nombre de chiffres' },
    number_next: { type: 'integer', default: 1, label: 'Prochain numéro' },
    number_increment: { type: 'integer', default: 1, label: 'Incrément' },
    use_date_range: { type: 'boolean', default: true, label: 'Utiliser la date' },
    active: { type: 'boolean', default: true, label: 'Actif' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Override pour retourner le bon type
   */
  override async create(values: Record<string, unknown>): Promise<IrSequence> {
    return (await super.create(values)) as IrSequence;
  }

  /**
   * Override pour retourner le bon type
   */
  override async browse(ids: number | number[]): Promise<IrSequence> {
    return (await super.browse(ids)) as IrSequence;
  }

  /**
   * Génère et retourne la prochaine valeur de séquence (atomique)
   * Utilise UPDATE ... RETURNING pour éviter les race conditions
   */
  async nextByCode(code: string, date?: Date): Promise<string> {
    const pool = this.env.pool;
    const currentDate = date || new Date();

    // Incrémentation atomique avec FOR UPDATE implicite via UPDATE ... RETURNING
    const result = await pool.query(
      `UPDATE ir_sequence
       SET number_next = number_next + number_increment,
           write_date = CURRENT_TIMESTAMP
       WHERE code = $1 AND active = true
       RETURNING id, prefix, suffix, padding, number_next - number_increment as current_number, use_date_range`,
      [code]
    );

    if (result.rows.length === 0) {
      throw new Error(`Séquence avec le code "${code}" non trouvée`);
    }

    const seq = result.rows[0];
    const number = String(seq.current_number).padStart(seq.padding, '0');

    // Interpolation des dates si activée
    let prefix = seq.prefix || '';
    let suffix = seq.suffix || '';

    if (seq.use_date_range) {
      prefix = interpolateDate(prefix, currentDate);
      suffix = interpolateDate(suffix, currentDate);
    }

    return `${prefix}${number}${suffix}`;
  }

  /**
   * Retourne un aperçu de la prochaine valeur sans incrémenter
   * Utile pour afficher la valeur proposée dans un formulaire
   */
  async previewByCode(code: string, date?: Date): Promise<string | null> {
    const pool = this.env.pool;
    const currentDate = date || new Date();

    const result = await pool.query(
      `SELECT prefix, suffix, padding, number_next, use_date_range
       FROM ir_sequence
       WHERE code = $1 AND active = true`,
      [code]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const seq = result.rows[0];
    const number = String(seq.number_next).padStart(seq.padding, '0');

    let prefix = seq.prefix || '';
    let suffix = seq.suffix || '';

    if (seq.use_date_range) {
      prefix = interpolateDate(prefix, currentDate);
      suffix = interpolateDate(suffix, currentDate);
    }

    return `${prefix}${number}${suffix}`;
  }
}

export default IrSequence;
