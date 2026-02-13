<!-- markdownlint-disable-file -->

# Task Research Notes: Personal Project Manager PRD

## Research Executed

### File Analysis

- .github/project-details/PRD.md
  - Detailed functional requirements, commands, data model, tree view behavior, and UX expectations for the extension.
- package.json
  - Current extension metadata (version 0.0.1), engine target ^1.109.0, and minimal command contribution.
- src/extension.ts
  - Placeholder hello-world activation and command only; no tree view implementation yet.
- src/test/extension.test.ts
  - Sample Mocha test stub only.
- eslint.config.mjs
  - ESLint rules emphasize naming convention, eqeqeq, curly, semi, and no-throw-literal.
- tsconfig.json
  - TypeScript strict mode enabled; ES2022 target; Node16 module resolution.

### Code Search Results

- projectviewer|projectViewer|project manager|projectviewer\.
  - Matches only in PRD and metadata; no implementation in src yet.

### External Research

- #githubRepo:"microsoft/vscode-extension-samples tree-view TreeDataProvider TreeDragAndDropController FileSystemWatcher"
  - Tree view samples show `TreeDataProvider`, `TreeView`, `TreeDragAndDropController`, and `view/title` + `view/item/context` menu contributions.
- #fetch:https://code.visualstudio.com/api/extension-guides/tree-view
  - Authoritative guidance on `TreeDataProvider` (`getChildren`, `getTreeItem`), `onDidChangeTreeData`, `views`/`viewsContainers`, `view/title` and `view/item/context` menus, and `viewsWelcome`.
- #fetch:https://code.visualstudio.com/api/ux-guidelines/views
  - UX guidance: keep action count low, use descriptive labels/icons, limit nesting depth, and use welcome views sparingly.
- #fetch:https://code.visualstudio.com/api/working-with-extensions/testing-extension
  - Testing guidance: use `@vscode/test-cli` + `@vscode/test-electron`, Mocha-based integration tests, and `.vscode-test.mjs` config.
- #fetch:https://code.visualstudio.com/api/extension-guides/commands
  - Fetch failed with HTTP 404; no authoritative content retrieved.

### Project Conventions

- Standards referenced: ESLint rules in eslint.config.mjs, strict TypeScript config in tsconfig.json.
- Instructions followed: Task Researcher mode requirements; no .github/instructions or copilot/ conventions present.

## Key Discoveries

### Project Structure

- Current codebase is a scaffolded VS Code extension with only a hello-world command and test stub.
- PRD defines a full tree-view-based project manager but no corresponding implementation exists yet.
- Metadata mismatch: PRD targets VS Code 1.99.0+, while package.json targets ^1.109.0.

### Implementation Patterns

- VS Code tree views are built with a `TreeDataProvider` (`getChildren`, `getTreeItem`) and refreshed via `onDidChangeTreeData`.
- View toolbar actions are contributed under `menus.view/title` with `when` clause `view == <viewId>`; item actions use `menus.view/item/context` with `viewItem` contexts from `TreeItem.contextValue`.
- Welcome content is contributed via `viewsWelcome` for empty views, with links and optional command links.
- Drag-and-drop in a tree view uses `TreeDragAndDropController`, with `dragMimeTypes`/`dropMimeTypes` and `handleDrag`/`handleDrop` in samples.

### Complete Examples

```typescript
import * as vscode from 'vscode';

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<ProjectNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(node?: ProjectNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  getTreeItem(element: ProjectNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectNode): Thenable<ProjectNode[]> {
    return Promise.resolve(element ? element.getChildren() : this.getRootChildren());
  }

  private getRootChildren(): ProjectNode[] {
    return [];
  }
}
```

### API and Schema Documentation

- `TreeDataProvider<T>`: implement `getChildren(element?: T): ProviderResult<T[]>` and `getTreeItem(element: T): TreeItem`.
- `TreeItem.contextValue`: used in `when` clause as `viewItem == <contextValue>` for context menus.
- `views`/`viewsContainers`: contribute view and container in package.json; actions via `menus.view/title` and `menus.view/item/context`.
- `viewsWelcome`: add empty-state guidance with links and command URIs.
- `@vscode/test-cli`: run Mocha-based integration tests using `.vscode-test.mjs` config.

### Configuration Examples

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "projectViewer",
          "name": "Personal Project Manager"
        }
      ]
    },
    "menus": {
      "view/title": [
        {
          "command": "projectviewer.refreshEntry",
          "when": "view == projectViewer",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "projectviewer.renameItem",
          "when": "view == projectViewer && viewItem == physicalFile"
        }
      ]
    }
  }
}
```

### Technical Requirements

- PRD specifies commands, tree sorting hierarchy, manual link storage in `.project-explorer-links.json`, and global `projects.json` storage.
- File system watching uses `FileSystemWatcher` with debouncing and exclusions; map of watchers by project path.
- Drag-and-drop includes on-disk moves for physical items and re-parenting for manual items.
- UX constraints: limit view actions, use welcome views when empty, and avoid deep nesting where possible.

## Recommended Approach

**TreeDataProvider-only with direct fs operations**
- Use a dedicated tree model that merges physical filesystem items with manual link entries.
- Use `vscode.workspace.createFileSystemWatcher` for the active project root, debounced refresh, and a cached tree for performance.
- Use direct Node fs operations for create/rename/delete and update tree via watcher + explicit refresh.

## Implementation Guidance

- **Objectives**: Align package.json contributions with PRD, implement tree view with correct sorting and context menus, and persist project and link data with atomic writes.
- **Key Tasks**: Build tree model and provider, implement commands per PRD, add file watching, add storage layer for projects and links, implement drag-and-drop.
- **Dependencies**: VS Code Tree View API, `FileSystemWatcher`, `@vscode/test-cli` for integration tests, Node fs for file operations.
- **Success Criteria**: Commands and context menus match PRD, tree updates on filesystem changes, manual links persist in project root, and tests validate CRUD + watcher behavior.

### Phase-by-Phase Breakdown

**Phase 1: Shell + View Contribution**
- Add view container + view in package.json and set activation to `onView:projectViewer`.
- Register `TreeDataProvider` and basic commands (`createNewProject`, `openProject`, `closeProject`, `refreshEntry`).
- Add `viewsWelcome` content for the empty state and view title actions per PRD.

**Phase 2: Storage Layer (Projects + Links)**
- Implement `projects.json` read/write in global storage with atomic writes.
- Implement `.project-explorer-links.json` in project root with atomic writes and path validation.
- Add workspace state for `projectviewer.activeProjectName` and recent projects list.

**Phase 3: Tree Model + Sorting**
- Build a tree model that merges physical items and manual links, including missing/broken items.
- Implement sorting hierarchy: physical dirs, manual dirs, physical files, manual files, broken items.
- Add context values for each item type to drive menu visibility.

**Phase 4: File Operations**
- Implement create/rename/delete for physical items using Node fs.
- Implement add/remove external items and update link configuration file.
- Implement copy path/relative path and open containing folder.

**Phase 5: Watchers + Refresh**
- Add `FileSystemWatcher` per active project root with debounce.
- Ensure watcher lifecycle is managed (create on open, dispose on close).
- Implement manual refresh command to re-scan tree and update broken links count.

**Phase 6: Drag and Drop**
- Implement internal drag/drop for physical items (move on disk).
- Implement drag/drop for manual items (re-parent in config only).
- Validate drop targets and handle error states.

**Phase 7: Tests + UX Polish**
- Add unit tests for storage, sorting, and path validation.
- Add integration tests for watcher updates and core commands.
- Ensure view actions count is minimal and welcome view content matches UX guidance.