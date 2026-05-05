/** Content loader function */
export type Loader = (path: string) => Promise<string | null>;

/** Parsed frontmatter metadata */
export interface MDMetadata {
  parent?: string;
  skip?: string[];
  [key: string]: any;
}

/** Pipeline context passed between steps */
export interface PipelineContext {
  contentPath: string;
  rawContent: string;
  meta: MDMetadata;
  body: string;
  rootMeta: MDMetadata;
  skipSections: string[];
}

/** Pipeline step interface */
export interface PipelineStep {
  name: string;
  execute(ctx: PipelineContext): Promise<PipelineContext>;
}

/** Pluggable content transformer */
export interface Transformer {
  name: string;
  transform(content: string): string;
}

/** Builder options */
export interface ComposerOptions {
  loader: Loader;
  transformers?: Transformer[];
  uiBaseUrl?: string;
  defaultParent?: string;
}

/** Legacy config (keep for backward compat) */
export interface ComposerConfig {
  loader: Loader;
  uiBaseUrl?: string;
}
