---
agent: agent
model: Claude Sonnet 4
---

<!-- markdownlint-disable-file -->

# Implementation Prompt: Personal Project Manager PRD Implementation

## Implementation Instructions

### Step 1: Create Changes Tracking File

You WILL create \.copilot-tracking/changes/20260213-personal-project-manager-prd-changes.md\ if it does not exist.

The changes file should track:
- Files created (path, description)
- Files modified (path, summary of changes)
- Configuration changes (package.json contributions)
- Test coverage added (test files created)
- Phase completion status with timestamps

### Step 2: Execute Implementation

You WILL follow the plan structure from #file:../plans/20260213-personal-project-manager-prd-plan.instructions.md

You WILL systematically implement task-by-task in order per phase:

- **Phase 1**: Shell + View Contribution (Tasks 1.1-1.5)
- **Phase 2**: Storage Layer (Tasks 2.1-2.3)
- **Phase 3**: Tree Model + Sorting (Tasks 3.1-3.3)
- **Phase 4**: File Operations (Tasks 4.1-4.4)
- **Phase 5**: Watchers + Refresh (Tasks 5.1-5.3)
- **Phase 6**: Drag and Drop (Tasks 6.1-6.3)
- **Phase 7**: Tests + UX Polish (Tasks 7.1-7.3)

You WILL reference specific line ranges from #file:../details/20260213-personal-project-manager-prd-details.md for each task.

You WILL follow all project standards:
- TypeScript strict mode enabled
- ESLint rules: naming conventions, eqeqeq, curly, semi  
- No throw-literals, use proper Error class
- Use const/let appropriately (no var)
- Interfaces for all class APIs
- Comprehensive JSDoc comments

### Step 3: Verification at Phase Boundaries

After each phase is complete (all checkboxes marked [x]):

1. Review all files created/modified in that phase
2. Verify code compiles with 
pm run compile or TypeScript check
3. Verify no ESLint errors: 
pm run lint or 
px eslint src/**/*.ts
4. Update changes tracking file with completion timestamp
5. Brief summary of phase deliverables

### Step 4: Final Verification

When ALL phases are complete:

1. Run full test suite: verification commands TBD by your implementation
2. Create summary of all changes from #file:../changes/20260213-personal-project-manager-prd-changes.md
3. Provide evidence that:
   - All phases completed
   - Code compiles without errors
   - Tests pass or execution verified
   - Package.json contributions are correct
   - Tree view displays with proper sorting and context values
4. Provide markdown links to:
   - #file:../plans/20260213-personal-project-manager-prd-plan.instructions.md
   - #file:../details/20260213-personal-project-manager-prd-details.md
   - #file:../research/20260213-personal-project-manager-prd-research.md

### Step 5: Cleanup

Upon successful completion:

1. Recommend archiving or deleting:
   - #file:../plans/20260213-personal-project-manager-prd-plan.instructions.md
   - #file:../details/20260213-personal-project-manager-prd-details.md
   - #file:../research/20260213-personal-project-manager-prd-research.md
2. Attempt to delete this prompt file: #file:../prompts/implement-personal-project-manager-prd.prompt.md
3. Keep changes tracking file as historical record

## Success Criteria

- [ ] Changes tracking file created and maintained
- [ ] Phase 1 complete: package.json updated, TreeDataProvider registered
- [ ] Phase 2 complete: Storage modules functional with atomic writes
- [ ] Phase 3 complete: Tree model merges items with correct sorting
- [ ] Phase 4 complete: All CRUD commands working end-to-end
- [ ] Phase 5 complete: FileSystemWatcher active and debouncing
- [ ] Phase 6 complete: Drag-and-drop operations functional
- [ ] Phase 7 complete: Integration tests passing, UX audit complete
- [ ] Code compiles without errors
- [ ] All ESLint rules satisfied
- [ ] Complete implementation ready for testing
