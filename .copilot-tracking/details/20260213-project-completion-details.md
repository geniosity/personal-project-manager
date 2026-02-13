<!-- markdownlint-disable-file -->

# Task Details: Complete Personal Project Manager Extension

## Research Reference

**Source Research**: #file:../research/20260213-project-completion-research.md

## Phase 1: Enable Tree Display (CRITICAL - BLOCKING)

### Task 1.1: Convert NodeModel to TreeItem

Create helper function to convert TreeModel nodes to VS Code TreeItems with proper configuration.

- **Files**:
  - src/extension.ts - Add convertNodeToTreeItem function after ProjectNode class
- **Success**:
  - Function accepts NodeModel and returns vscode.TreeItem
  - Sets resourceUri for file decorations
  - Sets iconPath for folders/files
  - Sets command for file nodes to open editor
  - Sets collapsibleState based on node type
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 172-215) - Tree Provider Integration
- **Dependencies**:
  - None - TreeModel already complete

### Task 1.2: Integrate TreeModel into ProjectTreeProvider.getChildren

Update getChildren method to use TreeModel for generating child nodes.

- **Files**:
  - src/extension.ts - ProjectTreeProvider.getChildren method (lines 70-90)
- **Success**:
  - Root level returns all projects from storage
  - Project level returns TreeModel children for active project only
  - Manual links display with correct icons
  - Physical items display correctly
  - Broken links show with warning icon
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 172-215) - Implementation pattern
  - #file:src/treeModel.ts - ProjectModel.getChildren already implemented
- **Dependencies**:
  - Task 1.1 (need conversion function)

### Task 1.3: Add file opening on click

Configure TreeItems to open files when clicked.

- **Files**:
  - src/extension.ts - convertNodeToTreeItem function
- **Success**:
  - Clicking file node opens in editor
  - Creates permanent tab (not preview)
  - Folders expand/collapse normally
  - Links to files open the linked file
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 172-215)
- **Dependencies**:
  - Task 1.1

## Phase 2: Project Management Commands

### Task 2.1: Implement createNewProject command

Enable users to create new projects through UI dialogs.

- **Files**:
  - src/extension.ts - createNewProject command handler (line ~123)
- **Success**:
  - Directory picker opens with appropriate options
  - Input box validates project name (no empty, no duplicates)
  - Creates project in storage
  - Sets as active project
  - Starts file watcher
  - Refreshes tree to show project
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 217-260) - Command implementations
  - #file:../../.github/project-details/PRD.md (Lines 47-70) - Create New Project spec
- **Dependencies**:
  - Phase 1 (need working tree for visual feedback)

### Task 2.2: Implement renameProject command

Allow renaming existing projects.

- **Files**:
  - package.json - Add command definition and context menu entry
  - src/extension.ts - Add renameProject command handler
- **Success**:
  - Input box shows current name
  - Validates new name (no empty, no duplicates)
  - Updates storage (remove old, add new with same path)
  - Updates state if project is active
  - Refreshes tree
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 217-260)
  - #file:../../.github/project-details/PRD.md (Lines 90-102) - Rename Project spec
- **Dependencies**:
  - None

### Task 2.3: Implement deleteProject command

Allow deleting project definitions (not disk files).

- **Files**:
  - package.json - Add command and context menu
  - src/extension.ts - Add deleteProject handler
- **Success**:
  - Shows modal confirmation with clear warning
  - Removes from storage
  - Closes project if currently active
  - Disposes watcher if active
  - Refreshes tree
  - Does NOT delete physical files
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 217-260)
  - #file:../../.github/project-details/PRD.md (Lines 104-119) - Delete Project spec
- **Dependencies**:
  - None

### Task 2.4: Implement cleanProject command

Remove broken links from active project.

- **Files**:
  - package.json - Add command to view/title menu
  - src/extension.ts - Add cleanProject handler
- **Success**:
  - Gets broken links from linksStorage
  - Removes each broken link
  - Shows count of removed links
  - Refreshes tree to remove broken items
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 217-260)
  - #file:src/linksStorage.ts (Lines 165-175) - getBrokenLinks method
- **Dependencies**:
  - Phase 1 (need active project context)

## Phase 3: File Operations

### Task 3.1: Implement newFile command

Create new files within directories.

- **Files**:
  - package.json - Add command and context menu entries
  - src/extension.ts - Add newFile handler
- **Success**:
  - Extracts parent directory from node
  - Shows input box for filename
  - Validates filename (no empty, no path separators, no duplicates)
  - Creates file using vscode.workspace.fs.writeFile
  - File appears in tree via watcher
  - Optionally opens file in editor
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 262-295) - File operations
  - #file:../../.github/project-details/PRD.md (Lines 421-437) - New File spec
- **Dependencies**:
  - Phase 1 (need tree context)

### Task 3.2: Implement newFolder command

Create new subdirectories.

- **Files**:
  - package.json - Add command and context menu
  - src/extension.ts - Add newFolder handler
