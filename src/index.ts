/**
 * Project Hub - CLI/TUI application for managing development projects
 */

import { CLI } from './ui/cli/CLI';
import { TUIApplication } from './ui/tui/TUIApplication';

if (process.argv.length <= 2) {
  const tui = new TUIApplication();
  tui.run();
} else {
  const cli = new CLI();
  cli.run(process.argv);
}
