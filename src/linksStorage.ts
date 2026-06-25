import * as fs from 'fs';
import * as path from 'path';

let tempWriteCounter = 0;

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
        data.links.forEach(link => {
          if (!link || typeof link.id !== 'string' || !this.isSafeLinkPath(link.path)) {
            return; // drop malformed or unsafe entries
          }
          link.name = this.sanitizeLinkName(link.name, path.basename(link.path));
          link.isBroken = !fs.existsSync(link.path);
          linksMap[link.id] = link;
        });

        // Detach dangling/cyclic manual-link parent chains. A parentId that starts
        // with "physicalDir:" is a physical parent and is left as-is (kept in sync by
        // reparentLinks); only manual-link parent references are walked here.
        for (const link of Object.values(linksMap)) {
          const seen = new Set<string>([link.id]);
          let current = link.parentId;
          while (current && !current.startsWith('physicalDir:')) {
            if (seen.has(current) || !linksMap[current]) {
              link.parentId = undefined;
              break;
            }
            seen.add(current);
            current = linksMap[current].parentId;
          }
        }
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

  /**
   * A link path is safe only if it is a non-empty, absolute, non-UNC string.
   * UNC paths (\\host\share or //host/share) are rejected because stat-ing one on
   * Windows triggers an outbound SMB auth that can leak the user's NTLM hash.
   */
  private isSafeLinkPath(p: unknown): p is string {
    if (typeof p !== 'string' || p.length === 0) {
      return false;
    }
    if (/^[\\/]{2}/.test(p)) {
      return false;
    }
    return path.isAbsolute(p);
  }

  /**
   * Strip control characters and bidi/RTL override codepoints that could be used
   * to spoof how a tree label reads. Falls back to a safe default if empty.
   */
  private sanitizeLinkName(name: unknown, fallback: string): string {
    if (typeof name !== 'string') {
      return fallback;
    }
    const cleaned = name.replace(/[\x00-\x1F\x7F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
    return cleaned.length > 0 ? cleaned : fallback;
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
   * Re-point every link whose parentId equals oldParentId to newParentId.
   * Called when a physical directory (whose node id encodes its path) is renamed
   * or moved, so nested external links don't become orphaned and vanish from the tree.
   * @returns the number of links updated
   */
  reparentLinks(
    projectRootPath: string,
    oldParentId: string,
    newParentId: string | undefined
  ): number {
    const links = this.getLinks(projectRootPath);
    let updated = 0;
    for (const link of Object.values(links)) {
      if (link.parentId === oldParentId) {
        link.parentId = newParentId;
        updated++;
      }
    }
    if (updated > 0) {
      this.writeLinks(projectRootPath, Object.values(links));
    }
    return updated;
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
    let tempPath: string | undefined;
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
      tempPath = `${configPath}.${process.pid}.${tempWriteCounter++}.tmp`;

      // Write to temporary file first; 'wx' flag ensures exclusive creation so a
      // pre-existing file or symlink at the temp path cannot be silently followed.
      fs.writeFileSync(tempPath, content, { encoding: 'utf-8', flag: 'wx' });

      // Atomic rename
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      fs.renameSync(tempPath, configPath);
    } catch (error) {
      // Clean up the randomized temp file if the write failed partway through
      if (tempPath && fs.existsSync(tempPath)) {
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