- **Success**:
  - Extracts parent directory
  - Input box for folder name
  - Validates (no empty, no separators, no duplicates)
  - Creates using fs.mkdirSync (already used in extension.ts)
  - Folder appears expanded in tree
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 262-295)
  - #file:../../.github/project-details/PRD.md (Lines 439-455) - New Folder spec
- **Dependencies**:
  - Phase 1

### Task 3.3: Complete renameItem implementation

Replace stub with actual rename functionality.

- **Files**:
  - src/extension.ts - renameItem handler (lines 282-301)
- **Success**:
  - Gets current path from node context
  - Calculates new path in same directory
  - Uses vscode.workspace.fs.rename
  - Handles open files in editor
  - Tree updates via watcher
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 262-295)
  - #file:../../.github/project-details/PRD.md (Lines 457-476) - Rename Item spec
- **Dependencies**:
  - Phase 1 (need node context)

### Task 3.4: Complete deleteItem implementation

Replace stub with actual delete functionality.

- **Files**:
  - src/extension.ts - deleteItem handler (lines 305-319)
- **Success**:
  - Gets path from node
  - Shows confirmation with item count if folder
  - Uses vscode.workspace.fs.delete with recursive option
  - Handles open files in editor
  - Tree updates via watcher
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 262-295)
  - #file:../../.github/project-details/PRD.md (Lines 478-502) - Delete Item spec
- **Dependencies**:
  - Phase 1

## Phase 4: External Links Management

### Task 4.1: Implement addExternalLink command

Add files/folders from outside project to manual links.

- **Files**:
  - src/extension.ts - addExternalLink handler (line ~194)
- **Success**:
  - Shows open dialog with canSelectMany, canSelectFiles, canSelectFolders
  - Gets active project root
  - Loops through selections
  - Calls linksStorage.addLink for each
  - Refreshes tree manually (not caught by watcher)
  - Links appear with external icon
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 297-315) - External links
  - #file:src/linksStorage.ts (Lines 70-103) - addLink method
- **Dependencies**:
  - Phase 1

### Task 4.2: Implement removeLink command

Remove manual links from project.

- **Files**:
  - src/extension.ts - removeLink handler (line ~198)
- **Success**:
  - Extracts link ID from node
  - Gets active project root
  - Calls linksStorage.removeLink
  - Refreshes tree
  - Link disappears from tree
  - Physical file remains on disk
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 297-315)
  - #file:src/linksStorage.ts (Lines 109-119) - removeLink method
- **Dependencies**:
  - Phase 1, Task 4.1

## Phase 5: Utility Commands

### Task 5.1: Implement copyPath command

Copy absolute path to clipboard.

- **Files**:
  - src/extension.ts - copyPath handler (line ~202)
- **Success**:
  - Gets absolute path from node
  - Uses vscode.env.clipboard.writeText
  - Shows brief confirmation message
  - Works for all node types
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 317-345) - Utility commands
  - #file:../../.github/project-details/PRD.md (Lines 600-610) - Copy Path spec
- **Dependencies**:
  - Phase 1 (need node context)

### Task 5.2: Implement copyRelativePath command

Copy path relative to project root.

- **Files**:
  - src/extension.ts - copyRelativePath handler (line ~206)
- **Success**:
  - Gets absolute path from node
  - Gets active project root
  - Calculates relative using path.relative
  - Copies to clipboard
  - Only available for physical items
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 317-345)
  - #file:../../.github/project-details/PRD.md (Lines 612-624) - Copy Relative Path spec
- **Dependencies**:
  - Phase 1

### Task 5.3: Implement openContainingFolder command

Open OS file explorer at item location.

- **Files**:
  - src/extension.ts - openContainingFolder handler (line ~210)
- **Success**:
  - Gets directory path (dirname for files, path for folders)
  - Uses vscode.commands.executeCommand('revealFileInOS')
  - Opens system explorer at correct location
  - Works cross-platform
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 317-345)
  - #file:../../.github/project-details/PRD.md (Lines 574-588) - Open Containing Folder spec
- **Dependencies**:
  - None

### Task 5.4: Implement revealActiveFile command

Find and select active editor file in tree.

- **Files**:
  - package.json - Add command to view/title menu
  - src/extension.ts - Add revealActiveFile handler
- **Success**:
  - Gets active editor document URI
  - Searches tree for matching file
  - Uses treeView.reveal() with expand and select
  - Shows message if file not in project
  - Shows message if no file active
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 317-345)
  - #file:../../.github/project-details/PRD.md (Lines 540-557) - Reveal Active File spec
- **Dependencies**:
  - Phase 1 (need tree working)

## Phase 6: Drag and Drop

### Task 6.1: Implement handleDrag

Extract node data for drag operations.

- **Files**:
  - src/dragDropController.ts - handleDrag method
- **Success**:
  - Extracts node path, type, context value
  - For manual items, extracts link ID
  - Creates DataTransferItem with custom MIME type
  - Stores metadata for drop validation
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 347-375) - Drag and drop
  - #githubRepo:"microsoft/vscode-extension-samples tree-view drag" - Drag-drop examples
