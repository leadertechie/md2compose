import type { Transformer } from "./types";

/** Replaces `<link mfe?>` / `<link mfe?>` with MFE interaction slot */
export const mfeLinkTransformer: Transformer = {
  name: "mfe-link",
  transform(content: string): string {
    const lt = "\x26lt;";
    const gt = "\x26gt;";
    return content.replace(
      new RegExp(`(?:<|${lt})link mfe\\?(?:>|${gt})`, "g"),
      '<div data-interaction="mfe:default" class="mfe-slot"></div>'
    );
  },
};

/** Creates a transformer that replaces `{{UI_BASE}}` with a given URL */
export function uiBaseTransformer(uiBase: string): Transformer {
  return {
    name: "ui-base",
    transform(content: string): string {
      return content.replace(/\{\{UI_BASE\}\}/g, uiBase);
    },
  };
}

/** Built-in defaults used by ComposerBuilder */
export function defaultTransformers(uiBase: string): Transformer[] {
  return [mfeLinkTransformer, uiBaseTransformer(uiBase)];
}
