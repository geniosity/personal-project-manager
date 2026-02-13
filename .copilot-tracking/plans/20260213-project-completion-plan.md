<!-- markdownlint-disable-file -->

# Implementation Plan: Complete Personal Project Manager Extension

## Executive Summary

**Status**: Infrastructure 100% complete, Commands 15% complete
**Remaining Work**: Implement command handlers, integrate tree provider with tree model, complete drag-drop
**Estimated Effort**: 14-21 hours (2-3 working days)
**Priority**: Tree provider integration is blocking - must be first

## Current State Assessment

###  Complete (Tested & Working)
- Storage layer (ProjectsStorage, LinksStorage) with atomic writes
- Tree model with sorting and node hierarchy
- File system watcher with debouncing
- State management for active project
- Package.json configuration (views, commands, menus)
- Test suite (20 tests, storage + tree model)

###  Partially Complete
- Tree provider structure exists but doesn't use TreeModel
- Some commands have input validation but no actual operations
- Drag-drop controller registers but doesn't implement handlers

###  Not Implemented
- Tree provider integration with TreeModel (BLOCKING)
- 16 command implementations (all stubs)
- 7 commands missing from package.json
- Drag-drop logic (move files, re-parent links)
- Context menu entries for project/directory operations

## Implementation Plan

### Phase 1: Enable Tree Display (CRITICAL - BLOCKING)

**Goal**: Make the tree view functional so manual testing is possible

**Task 1.1: Convert TreeModel nodes to TreeItems**
- Create helper function to convert NodeModel to ProjectNode with proper properties
- Set resourceUri for file decorations
- Set iconPath for file/folder icons
- Set command for opening files on click
- **Implementation Location**: src/extension.ts, after ProjectNode class
- **Estimated Time**: 30 minutes

**Task 1.2: Integrate TreeModel into getChildren**
- Update ProjectTreeProvider.getChildren to use TreeModel
- Handle both root level (projects) and child level (project contents)
- Only show children for the active project
- **Implementation Location**: src/extension.ts, ProjectTreeProvider.getChildren method
- **Estimated Time**: 45 minutes

**Task 1.3: Test tree display**
- Manually create a project using storage API in debug console
- Verify tree displays physical directories and files
- Add a manual link using storage API
- Verify manual items appear with correct icons
- **Verification**: Visual inspection in debug Extension Host
- **Estimated Time**: 30 minutes

**Phase 1 Total**: 1.75 hours

### Phase 2: Project Management Commands

**Goal**: Enable creating, managing, and switching between projects

**Task 2.1: Implement createNewProject**
- Show directory picker (vscode.window.showOpenDialog)
- Show input box for project name with validation
- Call projectsStorage.addProject
- Set as active project (stateManager.setActiveProjectName)
- Create and start file watcher
- Refresh tree
- **Implementation Location**: src/extension.ts, createNewProject command handler
- **Estimated Time**: 45 minutes
- **Dependencies**: None
- **Testing**: Create project, verify appears in tree

**Task 2.2: Add renameProject command**
- Add command to package.json commands array
- Add context menu entry for project items
- Implement handler: input box, update storage, update state if active
- **Implementation Location**: package.json + src/extension.ts
- **Estimated Time**: 30 minutes
- **Dependencies**: None
- **Testing**: Rename active project, verify name changes

**Task 2.3: Add deleteProject command**
- Add command to package.json
- Add context menu entry
- Implement handler: confirmation dialog, remove from storage, close if active
- **Implementation Location**: package.json + src/extension.ts
- **Estimated Time**: 30 minutes
- **Dependencies**: None
- **Testing**: Delete inactive project, delete active project

**Task 2.4: Add cleanProject command**
- Add command to package.json (view/title menu)
- Implement handler: get broken links, remove each, show count
- **Implementation Location**: package.json + src/extension.ts
- **Estimated Time**: 30 minutes
- **Dependencies**: None
- **Testing**: Create broken link, run clean, verify removal

**Phase 2 Total**: 2.25 hours

### Phase 3: File Operations

**Goal**: Enable creating, modifying, and deleting files/folders

**Task 3.1: Add newFile command**
- Add to package.json commands
- Add context menu entries (project, physicalDir, manualDir)
- Implement handler: extract parent path, input box, create file
- Use vscode.workspace.fs.writeFile for VS Code-native operation
- **Implementation Location**: package.json + src/extension.ts
- **Estimated Time**: 45 minutes
- **Dependencies**: Phase 1 (need tree working)
- **Testing**: Create file in project root, create in subdirectory

**Task 3.2: Add newFolder command**
- Add to package.json
- Add context menu entries
- Implement handler: extract parent path, input box, create directory
- **Implementation Location**: package.json + src/extension.ts
- **Estimated Time**: 30 minutes
- **Dependencies**: Phase 1
- **Testing**: Create folder, verify appears and is expandable

