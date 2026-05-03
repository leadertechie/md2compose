import { ComposerConfig, MDMetadata } from "./types";

export class Composer {
  private config: ComposerConfig;

  constructor(config: ComposerConfig) {
    this.config = config;
  }

  /**
   * Main entry point to compose a view.
   * Returns the final stitched and hydrated MD.
   */
  async compose(contentPath: string, defaultParent: string = "__sys_/base.md"): Promise<string> {
    const rawContent = await this.config.loader(contentPath);
    if (!rawContent) throw new Error(`Source content missing: ${contentPath}`);

    let { meta: childMeta, content: childBody } = this.parseMD(rawContent);
    childBody = this.preProcess(childBody);
    
    let finalContent = childBody;
    let currentParentPath = childMeta.parent || defaultParent;
    const skipSections = childMeta.skip || [];

    // Recursive Stitching
    while (currentParentPath) {
      const parentRaw = await this.config.loader(currentParentPath);
      if (!parentRaw) break;

      let { meta: parentMeta, content: parentBody } = this.parseMD(parentRaw);
      
      // Skip logic: remove <section id="..."> blocks
      for (const sectionId of skipSections) {
        const sectionRegex = new RegExp(`<section\\s+id=["']${sectionId}["']>[\\s\\S]*?</section>`, "g");
        parentBody = parentBody.replace(sectionRegex, `<!-- skipped section: ${sectionId} -->`);
      }

      // Stitch logic: inject into slots
      if (parentBody.includes("<!-- slot:content -->")) {
        finalContent = parentBody.replace("<!-- slot:content -->", finalContent);
      } else if (parentBody.includes("<!-- slot:body -->")) {
        finalContent = parentBody.replace("<!-- slot:body -->", finalContent);
      } else {
        finalContent = parentBody + "\n" + finalContent;
      }

      currentParentPath = parentMeta.parent || "";
    }

    // Interceptor: Hydrate Asset Placeholders
    return this.hydrate(finalContent);
  }

  private parseMD(raw: string): { meta: MDMetadata; content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = raw.match(frontmatterRegex);
    if (!match) return { meta: {}, content: raw };

    const yaml = match[1];
    const content = raw.replace(match[0], "");
    const meta: MDMetadata = {};
    
    // Parse key: value pairs
    yaml.split("\n").forEach(line => {
      const [key, ...val] = line.split(":");
      if (key && val.length > 0) {
        const value = val.join(":").trim();
        if (value.startsWith("[") && value.endsWith("]")) {
          meta[key.trim()] = value.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
        } else {
          meta[key.trim()] = value.replace(/^["']|["']$/g, "");
        }
      }
    });

    // Parse YAML list format (dash items like "- sidebar")
    const listPattern = /^\s*-\s+(.+)$/;
    const listItems: string[] = [];
    const lines = yaml.split("\n");
    let listKey = "";
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const listMatch = lines[i].match(listPattern);
      if (listMatch) {
        listItems.push(listMatch[1].trim().replace(/^["']|["']$/g, ""));
        if (!inList) {
          // Find the key from previous non-list line
          for (let j = i - 1; j >= 0; j--) {
            const prevMatch = lines[j].match(/^(\w+):/);
            if (prevMatch) {
              listKey = prevMatch[1].trim();
              break;
            }
          }
          inList = true;
        }
      }
    }

    if (listKey && listItems.length > 0) {
      meta[listKey] = listItems;
    }

    return { meta, content };
  }

  private preProcess(md: string): string {
    // Convert <link mfe?> or &lt;link mfe?&gt; to data-interaction slot
    return md.replace(/(?:<|&lt;)link mfe\?(?:>|&gt;)/g, '<div data-interaction="mfe:default" class="mfe-slot"></div>');
  }

  private hydrate(content: string): string {
    const uiBase = this.config.uiBaseUrl || "http://localhost:8788";
    return content.replace(/\{\{UI_BASE\}\}/g, uiBase);
  }
}
