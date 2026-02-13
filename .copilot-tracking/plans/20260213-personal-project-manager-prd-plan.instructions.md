---
applyTo: ".copilot-tracking/changes/20260213-personal-project-manager-prd-changes.md"
---

<!-- markdownlint-disable-file -->

# Task Checklist: Personal Project Manager PRD Implementation

## Overview

Implement a complete tree-view-based project manager extension for VS Code that integrates physical filesystem directories with manually-managed external project links, following the detailed functional requirements in the PRD.

## Objectives

- Implement tree view with correct sorting hierarchy (physical dirs, manual dirs, physical files, manual files, broken items)
- Create storage layer for global projects.json and per-project .project-explorer-links.json
- Add file system watcher with debouncing for automatic tree updates
- Implement all CRUD operations (create, rename, delete, copy path, open folder)
- Support drag-and-drop for both physical items and manual links
- Achieve full test coverage including integration tests for watcher behavior
- Deliver UX that follows VS Code guidelines with minimal view actions and appropriate welcome content

## Research Summary

### Project Files

- .github/project-details/PRD.md - Detailed functional requirements, commands, data model, tree view behavior
- src/extension.ts - Placeholder hello-world activation; needs tree view implementation
- package.json - Current minimal command contribution; needs view/container and menu contributions
- src/test/extension.test.ts - Mocha test stub; needs comprehensive test coverage

### External References

- #file:../research/20260213-personal-project-manager-prd-research.md - Complete API patterns, code examples, project analysis
- #githubRepo:"microsoft/vscode-extension-samples tree-view TreeDataProvider TreeDragAndDropController" - Tree view samples showing implementation patterns
- #fetch:https://code.visualstudio.com/api/extension-guides/tree-view - Official VS Code tree view API documentation
- #fetch:https://code.visualstudio.com/api/ux-guidelines/views - UX guidelines for view design and interaction

### Standards References

- #file:../../eslint.config.mjs - ESLint rules for naming conventions, strict equality, curly braces, semicolons
- #file:../../tsconfig.json - TypeScript strict mode configuration with ES2022 target

## Implementation Checklist

### [ ] Phase 1: Shell + View Contribution

- [ ] Task 1.1: Update package.json with view container and view contributions
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 17-45)

- [ ] Task 1.2: Update activation event to onView:projectViewer
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 47-60)

- [ ] Task 1.3: Implement TreeDataProvider class structure
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 62-85)

- [ ] Task 1.4: Add viewsWelcome content for empty state
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 87-105)

- [ ] Task 1.5: Register basic commands and tree provider
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 107-130)

### [ ] Phase 2: Storage Layer (Projects + Links)

- [ ] Task 2.1: Implement projects.json global storage with atomic writes
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 132-165)

- [ ] Task 2.2: Implement .project-explorer-links.json per-project storage
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 167-195)

- [ ] Task 2.3: Implement workspace state for activeProjectName and recent projects
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 197-215)

### [ ] Phase 3: Tree Model + Sorting

- [ ] Task 3.1: Build tree model that merges physical items and manual links
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 217-260)

- [ ] Task 3.2: Implement sorting hierarchy with context values
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 262-295)

- [ ] Task 3.3: Add broken/missing item tracking and display
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 297-315)

### [ ] Phase 4: File Operations

- [ ] Task 4.1: Implement create directory command for physical items
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 317-345)

- [ ] Task 4.2: Implement rename and delete for physical items
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 347-375)

- [ ] Task 4.3: Implement add/remove external links command
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 377-405)

- [ ] Task 4.4: Implement copy path and open folder commands
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 407-430)

### [ ] Phase 5: Watchers + Refresh

- [ ] Task 5.1: Implement FileSystemWatcher with debouncing
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 432-470)

- [ ] Task 5.2: Manage watcher lifecycle (create on open, dispose on close)
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 472-495)

- [ ] Task 5.3: Implement manual refresh command and tree updates
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 497-515)

### [ ] Phase 6: Drag and Drop

- [ ] Task 6.1: Implement TreeDragAndDropController for physical items
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 517-555)

- [ ] Task 6.2: Implement drag/drop for manual items (re-parent in config)
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 557-585)

- [ ] Task 6.3: Validate drop targets and handle error states
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 587-610)

### [ ] Phase 7: Tests + UX Polish

- [ ] Task 7.1: Add unit tests for storage and path validation
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 612-645)

- [ ] Task 7.2: Add integration tests for watcher and commands
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 647-680)

- [ ] Task 7.3: Verify view actions and welcome content UX guidelines compliance
  - Details: .copilot-tracking/details/20260213-personal-project-manager-prd-details.md (Lines 682-705)

## Dependencies

- VS Code Tree View API (TreeDataProvider, TreeItem, TreeView)
- VS Code File System Watcher API
- VS Code Storage API (globalState, workspaceState)
- @vscode/test-cli for integration test execution
- Node.js fs module for file operations
- TypeScript 4.7+

## Success Criteria

- All package.json contributions match PRD requirements (view, context menus, welcome content)
- Tree view displays correct hierarchy with proper sorting and context values
- Global projects.json and per-project .project-explorer-links.json persist correctly
- File system watcher detects changes with debouncing and updates tree automatically
- All CRUD commands execute successfully and update both tree and storage
- Drag-and-drop operations move physical items on disk and re-parent manual items in config
- Integration tests pass, validating watcher behavior, command execution, and storage operations
- UX assessment confirms compliance with minimal actions and appropriate welcome content
