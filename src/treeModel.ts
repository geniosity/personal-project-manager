import * as fs from 'fs';
import * as path from 'path';
import { LinksStorage, ILink } from './linksStorage';

/**
 * Base class for all tree node models.
 */
export abstract class NodeModel {
  /** Unique identifier for this node */
  abstract readonly id: string;
  /** Display label for this node */
  abstract readonly label: string;
  /** Type classification for context menus */
  abstract readonly contextValue: string;
  /** Whether this node can have children */
  abstract readonly collapsible: boolean;
  /** Full path to the item on disk */
  abstract readonly itemPath: string;

  /**
   * Get children of this node.
   * @returns Array of child nodes
   */
  abstract getChildren(): NodeModel[];
}

/**
 * Represents a physical directory in the filesystem.
 */
class PhysicalDirModel extends NodeModel {
  readonly id: string;
  readonly label: string;
  readonly contextValue = 'physicalDir';
  readonly collapsible = true;
  readonly itemPath: string;

  constructor(
    public readonly dirPath: string,
    private projectRootPath?: string,
    private linksStorage?: LinksStorage
  ) {
    super();
    this.itemPath = dirPath;
    this.label = path.basename(dirPath);
    this.id = `physicalDir:${dirPath}`;
  }

  getChildren(): NodeModel[] {
    const children: NodeModel[] = [];
    try {
      const items = fs.readdirSync(this.dirPath);
      items.forEach(item => {
        const fullPath = path.join(this.dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          children.push(new PhysicalDirModel(fullPath, this.projectRootPath, this.linksStorage));
        } else {
          children.push(new PhysicalFileModel(fullPath));
        }
      });
    } catch (error) {
      console.error(`Error reading directory ${this.dirPath}:`, error);
    }
    if (this.projectRootPath && this.linksStorage) {
      try {
        const links = this.linksStorage.getLinks(this.projectRootPath);
        const childLinks = Object.values(links).filter(
          link => link.parentId === this.id
        );
        childLinks.forEach(link => {
          children.push(createLinkNode(link, this.projectRootPath!, this.linksStorage!));
        });
      } catch (error) {
        console.error(`Error reading child links for ${this.id}:`, error);
      }
    }
    return sortNodes(children);
  }
}

/**
 * Represents a physical file in the filesystem.
 */
class PhysicalFileModel extends NodeModel {
  readonly id: string;
  readonly label: string;
  readonly contextValue = 'physicalFile';
  readonly collapsible = false;
  readonly itemPath: string;

  constructor(public readonly filePath: string) {
    super();
    this.itemPath = filePath;
    this.label = path.basename(filePath);
    this.id = `physicalFile:${filePath}`;
  }

  getChildren(): NodeModel[] {
    return [];
  }
}

/**
 * Represents a manually-linked external directory.
 */
class ManualDirModel extends NodeModel {
  readonly id: string;
  readonly label: string;
  readonly contextValue = 'manualDir';
  readonly collapsible = true;
  readonly itemPath: string;

  constructor(
    public readonly link: ILink,
    private projectRootPath: string,
    private linksStorage: LinksStorage
  ) {
    super();
    this.itemPath = link.path;
    this.label = link.name;
    this.id = `manualDir:${link.id}`;
  }

  getChildren(): NodeModel[] {
    const children: NodeModel[] = [];
    if (!fs.existsSync(this.link.path)) {
      return children;
    }
    try {
      const items = fs.readdirSync(this.link.path);
      items.forEach(item => {
        const fullPath = path.join(this.link.path, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          children.push(new PhysicalDirModel(fullPath, this.projectRootPath, this.linksStorage));
        } else {
          children.push(new PhysicalFileModel(fullPath));
        }
      });
    } catch (error) {
      console.error(`Error reading link directory ${this.link.path}:`, error);
    }

    try {
      const links = this.linksStorage.getLinks(this.projectRootPath);
      const childLinks = Object.values(links).filter(
        link => link.parentId === this.link.id
      );
      childLinks.forEach(link => {
        children.push(createLinkNode(link, this.projectRootPath, this.linksStorage));
      });
    } catch (error) {
      console.error(`Error reading child links for ${this.link.id}:`, error);
    }
    return sortNodes(children);
  }
}

/**
 * Represents a manually-linked external file.
 */
class ManualFileModel extends NodeModel {
  readonly id: string;
  readonly label: string;
  readonly contextValue = 'manualFile';
  readonly collapsible = false;
  readonly itemPath: string;

  constructor(public readonly link: ILink) {
    super();
    this.itemPath = link.path;
    this.label = link.name;
    this.id = `manualFile:${link.id}`;
  }

  getChildren(): NodeModel[] {
    return [];
  }
}

/**
 * Represents a broken/missing link.
 */