**Task 3.3: Complete renameItem implementation**
- Replace stub with actual rename logic
- Get old path from node, calculate new path
- Use vscode.workspace.fs.rename
- **Implementation Location**: src/extension.ts, renameItem handler
- **Estimated Time**: 45 minutes
- **Dependencies**: Phase 1
- **Testing**: Rename file, rename folder with contents

**Task 3.4: Complete deleteItem implementation**
- Replace stub with actual delete logic
- Use vscode.workspace.fs.delete with recursive option
- **Implementation Location**: src/extension.ts, deleteItem handler
- **Estimated Time**: 30 minutes
- **Dependencies**: Phase 1
- **Testing**: Delete file, delete folder with contents

**Phase 3 Total**: 2.5 hours

### Phase 4: External Links Management

**Goal**: Enable adding and removing manual links to external files/folders

**Task 4.1: Implement addExternalLink**
- Show file/folder picker with canSelectMany
- Loop through selected items
- Call linksStorage.addLink for each
- Refresh tree (manual operation, watcher won't catch)
- **Implementation Location**: src/extension.ts, addExternalLink handler
- **Estimated Time**: 1 hour
- **Dependencies**: Phase 1
- **Testing**: Add single file, add multiple files, add folder

**Task 4.2: Implement removeLink**
- Extract link metadata from node
- Call linksStorage.removeLink
- Refresh tree
- **Implementation Location**: src/extension.ts, removeLink handler
- **Estimated Time**: 30 minutes
- **Dependencies**: Phase 1, Task 4.1
- **Testing**: Remove manual file, remove manual folder

**Phase 4 Total**: 1.5 hours

### Phase 5: Utility Commands

**Goal**: Enable clipboard operations and file system navigation

**Task 5.1: Implement copyPath**
- Extract absolute path from node
- Use vscode.env.clipboard.writeText
- Show brief confirmation
- **Implementation Location**: src/extension.ts, copyPath handler
- **Estimated Time**: 15 minutes
- **Dependencies**: None
- **Testing**: Copy path, paste in terminal

**Task 5.2: Implement copyRelativePath**
- Extract absolute path from node
- Get active project root path
- Calculate relative path using path.relative
- Copy to clipboard
- **Implementation Location**: src/extension.ts, copyRelativePath handler
- **Estimated Time**: 20 minutes
- **Dependencies**: None
- **Testing**: Copy relative path from nested file

**Task 5.3: Implement openContainingFolder**
- Extract path from node (directory itself for folders, parent for files)
- Use vscode.commands.executeCommand('revealFileInOS', uri)
- **Implementation Location**: src/extension.ts, openContainingFolder handler
- **Estimated Time**: 15 minutes
- **Dependencies**: None
- **Testing**: Open folder from file node, from directory node

**Task 5.4: Add and implement revealActiveFile**
- Add command to package.json (view/title menu)
- Get active editor's document URI
- Find matching node in tree
- Use treeView.reveal() to select and expand
- **Implementation Location**: package.json + src/extension.ts
- **Estimated Time**: 1 hour
- **Dependencies**: Phase 1 (need tree working)
- **Testing**: Open file outside tree, click reveal, verify selection

**Phase 5 Total**: 1.83 hours

### Phase 6: Drag and Drop

**Goal**: Enable dragging files/folders to reorganize project

**Task 6.1: Implement handleDrag**
- Extract node information (path, type, link ID)
- Create DataTransferItem with custom MIME type
- Store metadata needed for drop operation
- **Implementation Location**: src/dragDropController.ts
- **Estimated Time**: 30 minutes
- **Dependencies**: Phase 1
- **Testing**: Verify drag cursor appears

**Task 6.2: Implement handleDrop - Physical Items**
- Validate drop target (must be directory)
- Validate not dropping on self or child
- Calculate new path
- Use vscode.workspace.fs.rename to move on disk
- **Implementation Location**: src/dragDropController.ts
- **Estimated Time**: 1 hour
- **Dependencies**: Task 6.1
- **Testing**: Drag file between folders, drag folder into folder

**Task 6.3: Implement handleDrop - Manual Items**
- Detect if dragged item is manual link
- Update parentId in linksStorage
- Refresh tree (watcher won't catch config changes)
- **Implementation Location**: src/dragDropController.ts
- **Estimated Time**: 45 minutes
- **Dependencies**: Task 6.1, Phase 4
- **Testing**: Drag manual file to different folder, verify stays linked

**Phase 6 Total**: 2.25 hours

### Phase 7: Context Menu Completion

**Goal**: Add all missing context menu entries per PRD

**Task 7.1: Add project root context menu entries**
- Add newFile, newFolder, addExternalLink menu entries
- Add renameProject, deleteProject entries
- Add closeProject entry
- Group appropriately in package.json
- **Implementation Location**: package.json, menus.view/item/context
- **Estimated Time**: 30 minutes
- **Dependencies**: Phases 2, 3, 4
- **Testing**: Right-click project, verify all options present

**Task 7.2: Add directory context menu entries**
- Add newFile, newFolder, addExternalLink for physicalDir
- Add same for manualDir
- **Implementation Location**: package.json
- **Estimated Time**: 20 minutes
- **Dependencies**: Phases 3, 4
- **Testing**: Right-click directory, verify options

**Task 7.3: Update command visibility conditions**
- Ensure when clauses properly filter by viewItem
- Test edge cases (broken links should have limited menu)
- **Implementation Location**: package.json
- **Estimated Time**: 20 minutes
- **Dependencies**: All previous phases
- **Testing**: Right-click each node type, verify appropriate menus

**Phase 7 Total**: 1.17 hours

### Phase 8: Testing and Polish

**Goal**: Verify all functionality works correctly

**Task 8.1: Manual functional testing**
- Test each command in isolation
- Test command sequences (create project  add files  reorganize)
- Test edge cases (renamed files, deleted folders, broken links)
- Create checklist from PRD Section 3 (Feature Specification)
- **Estimated Time**: 2 hours

**Task 8.2: Error handling verification**
- Test invalid inputs (empty names, invalid characters)
- Test file system errors (permission denied, disk full)
- Verify error messages are clear and actionable
- **Estimated Time**: 1 hour

**Task 8.3: Code cleanup**
- Remove debug console.log statements
- Ensure all JSDoc comments are complete
- Run ESLint and fix any new warnings
- Format code consistently
- **Estimated Time**: 30 minutes

**Phase 8 Total**: 3.5 hours

## Total Estimated Time: 16.75 hours

## Success Criteria Validation

After implementation, verify these criteria from PRD:

### Functional Requirements
- [ ] Can create new projects and they persist across sessions
- [ ] Can open/switch between projects
- [ ] Tree displays correct hierarchy with proper sorting
- [ ] Can create files and folders in project
- [ ] Can rename and delete physical items
- [ ] Can add external files/folders as manual links
- [ ] Manual links persist in project root
- [ ] Can remove manual links
- [ ] Broken links are detected and marked
- [ ] Can clean broken links from project
- [ ] File watcher auto-updates tree on changes
- [ ] Can copy absolute and relative paths
- [ ] Can open containing folder in OS
- [ ] Can reveal active editor file in tree
- [ ] Can drag-drop to reorganize physical items
- [ ] Can drag-drop to re-parent manual links

### Technical Requirements
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings
- [ ] Extension activates without errors
- [ ] All commands execute without errors
- [ ] Data persists correctly (projects.json, .project-explorer-links.json)
- [ ] File watcher disposes properly on close
- [ ] Context menus show correct commands for each item type

### UX Requirements
- [ ] Welcome view shows when no projects
- [ ] Tree toolbar has minimal actions (3-4 max)
- [ ] Context menus are organized in logical groups
- [ ] Error messages are clear and actionable
- [ ] Confirmations appear for destructive operations
- [ ] Operations provide user feedback (info messages, tree updates)

## Risk Mitigation

### Risk 1: TreeModel integration complexity
- **Mitigation**: Phase 1 is isolated and can be thoroughly tested before proceeding
- **Fallback**: TreeModel tests already pass, so integration is the only risk

### Risk 2: File system operations platform differences
- **Mitigation**: Use vscode.workspace.fs API (cross-platform)
- **Testing**: Test on Windows initially, document any platform issues

### Risk 3: Drag-drop validation edge cases
- **Mitigation**: Implement comprehensive validation before any file operations
- **Testing**: Create test matrix of valid/invalid drop combinations

### Risk 4: Time estimation accuracy
- **Buffer**: Built-in 2-hour buffer (19 hours vs 21 hour upper estimate)
- **Monitoring**: Track actual time per phase, adjust plan if needed

## Dependencies and Blockers

### External Dependencies
None - all VS Code APIs are available, no new npm packages needed

### Internal Dependencies
- Phase 1 blocks all testing-dependent phases
- Phase 2, 3, 4, 5 are independent after Phase 1
- Phase 6 depends on multiple previous phases
- Phase 7 depends on command availability
- Phase 8 is final validation

### Recommended Order
1. Phase 1 (enables manual testing)
2. Phase 2 (can create and manage projects)
3. Phase 3 (file operations)
4. Phase 4 (external links)
5. Phase 5 (utilities)
6. Phase 6 (drag-drop)
7. Phase 7 (menu polish)
8. Phase 8 (final testing)

## Next Steps

1. **Review this plan** with stakeholder/user
2. **Create task branch** (optional, or work in main)
3. **Begin Phase 1** - Critical path to enable testing
4. **Incremental commits** - Commit after each task completion
5. **Continuous testing** - Test each command immediately after implementation
6. **Update plan** - Mark tasks complete, adjust estimates as needed

## Reference Documents

- **PRD**: .github/project-details/PRD.md
- **Research**: .copilot-tracking/research/20260213-project-completion-research.md
- **Previous Plan**: .copilot-tracking/plans/20260213-personal-project-manager-prd-plan.instructions.md
- **Implementation Summary**: .copilot-tracking/implementation-summary.md

