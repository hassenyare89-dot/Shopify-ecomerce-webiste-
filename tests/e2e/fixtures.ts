/**
 * Shared Playwright fixtures.
 *
 * `page.goto` waits until React has hydrated (`<html data-hydrated="true">`).
 * Before hydration, interactive controls fall back to plain links (e.g. the
 * cart icon is a link to /cart), so clicking too early tests the no-JS path
 * instead of the drawer. Waiting removes that race on slow CI runners.
 */
import {test as base, expect} from '@playwright/test';

export const test = base.extend({
  page: async ({page}, provide) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await page.locator('html[data-hydrated="true"]').waitFor({state: 'attached', timeout: 15_000});
      return response;
    };
    await provide(page);
  },
});

export {expect};