- **Dependencies**:
  - Phase 1

### Task 6.2: Implement handleDrop for physical items

Move files/folders on disk via drag-drop.

- **Files**:
  - src/dragDropController.ts - handleDrop method
- **Success**:
  - Validates target is directory
  - Validates not dropping on self or descendant
  - Calculates new path
  - Uses vscode.workspace.fs.rename
  - Shows error on validation failure
  - Tree updates via watcher
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 347-375)
  - #file:../../.github/project-details/PRD.md (Lines 698-735) - Drag and Drop spec
- **Dependencies**:
  - Task 6.1

### Task 6.3: Implement handleDrop for manual items

Re-parent manual links via drag-drop.

- **Files**:
  - src/dragDropController.ts - handleDrop method (manual item path)
- **Success**:
  - Detects dragged item is manual link
  - Updates parentId in linksStorage
  - Refreshes tree manually
  - Link remains pointing to same file
  - Tree structure changes to show new parent
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 347-375)
  - #file:src/linksStorage.ts (Lines 128-147) - updateLinkMetadata method
- **Dependencies**:
  - Task 6.1, Phase 4

## Phase 7: Context Menu Completion

### Task 7.1: Add project root context menu entries

Complete context menu for project items.

- **Files**:
  - package.json - menus.view/item/context section
- **Success**:
  - newFile when viewItem == project
  - newFolder when viewItem == project
  - addExternalLink when viewItem == project
  - renameProject when viewItem == project
  - deleteProject when viewItem == project
  - closeProject when viewItem == project
  - Menus organized in logical groups
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 115-150) - Missing context menus
  - #file:../../.github/project-details/PRD.md (Lines 795-812) - Project Root Context Menu
- **Dependencies**:
  - Phases 2, 3, 4

### Task 7.2: Add directory context menu entries

Complete context menus for physical and manual directories.

- **Files**:
  - package.json - menus.view/item/context section
- **Success**:
  - newFile for physicalDir and manualDir
  - newFolder for physicalDir and manualDir
  - addExternalLink for physicalDir and manualDir
  - Proper when clauses with regex
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 115-150)
  - #file:../../.github/project-details/PRD.md (Lines 814-830) - Directory Context Menus
- **Dependencies**:
  - Phases 3, 4

### Task 7.3: Verify and test context menu visibility

Ensure correct commands appear for each item type.

- **Files**:
  - package.json - Review all when clauses
- **Success**:
  - Physical items show rename/delete
  - Manual items show remove link
  - Broken links show only remove
  - Project shows project-specific commands
  - No command appears in wrong context
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 115-150)
- **Dependencies**:
  - All command phases

## Phase 8: Testing and Verification

### Task 8.1: Manual functional testing

Test all features end-to-end.

- **Files**:
  - Manual testing in Extension Development Host
- **Success**:
  - Can create, rename, delete projects
  - Tree displays all item types correctly
  - Can create, rename, delete files/folders
  - Can add/remove external links
  - Broken links appear with warning
  - cleanProject removes broken links
  - Copy operations work
  - Reveal active file works
  - Drag-drop works for both physical and manual items
- **Research References**:
  - #file:../../.github/project-details/PRD.md - Complete feature specification
- **Dependencies**:
  - All previous phases

### Task 8.2: Error handling verification

Test error cases and edge conditions.

- **Files**:
  - Extension functionality
- **Success**:
  - Empty names rejected with clear message
  - Duplicate names prevented
  - Invalid characters rejected
  - File system errors handled gracefully
  - Permission errors show helpful message
  - Confirmation dialogs work correctly
- **Research References**:
  - #file:../../.github/project-details/PRD.md (Lines 1251-1285) - Error Handling
- **Dependencies**:
  - All previous phases

### Task 8.3: Code quality review

Ensure code meets standards.

- **Files**:
  - All src/*.ts files
- **Success**:
  - No TypeScript errors
  - No ESLint warnings
  - JSDoc complete and accurate
  - No console.log debug statements
  - Consistent formatting
  - Proper error handling with Error class
- **Research References**:
  - #file:../research/20260213-project-completion-research.md (Lines 47-57) - Standards
  - #file:../../eslint.config.mjs - Linting rules
- **Dependencies**:
  - All implementation phases

## Dependencies

- VS Code ^1.109.0
- Node.js fs, path modules
- TreeView API, FileSystemWatcher API
- Storage APIs (workspace.fs, globalState)
- All infrastructure already in place

## Success Criteria

- [ ] Tree view displays all projects and their contents
- [ ] All 23 commands execute successfully
- [ ] Context menus show appropriate options for each item type
- [ ] File operations persist correctly
- [ ] Manual links persist in project root
- [ ] Broken links detected and removable
- [ ] File watcher updates tree automatically
- [ ] Drag-drop works for reorganizing
- [ ] No compilation or lint errors
- [ ] Extension runs without errors in Development Host
- [ ] All PRD requirements satisfied
