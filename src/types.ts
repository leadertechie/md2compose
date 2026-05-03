/** Configuration for the Composer engine */
export interface ComposerConfig {
  /** Content loader function: given a path, returns raw content or null */
  loader: (path: string) => Promise<string | null>;
  /** Base URL for asset placeholder hydration (e.g., {{UI_BASE}}) */
  uiBaseUrl?: string;
}

/** Parsed frontmatter metadata */
export interface MDMetadata {
  parent?: string;
  skip?: string[];
  [key: string]: any;
}
