import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import type { RecordData } from '../../../core/server/orm/types.js';
import ResPartner from '../models/res_partner.js';
import ResUsers from '../models/res_users.js';

describe('Base Addon - Model Actions', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];

  beforeEach(async () => {
    const testEnv = await createTestEnv('base');
    env = testEnv.env;
  });

  describe('res.partner - actionArchive', () => {
    it('should archive a partner', async () => {
      const Partner = env.model<typeof ResPartner>('res.partner');
      const partner = await Partner.create({
        name: 'Test Partner',
        active: true,
      });

      const result = await partner.actionArchive();
      expect(result).toBe(true);

      const archived = await env.model<typeof ResPartner>('res.partner').browse(partner.first!.id as number);
      expect(archived.first?.active).toBe(false);
    });

    it('should archive multiple partners', async () => {
      const Partner = env.model<typeof ResPartner>('res.partner');
      const partner1 = await Partner.create({ name: 'Partner 1', active: true });
      const partner2 = await Partner.create({ name: 'Partner 2', active: true });

      const partners = await Partner.browse([
        partner1.first!.id as number,
        partner2.first!.id as number,
      ]);

      const result = await partners.actionArchive();
      expect(result).toBe(true);

      const archived = await env.model<typeof ResPartner>('res.partner').browse([
        partner1.first!.id as number,
        partner2.first!.id as number,
      ]);
      expect(archived.records.every((r: RecordData) => r.active === false)).toBe(true);
    });
  });

  describe('res.partner - actionUnarchive', () => {
    it('should unarchive a partner', async () => {
      const Partner = env.model<typeof ResPartner>('res.partner');
      const partner = await Partner.create({
        name: 'Test Partner',
        active: false,
      });

      const result = await partner.actionUnarchive();
      expect(result).toBe(true);

      const unarchived = await env.model<typeof ResPartner>('res.partner').browse(partner.first!.id as number);
      expect(unarchived.first?.active).toBe(true);
    });
  });

  describe('res.users - authenticate', () => {
    it('should authenticate with valid credentials', async () => {
      const ResUsers = env.model<ResUsers>('res.users');
      await ResUsers.create({
        name: 'Test User',
        login: 'testuser',
        password: 'password123',
        active: true,
      });

      const user = await ResUsers.authenticate('testuser', 'password123');
      expect(user).not.toBeNull();
      expect(user?.login).toBe('testuser');
    });

    it('should not authenticate with invalid password', async () => {
      const ResUsers = env.model<ResUsers>('res.users');
      await ResUsers.create({
        name: 'Test User',
        login: 'testuser',
        password: 'password123',
        active: true,
      });

      const user = await ResUsers.authenticate('testuser', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('should not authenticate with invalid login', async () => {
      const ResUsers = env.model<ResUsers>('res.users');
      await ResUsers.create({
        name: 'Test User',
        login: 'testuser',
        password: 'password123',
        active: true,
      });

      const user = await ResUsers.authenticate('wronguser', 'password123');
      expect(user).toBeNull();
    });

    it('should not authenticate inactive users', async () => {
      const ResUsers = env.model<ResUsers>('res.users');
      await ResUsers.create({
        name: 'Test User',
        login: 'testuser',
        password: 'password123',
        active: false,
      });

      const user = await ResUsers.authenticate('testuser', 'password123');
      expect(user).toBeNull();
    });
  });

  describe('res.users - changePassword', () => {
    it('should change password for a user', async () => {
      const ResUsers = env.model<ResUsers>('res.users');
      const user = await ResUsers.create({
        name: 'Test User',
        login: 'testuser',
        password: 'oldpassword',
        active: true,
      });

      const userRecord = await ResUsers.browse(user.first!.id as number);
      const result = await userRecord.changePassword('oldpassword', 'newpassword');
      expect(result).toBe(true);

      const updated = await env.model<typeof ResUsers>('res.users').browse(user.first!.id as number);
      expect(updated.first?.password).toBe('newpassword');
    });

    it('should return false if no user record', async () => {
      const ResUsers = env.model<ResUsers>('res.users');
      const emptyUsers = await ResUsers.browse(99999); // Non-existent ID
      const result = await emptyUsers.changePassword('old', 'new');
      expect(result).toBe(false);
    });
  });

  describe('res.partner - nameGet', () => {
    it('should return name for company', async () => {
      const Partner = env.model<typeof ResPartner>('res.partner');
      const partner = await Partner.create({
        name: 'Test Company',
        is_company: true,
      });

      const names = await partner.nameGet();
      expect(names.length).toBe(1);
      expect(names[0].name).toBe('Test Company');
      expect(names[0].display_name).toBe('Test Company');
    });

    it('should return name with parent for individual', async () => {
      const Partner = env.model<typeof ResPartner>('res.partner');
      const company = await Partner.create({
        name: 'Test Company',
        is_company: true,
      });

      const individual = await Partner.create({
        name: 'John Doe',
        is_company: false,
        parent_id: company.first!.id as number,
      });

      const names = await individual.nameGet();
      expect(names.length).toBe(1);
      expect(names[0].name).toBe('John Doe');
      // display_name devrait inclure le parent
      expect(names[0].display_name).toContain('John Doe');
    });
  });
});
