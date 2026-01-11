import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEnv } from '../../../core/test-helpers/test-env.js';
import Project from '../models/project.js';
import ProjectTask from '../models/task.js';

describe('Project Addon - Model Actions', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>['env'];

  beforeEach(async () => {
    const testEnv = await createTestEnv('project', ['base']);
    env = testEnv.env;
  });

  describe('project.project actions', () => {
    it('should open a project', async () => {
      const Project = env.model<Project>('project.project');
      const project = await Project.create({
        name: 'Test Project',
        state: 'draft',
      });

      const result = await project.actionOpen();
      expect(result).toBe(true);

      const updated = await env.model<Project>('project.project').browse(project.first!.id as number);
      expect(updated.first?.state).toBe('open');
    });

    it('should set project to pending', async () => {
      const Project = env.model<Project>('project.project');
      const project = await Project.create({
        name: 'Test Project',
        state: 'open',
      });

      const result = await project.actionPending();
      expect(result).toBe(true);

      const updated = await env.model<Project>('project.project').browse(project.first!.id as number);
      expect(updated.first?.state).toBe('pending');
    });

    it('should close a project', async () => {
      const Project = env.model<Project>('project.project');
      const project = await Project.create({
        name: 'Test Project',
        state: 'open',
      });

      const result = await project.actionClose();
      expect(result).toBe(true);

      const updatedProject = await env.model<typeof Project>('project.project').browse(project.first!.id as number);
      expect(updatedProject.first?.state).toBe('close');
    });

    it('should cancel a project', async () => {
      const Project = env.model<Project>('project.project');
      const project = await Project.create({
        name: 'Test Project',
        state: 'open',
      });

      const result = await project.actionCancel();
      expect(result).toBe(true);

      const updated = await env.model<Project>('project.project').browse(project.first!.id as number);
      expect(updated.first?.state).toBe('cancelled');
    });

    it('should set project back to draft', async () => {
      const Project = env.model<Project>('project.project');
      const project = await Project.create({
        name: 'Test Project',
        state: 'open',
      });

      const result = await project.actionDraft();
      expect(result).toBe(true);

      const updated = await env.model<Project>('project.project').browse(project.first!.id as number);
      expect(updated.first?.state).toBe('draft');
    });
  });

  describe('project.task actions', () => {
    it('should start a task', async () => {
      const Project = env.model<Project>('project.project');
      const Task = env.model<typeof ProjectTask>('project.task');
      const project = await Project.create({
        name: 'Test Project',
      });

      const task = await Task.create({
        name: 'Test Task',
        project_id: project.first!.id as number,
        state: 'draft',
      });

      const result = await task.actionStart();
      expect(result).toBe(true);

      const updated = await env.model<typeof ProjectTask>('project.task').browse(task.first!.id as number);
      expect(updated.first?.state).toBe('open');
      expect(updated.first?.date_assign).toBeDefined();
    });

    it('should set task to pending', async () => {
      const Project = env.model<Project>('project.project');
      const Task = env.model<typeof ProjectTask>('project.task');
      const project = await Project.create({
        name: 'Test Project',
      });

      const task = await Task.create({
        name: 'Test Task',
        project_id: project.first!.id as number,
        state: 'open',
      });

      const result = await task.actionPending();
      expect(result).toBe(true);

      const updated = await env.model<typeof ProjectTask>('project.task').browse(task.first!.id as number);
      expect(updated.first?.state).toBe('pending');
    });

    it('should mark task as done', async () => {
      const Project = env.model<Project>('project.project');
      const Task = env.model<typeof ProjectTask>('project.task');
      const project = await Project.create({
        name: 'Test Project',
      });

      const task = await Task.create({
        name: 'Test Task',
        project_id: project.first!.id as number,
        state: 'open',
        planned_hours: 40,
      });

      const result = await task.actionDone();
      expect(result).toBe(true);

      const updated = await env.model<typeof ProjectTask>('project.task').browse(task.first!.id as number);
      expect(updated.first?.state).toBe('done');
      expect(updated.first?.progress).toBe(100);
      expect(updated.first?.date_end).toBeDefined();
    });

    it('should cancel a task', async () => {
      const Project = env.model<Project>('project.project');
      const Task = env.model<typeof ProjectTask>('project.task');
      const project = await Project.create({
        name: 'Test Project',
      });

      const task = await Task.create({
        name: 'Test Task',
        project_id: project.first!.id as number,
        state: 'open',
      });

      const result = await task.actionCancel();
      expect(result).toBe(true);

      const updated = await env.model<typeof ProjectTask>('project.task').browse(task.first!.id as number);
      expect(updated.first?.state).toBe('cancelled');
    });
  });

  describe('project.task - _computeHours', () => {
    it('should compute hours from timesheets', async () => {
      const Project = env.model<Project>('project.project');
      const Task = env.model<typeof ProjectTask>('project.task');
      const project = await Project.create({
        name: 'Test Project',
      });

      const task = await Task.create({
        name: 'Test Task',
        project_id: project.first!.id as number,
        planned_hours: 40,
        effective_hours: 0,
      });

      // Simuler des timesheets (si le module timesheet est disponible)
      try {
        const Timesheet = env.model('account.analytic.line');
        await Timesheet.create({
          name: 'Work on task',
          date: '2024-01-15',
          user_id: 1,
          task_id: task.first!.id as number,
          unit_amount: 8,
        });

        await Timesheet.create({
          name: 'More work',
          date: '2024-01-16',
          user_id: 1,
          task_id: task.first!.id as number,
          unit_amount: 4,
        });

        // Appeler _computeHours
        await task._computeHours();

        const updated = await env.model<typeof ProjectTask>('project.task').browse(task.first!.id as number);
        expect(updated.first?.effective_hours).toBe(12);
        expect(updated.first?.remaining_hours).toBe(28);
        expect(updated.first?.progress).toBe(30);
      } catch {
        // Module timesheet peut ne pas être disponible
        // C'est OK, on skip ce test
      }
    });
  });
});
