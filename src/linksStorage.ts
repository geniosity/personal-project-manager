import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface representing a single external link.
 */
export interface ILink {
  /** Unique identifier for the link */
  id: string;
  /** Display name for the link */
  name: string;
  /** Full path to the external item */
  path: string;
  /** Whether the linked path exists */
  isBroken: boolean;
  /** Optional description */
  description?: string;
  /** Parent link ID, or undefined if at root */
  parentId?: string;
}

/**
 * Interface for links storage data structure.
 */
interface ILinksData {
  version: number;
  links: ILink[];
}

/**
 * Manages per-project external links storage with atomic write operations.
 */
export class LinksStorage {
  private readonly configFileName = '.project-explorer-links.json';

  /**
   * Get all links for a project.
   * @param projectRootPath Path to the project root directory
   * @returns Object mapping link IDs to link data, or empty object if no links
   */
  getLinks(projectRootPath: string): Record<string, ILink> {
    // console.log(`PPM: getLinks called for project path: ${projectRootPath}`);
    try {
      const configPath = path.join(projectRootPath, this.configFileName);
      if (!fs.existsSync(configPath)) {
        return {};
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      const data: ILinksData = JSON.parse(content);
      const linksMap: Record<string, ILink> = {};

      if (data.links && Array.isArray(data.links)) {
        // Update isBroken status based on current filesystem state
        data.links.forEach(link => {
          // console.log(`PPM: Checking link path: ${link.path}`);
          link.isBroken = !fs.existsSync(link.path);
          linksMap[link.id] = link;
        });
      }

      return linksMap;
    } catch (error) {
      console.error('Error reading links storage:', error);
      return {};
    }
  }

  /**
   * Add a new external link.
   * @param projectRootPath Path to the project root directory
   * @param name Display name for the link
   * @param linkPath Full path to the external item
   * @param description Optional description
   * @param parentId Optional parent link ID
   * @throws Error if path doesn't exist or other validation fails
   */
  addLink(
    projectRootPath: string,
    name: string,
    linkPath: string,
    description?: string,
    parentId?: string
  ): string {
    // Validate inputs
    if (!name || name.trim() === '') {
      throw new Error('Link name cannot be empty');
    }
    if (!linkPath || !fs.existsSync(linkPath)) {
      throw new Error(`Link path does not exist: ${linkPath}`);
    }

    const links = this.getLinks(projectRootPath);
    const normalizedLinkPath = this.normalizePathForCompare(linkPath);
    const existing = Object.values(links).find(link =>
      this.normalizePathForCompare(link.path) === normalizedLinkPath &&
      link.parentId === parentId
    );
    if (existing) {
      throw new Error('Link already exists for this parent');
    }
    const linkId = `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newLink: ILink = {
      id: linkId,
      name,
      path: linkPath,
      isBroken: false,
      description,
      parentId
    };

    links[linkId] = newLink;
    this.writeLinks(projectRootPath, Object.values(links));

    return linkId;
  }

  private normalizePathForCompare(targetPath: string): string {
    const resolved = path.resolve(targetPath);
    if (process.platform === 'win32') {
      return resolved.toLowerCase();
    }
    return resolved;
  }

  /**
   * Remove a link by ID.
   * @param projectRootPath Path to the project root directory
   * @param linkId ID of the link to remove
   * @throws Error if link not found
   */
  removeLink(projectRootPath: string, linkId: string): void {
    const links = this.getLinks(projectRootPath);

    if (!links[linkId]) {
      throw new Error(`Link with ID "${linkId}" not found`);
    }

    delete links[linkId];
    this.writeLinks(projectRootPath, Object.values(links));
  }

  /**
   * Update link metadata.
   * @param projectRootPath Path to the project root directory
   * @param linkId ID of the link to update
   * @param updates Fields to update (name, description, parentId)
   * @throws Error if link not found
   */
  updateLinkMetadata(
    projectRootPath: string,
    linkId: string,
    updates: Partial<Pick<ILink, 'name' | 'description' | 'parentId'>>
  ): void {
    const links = this.getLinks(projectRootPath);

    if (!links[linkId]) {
      throw new Error(`Link with ID "${linkId}" not found`);
    }

    const link = links[linkId];
    if (updates.name !== undefined) {
      link.name = updates.name;
    }
    if (updates.description !== undefined) {
      link.description = updates.description;
    }
    if (updates.parentId !== undefined) {
      link.parentId = updates.parentId;
    }

    this.writeLinks(projectRootPath, Object.values(links));
  }

  /**
   * Get all broken/missing links.
   * @param projectRootPath Path to the project root directory
   * @returns Array of broken links
   */
  getBrokenLinks(projectRootPath: string): ILink[] {
    const links = this.getLinks(projectRootPath);
    return Object.values(links).filter(link => link.isBroken);
  }

  /**
   * Write links to storage using atomic write pattern.
   * @param projectRootPath Path to the project root directory
   * @param links Links to write
   * @throws Error if write fails
   */
  private writeLinks(projectRootPath: string, links: ILink[]): void {
    try {
      // Validate project path exists
      if (!fs.existsSync(projectRootPath)) {
        throw new Error(`Project path does not exist: ${projectRootPath}`);
      }

      const configPath = path.join(projectRootPath, this.configFileName);
      const data: ILinksData = {
        version: 1,
        links: links.sort((a, b) => a.name.localeCompare(b.name))
      };

      const content = JSON.stringify(data, null, 2);
      const tempPath = `${configPath}.tmp`;

      // Write to temporary file first
      fs.writeFileSync(tempPath, content, 'utf-8');

      // Atomic rename
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      fs.renameSync(tempPath, configPath);
    } catch (error) {
      // Clean up temp file if it exists
      const tempPath = path.join(projectRootPath, `${this.configFileName}.tmp`);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw new Error(`Failed to write links storage: ${error}`);
    }
  }
}
