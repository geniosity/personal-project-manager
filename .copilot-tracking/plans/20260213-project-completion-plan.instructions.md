---
applyTo: ".copilot-tracking/changes/20260213-project-completion-changes.md"
---

<!-- markdownlint-disable-file -->

# Task Checklist: Complete Personal Project Manager Extension

## Overview

Complete implementation of all command handlers, integrate tree provider with tree model, implement drag-drop functionality, and finalize all context menus to deliver a fully functional VS Code project management extension per PRD requirements.

## Objectives

- Connect TreeDataProvider to TreeModel for functional tree display (BLOCKING)
- Implement all 16 stubbed command handlers with actual functionality
- Add 7 missing commands (newFile, newFolder, renameProject, deleteProject, cleanProject, revealActiveFile)
- Complete drag-drop implementation for physical items and manual links
- Update context menus with all required entries per PRD
- Ensure all operations persist correctly to storage
- Verify extension runs error-free with all features working

## Research Summary

### Project Files

- src/extension.ts - Tree provider structure exists, commands stubbed, needs integration and implementation
- src/treeModel.ts - Complete and tested node hierarchy with sorting
- src/storage.ts - Complete ProjectsStorage with atomic writes
- src/linksStorage.ts - Complete LinksStorage with atomic writes  
- src/dragDropController.ts - Skeleton only, needs handleDrag and handleDrop
- package.json - 11 commands defined, missing 7 more, context menus need completion

### External References

- #file:../research/20260213-project-completion-research.md - Complete implementation analysis and patterns
- #file:../../.github/project-details/PRD.md - Full specification for all features
- #githubRepo:"microsoft/vscode-extension-samples tree-view" - TreeDataProvider and drag-drop patterns
- #fetch:https://code.visualstudio.com/api/extension-guides/tree-view - Tree view API documentation

### Standards References

- #file:../../eslint.config.mjs - ESLint rules for code quality
- #file:../../tsconfig.json - TypeScript strict mode configuration

## Implementation Checklist

### [ ] Phase 1: Enable Tree Display (CRITICAL - BLOCKING)

- [ ] Task 1.1: Convert NodeModel to TreeItem
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 9-27)

- [ ] Task 1.2: Integrate TreeModel into ProjectTreeProvider.getChildren
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 29-48)

- [ ] Task 1.3: Add file opening on click
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 50-65)

### [ ] Phase 2: Project Management Commands

- [ ] Task 2.1: Implement createNewProject command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 69-91)

- [ ] Task 2.2: Implement renameProject command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 93-113)

- [ ] Task 2.3: Implement deleteProject command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 115-137)

- [ ] Task 2.4: Implement cleanProject command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 139-157)

### [ ] Phase 3: File Operations

- [ ] Task 3.1: Implement newFile command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 161-183)

- [ ] Task 3.2: Implement newFolder command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 185-205)

- [ ] Task 3.3: Complete renameItem implementation
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 207-227)

- [ ] Task 3.4: Complete deleteItem implementation
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 229-249)

### [ ] Phase 4: External Links Management

- [ ] Task 4.1: Implement addExternalLink command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 253-277)

- [ ] Task 4.2: Implement removeLink command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 279-299)

### [ ] Phase 5: Utility Commands

- [ ] Task 5.1: Implement copyPath command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 303-320)

- [ ] Task 5.2: Implement copyRelativePath command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 322-341)

- [ ] Task 5.3: Implement openContainingFolder command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 343-360)

- [ ] Task 5.4: Implement revealActiveFile command
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 362-382)

### [ ] Phase 6: Drag and Drop

- [ ] Task 6.1: Implement handleDrag
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 386-404)

- [ ] Task 6.2: Implement handleDrop for physical items
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 406-426)

- [ ] Task 6.3: Implement handleDrop for manual items
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 428-448)

### [ ] Phase 7: Context Menu Completion

- [ ] Task 7.1: Add project root context menu entries
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 452-472)

- [ ] Task 7.2: Add directory context menu entries
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 474-492)

- [ ] Task 7.3: Verify and test context menu visibility
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 494-511)

### [ ] Phase 8: Testing and Verification

- [ ] Task 8.1: Manual functional testing
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 515-536)

- [ ] Task 8.2: Error handling verification
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 538-556)

- [ ] Task 8.3: Code quality review
  - Details: .copilot-tracking/details/20260213-project-completion-details.md (Lines 558-579)

## Dependencies

- VS Code ^1.109.0 (already configured)
- Node.js fs, path modules (already available)
- VS Code TreeView, FileSystemWatcher APIs (already in use)
- Storage infrastructure (ProjectsStorage, LinksStorage, StateManager) - COMPLETE
- TreeModel with sorting and node types - COMPLETE  
- FileWatcher with debouncing - COMPLETE
- Test infrastructure - COMPLETE (20 tests passing)

## Success Criteria

- All 8 phases checked off [x] and completed
- Tree view displays projects, physical items, manual links, and broken links
- All 23 commands execute without errors and produce expected results
- Context menus show appropriate commands for each item type
- File operations persist to disk and storage correctly
- Manual links persist in .project-explorer-links.json
- Broken links detected, displayed, and removable
- File watcher updates tree on filesystem changes
- Drag-drop moves physical items on disk and re-parents manual links
- No TypeScript compilation errors
- No ESLint warnings
- Extension activates and runs without errors in Extension Development Host
- All PRD requirements satisfied per #file:../../.github/project-details/PRD.md

