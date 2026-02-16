import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TreeModel } from '../treeModel';
import { LinksStorage } from '../linksStorage';

suite('TreeModel Tests', () => {
  let tempDir: string;
  let projectDir: string;
  let treeModel: TreeModel;
  let linksStorage: LinksStorage;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectviewer-tree-test-'));
    projectDir = fs.mkdtempSync(path.join(tempDir, 'project-'));
    treeModel = new TreeModel(new LinksStorage());
    linksStorage = new LinksStorage();

    // Create test structure
    fs.mkdirSync(path.join(projectDir, 'physicalDir1'));
    fs.mkdirSync(path.join(projectDir, 'physicalDir2'));
    fs.writeFileSync(path.join(projectDir, 'file1.txt'), 'content');
    fs.writeFileSync(path.join(projectDir, 'file2.txt'), 'content');
  });

  teardown(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should create project model', () => {
    const model = treeModel.createProjectModel('TestProject', projectDir);
    assert.strictEqual(model.label, 'TestProject');
    assert.strictEqual(model.itemPath, projectDir);
  });

  test('should get children in correct sort order', () => {
    // Add a manual link (directory)
    const externalDir = fs.mkdtempSync(path.join(tempDir, 'external-'));
    linksStorage.addLink(projectDir, 'manualDir', externalDir);

    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();

    // Sort order should be: physical dirs, manual dirs, physical files, manual files
    const contextValues = children.map(c => c.contextValue);
    assert.notStrictEqual(contextValues.indexOf('physicalDir'), -1);
    assert.notStrictEqual(contextValues.indexOf('physicalFile'), -1);
  });

  test('should identify physical directories', () => {
    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();
    const physicalDirs = children.filter(c => c.contextValue === 'physicalDir');
    assert.ok(physicalDirs.length >= 2);
  });

  test('should identify physical files', () => {
    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();
    const physicalFiles = children.filter(c => c.contextValue === 'physicalFile');
    assert.ok(physicalFiles.length >= 2);
  });

  test('should identify manual links', () => {
    const externalDir = fs.mkdtempSync(path.join(tempDir, 'external-'));
    linksStorage.addLink(projectDir, 'manualDir', externalDir);

    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();
    const manualDirs = children.filter(c => c.contextValue === 'manualDir');
    assert.strictEqual(manualDirs.length, 1);
  });

  test('should place manual links under physical directories when parentId matches', () => {
    const externalDir = fs.mkdtempSync(path.join(tempDir, 'external-'));
    const physicalDirPath = path.join(projectDir, 'physicalDir1');
    const parentId = `physicalDir:${physicalDirPath}`;

    linksStorage.addLink(projectDir, 'externalChild', externalDir, undefined, parentId);

    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();
    const physicalDir = children.find(
      c => c.contextValue === 'physicalDir' && c.itemPath === physicalDirPath
    );

    assert.ok(physicalDir, 'Expected physicalDir1 to exist');

    const physicalChildren = physicalDir!.getChildren();
    const manualDirs = physicalChildren.filter(c => c.contextValue === 'manualDir');
    assert.strictEqual(manualDirs.length, 1);
    assert.strictEqual(manualDirs[0].label, 'externalChild');
  });

  test('should identify broken links', () => {
    const externalDir = fs.mkdtempSync(path.join(tempDir, 'external-'));
    const linkId = linksStorage.addLink(projectDir, 'brokenLink', externalDir);

    // Delete the linked path
    fs.rmSync(externalDir, { recursive: true, force: true });

    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();
    const brokenLinks = children.filter(c => c.contextValue === 'brokenLink');
    assert.strictEqual(brokenLinks.length, 1);
  });

  test('should get broken link count', () => {
    const externalDir1 = fs.mkdtempSync(path.join(tempDir, 'external1-'));
    const externalDir2 = fs.mkdtempSync(path.join(tempDir, 'external2-'));

    linksStorage.addLink(projectDir, 'link1', externalDir1);
    linksStorage.addLink(projectDir, 'link2', externalDir2);

    // Break one link
    fs.rmSync(externalDir1, { recursive: true, force: true });

    const model = treeModel.createProjectModel('TestProject', projectDir);
    const brokenCount = treeModel.getBrokenLinkCount(model);
    assert.strictEqual(brokenCount, 1);
  });

  test('should exclude config file from tree', () => {
    // The .project-explorer-links.json should not appear in tree
    const model = treeModel.createProjectModel('TestProject', projectDir);
    const children = model.getChildren();
    assert.ok(!children.some(c => c.label === '.project-explorer-links.json'));
  });
});
