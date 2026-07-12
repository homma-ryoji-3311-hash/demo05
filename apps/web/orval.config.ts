import { defineConfig } from 'orval';

export default defineConfig({
  staffReport: {
    input: '../service/openapi.json',
    output: {
      mode: 'tags-split',
      target: './src/common/api/generated',
      schemas: './src/common/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      mock: true,
      clean: true,
      override: {
        mutator: {
          path: './src/common/api/client.ts',
          name: 'apiFetch',
        },
        query: {
          useQuery: true,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
