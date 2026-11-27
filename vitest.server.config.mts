// Tests for the shared booking logic and the Worker (Angular tests run through "ng test").
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
});
