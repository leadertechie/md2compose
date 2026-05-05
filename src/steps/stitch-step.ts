import type { Loader, MDMetadata, PipelineContext, PipelineStep } from "../types";

/** Minimal parent frontmatter parser (only needs `parent` key) */
function parseRawMD(raw: string): { meta: MDMetadata; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = raw.match(frontmatterRegex);
  if (!match) return { meta: {}, content: raw };

  const yamlBlock = match[1];
  const content = raw.slice(match[0].length);
  const meta: MDMetadata = {};

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    const kvMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      meta[kvMatch[1].trim()] = kvMatch[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return { meta, content };
}

export class StitchStep implements PipelineStep {
  name = "stitch";

  constructor(
    private loader: Loader,
    private defaultParent: string
  ) {}

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    let finalContent = ctx.body;
    let currentParentPath = ctx.meta.parent || this.defaultParent;
    let rootMeta: MDMetadata = {};
    const skipSections = ctx.skipSections;

    while (currentParentPath) {
      const parentRaw = await this.loader(currentParentPath);
      if (!parentRaw) break;

      const { meta: parentMeta, content: parentBody } = parseRawMD(parentRaw);
      rootMeta = parentMeta;

      let stitched = parentBody;

      for (const sectionId of skipSections) {
        const sectionRegex = new RegExp(
          `<section\\s+id=["']${sectionId}["']>[\\s\\S]*?</section>`,
          "g"
        );
        stitched = stitched.replace(
          sectionRegex,
          `<!-- skipped section: ${sectionId} -->`
        );
      }

      if (stitched.includes("<!-- slot:content -->")) {
        finalContent = stitched.replace("<!-- slot:content -->", finalContent);
      } else if (stitched.includes("<!-- slot:body -->")) {
        finalContent = stitched.replace("<!-- slot:body -->", finalContent);
      } else {
        finalContent = stitched + "\n" + finalContent;
      }

      currentParentPath = parentMeta.parent || "";
    }

    return { ...ctx, body: finalContent, rootMeta };
  }
}
