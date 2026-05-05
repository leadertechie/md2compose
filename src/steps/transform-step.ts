import type { PipelineContext, PipelineStep, Transformer } from "../types";

export class TransformStep implements PipelineStep {
  name = "transform";

  constructor(private transformers: Transformer[]) {}

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    let body = ctx.body;
    for (const t of this.transformers) {
      body = t.transform(body);
    }
    return { ...ctx, body };
  }
}
