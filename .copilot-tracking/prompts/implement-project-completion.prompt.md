---
mode: agent
model: Claude Sonnet 4
---

<!-- markdownlint-disable-file -->

# Implementation Prompt: Complete Personal Project Manager Extension

## Implementation Instructions

### Step 1: Create Changes Tracking File

You WILL create `20260213-project-completion-changes.md` in #file:../changes/ if it does not exist.

### Step 2: Execute Implementation

You WILL follow #file:../../.github/instructions/task-implementation.instructions.md
You WILL systematically implement #file:../plans/20260213-project-completion-plan.instructions.md task-by-task
You WILL follow ALL project standards and conventions

**CRITICAL**: Phase 1 is BLOCKING - you MUST complete it first to enable tree display and manual testing.
**CRITICAL**: If ${input:phaseStop:true} is true, you WILL stop after each Phase for user review.
**CRITICAL**: If ${input:taskStop:false} is true, you WILL stop after each Task for user review.

### Step 3: Verification

After each phase:
- You WILL compile TypeScript and verify no errors
- You WILL run ESLint and verify no warnings  
- You WILL manually test implemented features if Phase 1+ complete

### Step 4: Cleanup

When ALL Phases are checked off (`[x]`) and completed you WILL do the following:

1. You WILL provide a markdown style link and a summary of all changes from #file:../changes/20260213-project-completion-changes.md to the user:

   - You WILL keep the overall summary brief
   - You WILL add spacing around any lists
   - You MUST wrap any reference to a file in a markdown style link

2. You WILL provide markdown style links to [.copilot-tracking/plans/20260213-project-completion-plan.instructions.md](.copilot-tracking/plans/20260213-project-completion-plan.instructions.md), [.copilot-tracking/details/20260213-project-completion-details.md](.copilot-tracking/details/20260213-project-completion-details.md), and [.copilot-tracking/research/20260213-project-completion-research.md](.copilot-tracking/research/20260213-project-completion-research.md) documents. You WILL recommend cleaning these files up as well.

3. **MANDATORY**: You WILL attempt to delete .copilot-tracking/prompts/implement-project-completion.prompt.md

## Success Criteria

- [ ] Changes tracking file created and updated continuously
- [ ] All 8 phases completed with all tasks checked off
- [ ] Tree view displays all item types correctly
- [ ] All 23 commands execute successfully
- [ ] Context menus show appropriate options for each item type
- [ ] File operations persist correctly
- [ ] Manual links persist in project root
- [ ] Broken links detected and removable
- [ ] File watcher updates tree on changes
- [ ] Drag-drop works for physical and manual items
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings
- [ ] Extension runs without errors in Extension Development Host
- [ ] All PRD requirements satisfied
- [ ] Project conventions followed
- [ ] Changes file updated with all modifications