class BrokenLinkModel extends NodeModel {
  readonly id: string;
  readonly label: string;
  readonly contextValue = 'brokenLink';
  readonly collapsible = false;
  readonly itemPath: string;

  constructor(public readonly link: ILink) {
    super();
    this.itemPath = link.path;
    this.label = `${link.name} (missing)`;
    this.id = `brokenLink:${link.id}`;
  }

  getChildren(): NodeModel[] {
    return [];
  }
}

/**
 * Represents the root of a project.
 */
class ProjectModel extends NodeModel {
  readonly id: string;
  readonly label: string;
  readonly contextValue = 'project';
  readonly collapsible = true;
  readonly itemPath: string;

  constructor(
    public readonly projectName: string,
    public readonly projectPath: string,
    private linksStorage: LinksStorage
  ) {
    super();
    this.itemPath = projectPath;
    this.label = projectName;
    this.id = `project:${projectName}`;
  }

  getChildren(): NodeModel[] {
    const children: NodeModel[] = [];

    // Add physical directories
    try {
      if (fs.existsSync(this.projectPath)) {
        const items = fs.readdirSync(this.projectPath);
        items.forEach(item => {
          // Skip config file
          if (item === '.project-explorer-links.json') {
            return;
          }
          const fullPath = path.join(this.projectPath, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            children.push(new PhysicalDirModel(fullPath, this.projectPath, this.linksStorage));
          } else {
            children.push(new PhysicalFileModel(fullPath));
          }
        });
      }
    } catch (error) {
      console.error(`Error reading project directory ${this.projectPath}:`, error);
    }

    // Add manual links
    try {
      const links = this.linksStorage.getLinks(this.projectPath);
      const linkArray = Object.values(links).filter(l => !l.parentId);

      linkArray.forEach(link => {
        children.push(createLinkNode(link, this.projectPath, this.linksStorage));
      });
    } catch (error) {
      console.error(`Error reading links for project ${this.projectName}:`, error);
    }

    return sortNodes(children);
  }

  /**
   * Get count of broken links.
   */
  getBrokenLinkCount(): number {
    try {
      const links = this.linksStorage.getLinks(this.projectPath);
      return Object.values(links).filter(l => l.isBroken).length;
    } catch {
      return 0;
    }
  }
}

/**
 * Sort nodes according to the required hierarchy.
 * Order: physical dirs, manual dirs, physical files, manual files, broken items
 * @param nodes Nodes to sort
 * @returns Sorted nodes
 */
function sortNodes(nodes: NodeModel[]): NodeModel[] {
  const sortOrder: Record<string, number> = {
    'physicalDir': 0,
    'manualDir': 1,
    'physicalFile': 2,
    'manualFile': 3,
    'brokenLink': 4
  };

  return nodes.sort((a, b) => {
    const orderA = sortOrder[a.contextValue] ?? 5;
    const orderB = sortOrder[b.contextValue] ?? 5;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Within same category, sort alphabetically by label
    return a.label.localeCompare(b.label);
  });
}

function createLinkNode(
  link: ILink,
  projectRootPath: string,
  linksStorage: LinksStorage
): NodeModel {
  if (link.isBroken) {
    return new BrokenLinkModel(link);
  }

  // The path existed when getLinks() ran, but it may have been deleted since.
  // Degrade to a broken node instead of throwing, which would abort the parent's
  // getChildren() loop and silently drop sibling links iterated after this one.
  let isDirectory = false;
  try {
    isDirectory = fs.statSync(link.path).isDirectory();
  } catch {
    return new BrokenLinkModel(link);
  }

  return isDirectory
    ? new ManualDirModel(link, projectRootPath, linksStorage)
    : new ManualFileModel(link);
}

/**
 * Manages the tree model for a project, merging physical filesystem items
 * with manually-linked external items.
 */
export class TreeModel {
  /**
   * Creates a new TreeModel instance.
   * @param linksStorage The links storage service
   */
  constructor(private linksStorage: LinksStorage) {}

  /**
   * Create a project model for the given project.
   * @param projectName Project name
   * @param projectPath Project root directory path
   * @returns ProjectModel instance
   */
  createProjectModel(projectName: string, projectPath: string): ProjectModel {
    return new ProjectModel(projectName, projectPath, this.linksStorage);
  }

  /**
   * Get all nodes in sorted order.
   * @param node Parent node to get children for
   * @returns Sorted child nodes
   */
  getChildren(node: ProjectModel): NodeModel[] {
    return node.getChildren();
  }

  /**
   * Get broken link count for a project.
   * @param projectModel The project model
   * @returns Count of broken links
   */
  getBrokenLinkCount(projectModel: ProjectModel): number {
    return projectModel.getBrokenLinkCount();
  }
}
