import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  html: {
    template: 'index.html',
  },
  tools: {
    rspack: {
      module: {
        rules: [
          {
            resourceQuery: /raw$/,
            type: 'asset/source',
          },
        ],
      },
    },
  },
});
