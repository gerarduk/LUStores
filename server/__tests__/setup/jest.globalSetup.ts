// Set up path mappings before any imports
// Use jest.paths.js (NOT jest.setup.js) as it doesn't import jest-dom
// jest-dom requires `expect` which isn't available during globalSetup
require('../../../jest.paths.js');

import { globalSetup } from './index';

export default globalSetup;
