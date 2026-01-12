import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import type { RecordData } from '../../../core/server/orm/types.js';
import TimesheetLine from '../models/timesheet.js';
import ProjectTask from '../../project/models/task.js';
import Project from '../../project/models/project.js';

describe('Timesheet Addon - Model Actions', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];

  beforeEach(async () => {
    const testEnv = await createTestEnv('timesheet', ['base', 'project']);
    env = testEnv.env;
  });

  describe('actionValidate', () => {
    it('should validate a timesheet line', async () => {
      const TimesheetLine = env.model<TimesheetLine>('account.analytic.line');
      
      // Créer un enregistrement de test
      const record: RecordData = {
        id: 1,
        name: 'Test timesheet',
        date: '2024-01-15',
        user_id: 1,
        unit_amount: 8,
        validated: false,
      };

      const created = await TimesheetLine.create(record);
      const result = await created.actionValidate();

      expect(result).toBe(true);

      const updated = await TimesheetLine.browse(1);
      expect(updated.first?.validated).toBe(true);
      expect(updated.first?.validated_date).toBeDefined();
    });

    it('should validate multiple timesheet lines', async () => {
      const TimesheetLine = env.model<TimesheetLine>('account.analytic.line');
      
      const records: RecordData[] = [
        {
          id: 1,
          name: 'Timesheet 1',
          date: '2024-01-15',
          user_id: 1,
          unit_amount: 4,
          validated: false,
        },
        {
          id: 2,
          name: 'Timesheet 2',
          date: '2024-01-15',
          user_id: 1,
          unit_amount: 4,
          validated: false,
        },
      ];

      for (const record of records) {
        await TimesheetLine.create(record);
      }

      const timesheets = await env.model<typeof TimesheetLine>('account.analytic.line').browse([1, 2]);
      const result = await timesheets.actionValidate();

      expect(result).toBe(true);

      const updated = await env.model<typeof TimesheetLine>('account.analytic.line').browse([1, 2]);
      expect(updated.records.every((r) => r.validated === true)).toBe(true);
      expect(updated.records.every((r) => r.validated_date !== null)).toBe(true);
    });
  });

  describe('actionRefuse', () => {
    it('should refuse validation of a timesheet line', async () => {
      const TimesheetLine = env.model<TimesheetLine>('account.analytic.line');
      
      const record: RecordData = {
        id: 1,
        name: 'Test timesheet',
        date: '2024-01-15',
        user_id: 1,
        unit_amount: 8,
        validated: true,
        validated_date: new Date(),
        validated_by: 1,
      };

      await TimesheetLine.create(record);
      const timesheet = await TimesheetLine.browse(1);
      const result = await timesheet.actionRefuse();

      expect(result).toBe(true);

      const updated = await TimesheetLine.browse(1);
      expect(updated.first?.validated).toBe(false);
      expect(updated.first?.validated_date).toBeNull();
      expect(updated.first?.validated_by).toBeNull();
    });
  });

  describe('getWeeklySummary', () => {
    it('should calculate weekly summary correctly', async () => {
      const TimesheetLine = env.model<TimesheetLine>('account.analytic.line');
      const weekStart = new Date('2024-01-15');
      const userId = 1;

      const records: RecordData[] = [
        {
          id: 1,
          name: 'Monday work',
          date: '2024-01-15',
          user_id: userId,
          unit_amount: 8,
          project_id: 1,
        },
        {
          id: 2,
          name: 'Tuesday work',
          date: '2024-01-16',
          user_id: userId,
          unit_amount: 7.5,
          project_id: 1,
        },
        {
          id: 3,
          name: 'Wednesday work',
          date: '2024-01-17',
          user_id: userId,
          unit_amount: 8,
          project_id: 2,
        },
      ];

      for (const record of records) {
        await TimesheetLine.create(record);
      }

      const timesheet = await env.model<typeof TimesheetLine>('account.analytic.line').browse(1);
      const summary = await timesheet.getWeeklySummary(userId, weekStart);

      expect(summary.week_start).toEqual(weekStart);
      expect(summary.total_hours).toBe(23.5);
      expect(summary.by_day.length).toBe(3);
      expect(summary.by_project.length).toBe(2);

      // Vérifier le total par jour
      const monday = summary.by_day.find((d: { date: string; hours: number }) => d.date === '2024-01-15');
      expect(monday?.hours).toBe(8);

      // Vérifier le total par projet
      const project1 = summary.by_project.find((p: { project_id: number; hours: number }) => p.project_id === 1);
      expect(project1?.hours).toBe(15.5);
    });

    it('should return empty summary for week with no timesheets', async () => {
      const TimesheetLine = env.model<TimesheetLine>('account.analytic.line');
      const weekStart = new Date('2024-02-01');
      const userId = 1;

      // Créer un enregistrement vide pour avoir une instance
      await TimesheetLine.create({
        id: 1,
        name: 'Dummy',
        date: '2024-01-01',
        user_id: userId,
        unit_amount: 0,
      });

      const timesheet = await env.model<typeof TimesheetLine>('account.analytic.line').browse(1);
      const summary = await timesheet.getWeeklySummary(userId, weekStart);

      expect(summary.total_hours).toBe(0);
      expect(summary.by_day.length).toBe(0);
      expect(summary.by_project.length).toBe(0);
    });
  });

  describe('create with task and project updates', () => {
    it('should update task hours when creating timesheet with task_id', async () => {
      const TimesheetLine = env.model<TimesheetLine>('account.analytic.line');
      const Task = env.model<typeof ProjectTask>('project.task');
      
      // Créer une tâche de test
      await Task.create({
        id: 1,
        name: 'Test Task',
        project_id: 1,
        planned_hours: 40,
        effective_hours: 0,
      });

      // Créer un timesheet lié à la tâche
      const timesheet = await TimesheetLine.create({
        name: 'Work on task',
        date: '2024-01-15',
        user_id: 1,
        task_id: 1,
        unit_amount: 8,
      });

      expect(timesheet.length).toBe(1);

      // Vérifier que les heures de la tâche ont été mises à jour
      const task = await Task.browse(1);
      expect(task.first?.effective_hours).toBe(8);
    });

    it('should update project hours when creating timesheet with project_id', async () => {
      const Timesheet = env.model<typeof TimesheetLine>('account.analytic.line');
      const ProjectModel = env.model<typeof Project>('project.project');
      
      // Créer un projet de test
      await ProjectModel.create({
        id: 1,
        name: 'Test Project',
        total_timesheet_time: 0,
      });

      // Créer un timesheet lié au projet
      const timesheet = await Timesheet.create({
        name: 'Work on project',
        date: '2024-01-15',
        user_id: 1,
        project_id: 1,
        unit_amount: 8,
      });

      expect(timesheet.length).toBe(1);

      // Vérifier que les heures du projet ont été mises à jour
      const project = await env.model<typeof Project>('project.project').browse(1);
      expect(project.first?.total_timesheet_time).toBe(8);
    });
  });
});
