// Tests for the shared booking logic and the Worker (Angular tests run through "ng test").
import { defineConfig } from 'vitest/config';

/**
 * Messages the Worker logs when an email or Google request fails. Several tests make those
 * services fail on purpose (to check that bookings are kept and retried), so these lines are
 * expected there and only clutter the output. Any other error output is still shown.
 */
const EXPECTED_FAILURE_LOGS =
  /^(Email \((customer|owner)\) failed|Daily digest failed|Google (calendar|sheet) sync failed|Calendar busy times unavailable):/;

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    onConsoleLog(log, type) {
      if (type === 'stderr' && EXPECTED_FAILURE_LOGS.test(log)) return false;
    },
  },
});
