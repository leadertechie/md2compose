import type { MDMetadata, PipelineContext, PipelineStep } from "../types";

/** Single-pass frontmatter parser: key:val, YAML lists, array syntax */
function parseMD(raw: string): { meta: MDMetadata; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = raw.match(frontmatterRegex);
  if (!match) return { meta: {}, content: raw };

  const yamlBlock = match[1];
  const content = raw.slice(match[0].length);
  const meta: MDMetadata = {};

  const lines = yamlBlock.split("\n");
  let currentKey = "";
  let currentList: string[] = [];

  function flushList() {
    if (currentKey && currentList.length > 0) {
      meta[currentKey] = [...currentList];
      currentList = [];
    }
    currentKey = "";
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // YAML list item: "- value"
    const listMatch = trimmed.match(/^-\s+(.+)$/);
    if (listMatch) {
      currentList.push(
        listMatch[1].trim().replace(/^["']|["']$/g, "")
      );
      continue;
    }

    flushList();

    // Key: value line
    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();

      if (value.startsWith("[") && value.endsWith("]")) {
        meta[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else if (value === "") {
        currentKey = key;
      } else {
        meta[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  flushList();
  return { meta, content };
}

export class ParseStep implements PipelineStep {
  name = "parse";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const { meta, content: body } = parseMD(ctx.rawContent);
    return { ...ctx, meta, body, skipSections: meta.skip || [] };
  }
}
