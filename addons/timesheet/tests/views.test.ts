import path from 'path';
import { fileURLToPath } from 'url';
import { createAddonViewsTests } from '../../../core/test-helpers/addon-views-tests.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

createAddonViewsTests({
  addonName: 'timesheet',
  addonPath: path.resolve(__dirname, '..'),
  dependencies: ['base', 'project'],
});
