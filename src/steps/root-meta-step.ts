import type { MDMetadata, PipelineContext, PipelineStep } from "../types";

function stringifyFrontmatter(meta: MDMetadata): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (value !== undefined && value !== null && value !== "") {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export class RootMetaStep implements PipelineStep {
  name = "root-meta";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (Object.keys(ctx.rootMeta).length === 0) return ctx;

    const fm = stringifyFrontmatter(ctx.rootMeta);
    return { ...ctx, body: fm + "\n" + ctx.body };
  }
}
