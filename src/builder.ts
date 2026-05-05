import type { Loader, Transformer, ComposerOptions } from "./types";
import { Composer } from "./composer";
import { defaultTransformers } from "./transformers";
import { LoadStep } from "./steps/load-step";
import { ParseStep } from "./steps/parse-step";
import { TransformStep } from "./steps/transform-step";
import { StitchStep } from "./steps/stitch-step";
import { RootMetaStep } from "./steps/root-meta-step";

export class ComposerBuilder {
  private loader?: Loader;
  private transformers: Transformer[] = [];
  private uiBaseUrl?: string;
  private defaultParent: string = "__sys_/base.md";

  withLoader(loader: Loader): this {
    this.loader = loader;
    return this;
  }

  addTransformer(t: Transformer): this {
    this.transformers.push(t);
    return this;
  }

  withTransformers(ts?: Transformer[]): this {
    if (ts) this.transformers = [...ts];
    return this;
  }

  withUiBase(url?: string): this {
    this.uiBaseUrl = url;
    return this;
  }

  withDefaultParent(parent?: string): this {
    if (parent !== undefined) this.defaultParent = parent;
    return this;
  }

  build(): Composer {
    if (!this.loader) {
      throw new Error("Loader is required to build Composer");
    }

    const baseUrl = this.uiBaseUrl || "http://localhost:8788";
    const steps = [
      new LoadStep(this.loader),
      new ParseStep(),
      new TransformStep([...defaultTransformers(baseUrl), ...this.transformers]),
      new StitchStep(this.loader, this.defaultParent),
      new RootMetaStep(),
    ];

    return new Composer(steps);
  }
}

/** Convenience: build a Composer from options object */
export function buildComposer(options: ComposerOptions): Composer {
  return new ComposerBuilder()
    .withLoader(options.loader)
    .withUiBase(options.uiBaseUrl)
    .withDefaultParent(options.defaultParent)
    .withTransformers(options.transformers)
    .build();
}
