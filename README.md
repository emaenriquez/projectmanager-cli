# Project Hub

A CLI/TUI application for managing development projects across multiple technologies.

## Features

- **Project Scanning**: Automatically detect projects by scanning directories for config files (package.json, Cargo.toml, go.mod, etc.)
- **Technology Detection**: Identifies languages, frameworks, and tools used in each project
- **TUI Interface**: Interactive terminal UI with project list, details panel, and keyboard shortcuts
- **CLI Commands**: Full command-line interface for scripting and automation
- **Git Integration**: Shows branch, uncommitted changes, and unpushed commits
- **Tags & Favorites**: Organize projects with custom tags and mark favorites
- **Search & Filter**: Find projects quickly by name, technology, or tag
- **System Diagnostics**: `doctor` command to verify installed tools and database health

## Quick Start

```bash
# Install dependencies
npm install

# Run in TUI mode (interactive)
npm run dev

# Run CLI commands
npm run dev -- scan C:\path\to\projects
npm run dev -- add C:\path\to\project
npm run dev -- doctor
npm run dev -- --help
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan [path]` | Scan a directory for projects |
| `add <path>` | Add a single project by path |
| `remove <id>` | Remove a project |
| `open <id> [--with <tool>]` | Open a project in an editor |
| `doctor` | Run system diagnostics |
| `sync` | Sync all projects (remove missing, update metadata) |
| `config list` | Show all configurations |
| `config get <key>` | Get a config value |
| `config set <key> <value>` | Set a config value |
| `config reset` | Reset config to defaults |

## TUI Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate project list |
| `Enter` / `D` | View project details |
| `A` | Add a project by path |
| `S` | Scan a directory |
| `F` | Search/filter projects |
| `*` | Toggle favorite |
| `T` | Add tag to project |
| `O` | Open project in editor |
| `X` | Delete project |
| `R` | Refresh list |
| `Q` / `Esc` | Quit |

## Architecture

The project follows **Clean Architecture** principles:

```
src/
├── domain/           # Business entities, services (ProjectScanner, TechnologyDetector, GitService)
├── application/      # Use cases (ScanProjects, AddProject, etc.), state management, error handling
├── infrastructure/   # Database (SQLite), repositories, UI framework (Blessed)
└── ui/               # CLI (Commander.js), TUI components, views
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Database**: SQLite via better-sqlite3
- **CLI Framework**: Commander.js
- **TUI Framework**: Blessed
- **Testing**: Jest

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## License

MIT
