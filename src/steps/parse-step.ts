import type { MDMetadata, PipelineContext, PipelineStep } from "../types";

type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue };

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseScalar(raw: string): YamlValue {
  const t = raw.trim();
  if (t === "" || t === "null" || t === "~") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (inner === "") return [];
    return inner
      .split(",")
      .map((s) => unquote(s.trim()))
      .filter((s) => s !== "");
  }
  return unquote(t);
}

/**
 * Minimal frontmatter parser for the subset of YAML we use:
 * flat key/value, inline arrays, nested maps (e.g. `content:`), and lists.
 * It preserves nesting so structured content (content.*) survives for the
 * layout step to project.
 */
function parseFrontmatter(yaml: string): MDMetadata {
  const lines = yaml.split("\n");
  const meta: MDMetadata = {};

  let i = 0;

  function parseBlock(minIndent: number): Record<string, YamlValue> {
    const obj: Record<string, YamlValue> = {};

    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "" || line.trim().startsWith("#")) {
        i++;
        continue;
      }

      const indent = (line.match(/^(\s*)/)?.[1] ?? "").length;
      if (indent < minIndent) break;
      if (indent > minIndent) {
        i++;
        continue;
      }

      const text = line.trim();
      i++;

      // A bare list item only has meaning under a parent key; the parent
      // branch below consumes list items, so reaching one here is malformed.
      if (text.startsWith("-")) continue;

      const kv = text.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
      if (!kv) continue;

      const key = kv[1];
      const rest = kv[2].trim();

      if (rest !== "") {
        obj[key] = parseScalar(rest);
        continue;
      }

      // `key:` with nothing after it: nested map or list follows.
      const next = lines[i];
      const nextIndent = next ? (next.match(/^(\s*)/)?.[1] ?? "").length : 0;

      if (next && nextIndent > indent) {
        if (next.trim().startsWith("-")) {
          const list: YamlValue[] = [];
          while (i < lines.length) {
            const li = lines[i].match(/^(\s*)-\s+(.*)$/);
            if (!li) break;
            if ((li[1] ?? "").length <= indent) break;
            list.push(parseScalar(li[2]));
            i++;
          }
          obj[key] = list;
        } else {
          obj[key] = parseBlock(nextIndent);
        }
      } else {
        obj[key] = null;
      }
    }

    return obj;
  }

  return parseBlock(0) as MDMetadata;
}

function parseMD(raw: string): { meta: MDMetadata; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = raw.match(frontmatterRegex);
  if (!match) return { meta: {}, content: raw };

  const yamlBlock = match[1];
  const content = raw.slice(match[0].length);
  const meta = parseFrontmatter(yamlBlock);
  return { meta, content };
}

export class ParseStep implements PipelineStep {
  name = "parse";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const { meta, content: body } = parseMD(ctx.rawContent);
    return {
      ...ctx,
      meta,
      body,
      skipSections: Array.isArray(meta.skip) ? (meta.skip as string[]) : [],
    };
  }
}
