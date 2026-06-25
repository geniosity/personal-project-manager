import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { ProjectTreeProvider, addExternalLinks } from '../extension';
import { ProjectsStorage } from '../storage';
import { LinksStorage } from '../linksStorage';
import { StateManager } from '../stateManager';
import { TreeModel } from '../treeModel';

suite('ProjectTreeProvider root layout', () => {
  let tempDir: string;
  let provider: ProjectTreeProvider;
  let stateManager: StateManager;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-provider-'));
    const projA = fs.mkdtempSync(path.join(tempDir, 'A-'));
    const projB = fs.mkdtempSync(path.join(tempDir, 'B-'));

    const projectsStorage = new ProjectsStorage(tempDir);
    const linksStorage = new LinksStorage();
    const state = new Map<string, unknown>();
    const fakeContext = {
      workspaceState: {
        get: (k: string) => state.get(k),
        update: (k: string, v: unknown) => { state.set(k, v); return Promise.resolve(); }
      }
    } as unknown as vscode.ExtensionContext;
    stateManager = new StateManager(fakeContext);

    projectsStorage.addProject('Alpha', projA);
    projectsStorage.addProject('Beta', projB);
    stateManager.setActiveProjectName('Alpha');

    provider = new ProjectTreeProvider(projectsStorage, linksStorage, stateManager, new TreeModel(linksStorage));
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('root shows an All Projects container plus the active project, and no separator', async () => {
    const roots = await provider.getChildren();
    const contextValues = roots.map(r => r.contextValue);
    assert.ok(contextValues.includes('projectsContainer'), 'container present');
    assert.ok(contextValues.includes('project'), 'active project present');
    assert.ok(!contextValues.includes('separator'), 'no fake separator node');

    const active = roots.find(r => r.contextValue === 'project');
    assert.strictEqual(active!.label, 'Alpha');
    assert.strictEqual(active!.command?.command, 'projectviewer.activateProject');
  });
});

suite('addExternalLinks', () => {
  let tempDir: string;
  let projectDir: string;
  let linksStorage: LinksStorage;
  let externalA: string;
  let externalB: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-addexternal-'));
    projectDir = fs.mkdtempSync(path.join(tempDir, 'project-'));
    externalA = path.join(tempDir, 'externalA.txt');
    externalB = path.join(tempDir, 'externalB.txt');
    fs.writeFileSync(externalA, 'a');
    fs.writeFileSync(externalB, 'b');
    linksStorage = new LinksStorage();
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('adds two valid new paths', () => {
    const summary = addExternalLinks(linksStorage, projectDir, undefined, [externalA, externalB]);
    assert.strictEqual(summary.addedCount, 2);
    assert.strictEqual(summary.skippedCount, 0);
    assert.strictEqual(summary.errors.length, 0);
  });

  test('skips duplicates on re-add', () => {
    addExternalLinks(linksStorage, projectDir, undefined, [externalA, externalB]);
    const summary = addExternalLinks(linksStorage, projectDir, undefined, [externalA, externalB]);
    assert.strictEqual(summary.addedCount, 0);
    assert.strictEqual(summary.skippedCount, 2);
    assert.strictEqual(summary.errors.length, 0);
  });

  test('records an error for a non-existent path', () => {
    const missing = path.join(tempDir, 'does-not-exist.txt');
    const summary = addExternalLinks(linksStorage, projectDir, undefined, [missing]);
    assert.strictEqual(summary.addedCount, 0);
    assert.strictEqual(summary.skippedCount, 0);
    assert.strictEqual(summary.errors.length, 1);
  });
});
