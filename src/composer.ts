import type { PipelineContext, PipelineStep, ComposerConfig } from "./types";
import { getDefaultLogger } from "./telemetry-init.js";
import type { LoggerInterface } from "@leadertechie/telemetry";
import { ComposerBuilder } from "./builder";
import { StitchStep } from "./steps/stitch-step";

export class Composer {
  private log: LoggerInterface;
  private steps: PipelineStep[];

  /** Backward-compat: accepts old ComposerConfig */
  constructor(config: ComposerConfig);
  /** Internal: built by ComposerBuilder */
  constructor(steps: PipelineStep[], _internal?: any);
  constructor(configOrSteps: any, _internal?: any) {
    if (Array.isArray(configOrSteps)) {
    this.log = (configOrSteps as any).logger ?? getDefaultLogger("md2compose");
      this.steps = configOrSteps as PipelineStep[];
    } else {
      const c = new ComposerBuilder()
        .withLoader(configOrSteps.loader)
        .withUiBase(configOrSteps.uiBaseUrl)
        .build();
      this.log = getDefaultLogger("md2compose");
      this.steps = c.steps;
    }
  }

  async compose(
    contentPath: string,
    defaultParent?: string
  ): Promise<string> {
    let ctx: PipelineContext = {
      contentPath,
      rawContent: "",
      meta: {},
      body: "",
      rootMeta: {},
      skipSections: [],
    };

    // Override default parent in StitchStep if caller provided one
    const steps =
      defaultParent !== undefined
        ? this.steps.map((s) => {
            if (s.constructor.name === "StitchStep") {
              const loader = (s as any).loader;
              return new StitchStep(loader, defaultParent);
            }
            return s;
          })
        : this.steps;

    for (const step of steps) {
      ctx = await step.execute(ctx);
    }

    return ctx.body;
  }

  /** Build a Composer from legacy ComposerConfig */
  static fromConfig(config: ComposerConfig): Composer {
    return new ComposerBuilder()
      .withLoader(config.loader)
      .withUiBase(config.uiBaseUrl)
      .build();
  }
}

