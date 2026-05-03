import { describe, it, expect } from 'vitest';
import { Composer } from '../src/composer';

function createMockLoader(data: Record<string, string>) {
  return async (path: string): Promise<string | null> => {
    return data[path] ?? null;
  };
}

describe('Composer', () => {
  describe('compose', () => {
    it('should return raw content when no frontmatter and no parent', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'test.md': '# Hello World',
        }),
      });

      const result = await composer.compose('test.md', '');
      expect(result).toBe('# Hello World');
    });

    it('should stitch child into parent slot:content', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'child.md': '---\nparent: parent.md\n---\nChild Content',
          'parent.md': '<main><!-- slot:content --></main>',
        }),
      });

      const result = await composer.compose('child.md', '');
      expect(result).toBe('<main>Child Content</main>');
    });

    it('should stitch child into parent slot:body', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'child.md': '---\nparent: parent.md\n---\nBody Content',
          'parent.md': '<article><!-- slot:body --></article>',
        }),
      });

      const result = await composer.compose('child.md', '');
      expect(result).toBe('<article>Body Content</article>');
    });

    it('should append child when no slot found', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'child.md': '---\nparent: parent.md\n---\nChild',
          'parent.md': '<div>Parent</div>',
        }),
      });

      const result = await composer.compose('child.md', '');
      expect(result).toBe('<div>Parent</div>\nChild');
    });

    it('should skip sections by id', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'child.md': '---\nparent: parent.md\nskip:\n  - sidebar\n---\nMain',
          'parent.md': '<section id="ads">Ad Block</section><section id="sidebar">Sidebar</section>',
        }),
      });

      const result = await composer.compose('child.md', '');
      expect(result).not.toContain('Sidebar');
      expect(result).toContain('<!-- skipped section: sidebar -->');
    });

    it('should recursively walk parent chain', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'child.md': '---\nparent: mid.md\n---\nChild',
          'mid.md': '---\nparent: root.md\n---\n<!-- slot:content -->',
          'root.md': '<html><!-- slot:content --></html>',
        }),
      });

      const result = await composer.compose('child.md', '');
      expect(result).toBe('<html>Child</html>');
    });

    it('should hydrate {{UI_BASE}} placeholders with custom URL', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'test.md': '<img src="{{UI_BASE}}/logo.png">',
        }),
        uiBaseUrl: 'https://cdn.example.com',
      });

      const result = await composer.compose('test.md', '');
      expect(result).toBe('<img src="https://cdn.example.com/logo.png">');
    });

    it('should hydrate {{UI_BASE}} with default URL', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'test.md': '{{UI_BASE}}/style.css',
        }),
      });

      const result = await composer.compose('test.md', '');
      expect(result).toBe('http://localhost:8788/style.css');
    });

    it('should throw when source content missing', async () => {
      const composer = new Composer({
        loader: createMockLoader({}),
      });

      await expect(composer.compose('missing.md')).rejects.toThrow('Source content missing');
    });

    it('should pre-process <link mfe?> tags', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'test.md': '<link mfe?>',
        }),
      });

      const result = await composer.compose('test.md', '');
      expect(result).toContain('data-interaction="mfe:default"');
      expect(result).toContain('class="mfe-slot"');
    });

    it('should handle &lt;link mfe?&gt; encoding', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'test.md': '&lt;link mfe?&gt;',
        }),
      });

      const result = await composer.compose('test.md', '');
      expect(result).toContain('data-interaction="mfe:default"');
    });

    it('should use defaultParent when no parent in frontmatter', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'test.md': 'Content',
          '__sys_/base.md': '<layout><!-- slot:content --></layout>',
        }),
      });

      const result = await composer.compose('test.md');
      expect(result).toBe('<layout>Content</layout>');
    });

    it('should parse frontmatter array syntax [a, b]', async () => {
      const composer = new Composer({
        loader: createMockLoader({
          'child.md': '---\nparent: p.md\nskip: ["a", "b"]\n---\nC',
          'p.md': '<section id="a">A</section><section id="b">B</section><!-- slot:body -->',
        }),
      });

      const result = await composer.compose('child.md', '');
      expect(result).not.toContain('A');
      expect(result).not.toContain('B');
      expect(result).toContain('<!-- skipped section: a -->');
      expect(result).toContain('<!-- skipped section: b -->');
    });
  });
});
