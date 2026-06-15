import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig([
  {
    input: 'src/rts/openapi.json',
    output: {
      format: 'prettier',
      lint: 'eslint',
      path: 'src/rts/generated',
    },
  },
  {
    input: 'src/map/openapi.json',
    output: {
      format: 'prettier',
      lint: 'eslint',
      path: 'src/map/generated',
    },
  },
]);
