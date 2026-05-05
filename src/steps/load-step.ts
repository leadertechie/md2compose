import type { Loader, PipelineContext, PipelineStep } from "../types";

export class LoadStep implements PipelineStep {
  name = "load";

  constructor(private loader: Loader) {}

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const raw = await this.loader(ctx.contentPath);
    if (!raw) {
      throw new Error(`Source content missing: ${ctx.contentPath}`);
    }
    return { ...ctx, rawContent: raw };
  }
}
