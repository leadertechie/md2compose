import type { Loader, MDMetadata, PipelineContext, PipelineStep } from "../types";

/** Minimal flat frontmatter parse — the layout template only needs `parent`. */
function parseLayoutMeta(raw: string): { meta: MDMetadata; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!m) return { meta: {}, body: raw };

  const meta: MDMetadata = {};
  for (const line of m[1].split("\n")) {
    const kv = line.trim().match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(m[0].length) };
}

/**
 * Projects a content document through its view layout.
 *
 * The content document's frontmatter carries a `layout` path and a `content`
 * map. The layout template is code-owned: it holds the MFE mount structure
 * and references the content with `{{content.field}}` placeholders. This step
 * loads that template, resolves the placeholders, and makes its `parent`
 * (page shell) the next stitch target.
 */
export class LayoutStep implements PipelineStep {
  name = "layout";

  constructor(private loader: Loader) {}

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const layoutPath = ctx.meta.layout;
    if (!layoutPath) return ctx;

    const layoutRaw = await this.loader(layoutPath);
    if (!layoutRaw) return ctx;

    const { meta: layoutMeta, body: layoutBody } = parseLayoutMeta(layoutRaw);

    // Project the content map into the layout body.
    let resolved = layoutBody;
    const content = (ctx.meta.content ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(content)) {
      if (value != null && typeof value !== "object") {
        resolved = resolved.split(`{{content.${key}}}`).join(String(value));
      }
    }

    // The content document may also carry a markdown body; inject it into an
    // explicit content slot if the layout declares one.
    if (ctx.body.trim()) {
      if (resolved.includes("<!-- slot:content -->")) {
        resolved = resolved.replace("<!-- slot:content -->", ctx.body);
      } else if (resolved.includes("<!-- slot:body -->")) {
        resolved = resolved.replace("<!-- slot:body -->", ctx.body);
      }
    }

    return {
      ...ctx,
      body: resolved,
      meta: { ...ctx.meta, parent: layoutMeta.parent || ctx.meta.parent },
    };
  }
}
