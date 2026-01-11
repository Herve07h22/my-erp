import { BaseModel } from '../../../core/server/orm/index.js';
import type { FieldsCollection, RecordData, EnvironmentInterface } from '../../../core/server/orm/types.js';

/**
 * Modèle Utilisateur
 * Équivalent de res.users dans Odoo
 */
class ResUsers extends BaseModel {
  static override _name = 'res.users';
  static override _table = 'res_users';
  static override _order = 'name';

  static override _fields: FieldsCollection = {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'string', required: true, label: 'Nom' },
    login: { type: 'string', required: true, unique: true, label: 'Identifiant' },
    password: { type: 'string', label: 'Mot de passe' },
    email: { type: 'string', label: 'Email' },
    partner_id: { type: 'many2one', relation: 'res.partner', label: 'Partenaire lié' },
    active: { type: 'boolean', default: true, label: 'Actif' },
    lang: { type: 'string', default: 'fr_FR', label: 'Langue' },
    tz: { type: 'string', default: 'Europe/Paris', label: 'Fuseau horaire' },
    create_date: { type: 'datetime', label: 'Date de création' },
    write_date: { type: 'datetime', label: 'Date de modification' },
  };

  /**
   * Override pour retourner le bon type
   */
  override async create(values: Record<string, unknown>): Promise<ResUsers> {
    return (await super.create(values)) as ResUsers;
  }

  /**
   * Override pour retourner le bon type
   */
  override async browse(ids: number | number[]): Promise<ResUsers> {
    return (await super.browse(ids)) as ResUsers;
  }

  /**
   * Vérifie les identifiants de connexion
   * Peut être appelée comme méthode d'instance ou statique
   */
  async authenticate(login: string, password: string): Promise<RecordData | null> {
    const users = await this.search([
      ['login', '=', login],
      ['active', '=', true],
    ]);

    if (!users.length) {
      return null;
    }

    const user = users.first;
    // TODO: Implémenter le hash du mot de passe
    if (user && user.password === password) {
      return user;
    }

    return null;
  }

  /**
   * Vérifie les identifiants de connexion (méthode statique)
   */
  static async authenticate(
    env: EnvironmentInterface,
    login: string,
    password: string
  ): Promise<RecordData | null> {
    const ResUsers = env.model<ResUsers>('res.users');
    return await ResUsers.authenticate(login, password);
  }

  /**
   * Change le mot de passe
   */
  async changePassword(_oldPassword: string, newPassword: string): Promise<boolean> {
    const user = this.first;
    if (!user) return false;

    // TODO: Vérifier l'ancien mot de passe et hasher le nouveau
    await this.write({ password: newPassword });
    return true;
  }
}

export default ResUsers;
