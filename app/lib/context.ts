import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_MUTATE_FRAGMENT, CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
  // Example of complex objects that could be added:
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const;

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}

  // Augment HydrogenCustomCartFragment with the codegen'd cart fragment type so
  // that context.cart.get() and all cart mutations return the extended cart type.
  interface HydrogenCustomCartFragment extends CartApiQueryFragment {}
}

/**
 * Creates Hydrogen context for React Router 7.9.x
 * Returns HydrogenRouterContextProvider with hybrid access patterns
 * */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * Open a cache instance in the worker and a custom session instance.
   */
  if (!env?.SESSION_SECRET) {
    throw new Error(
      'SESSION_SECRET environment variable is not set. ' +
        'Run `npm run setup:env` to create .env with a secure secret, ' +
        'then `npx shopify hydrogen env pull` to add your store credentials ' +
        '(or use `npm run dev:mock` to preview with sample data).',
    );
  }
  if (!env.PUBLIC_STORE_DOMAIN) {
    throw new Error(
      'PUBLIC_STORE_DOMAIN environment variable is not set. ' +
        'Run `npx shopify hydrogen link` then `npx shopify hydrogen env pull` ' +
        '(see docs/SHOPIFY_SETUP.md), or use `npm run dev:mock` to preview with sample data.',
    );
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET], {
      secure: new URL(request.url).protocol === 'https:',
    }),
  ]);

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      // Or detect from URL path based on locale subpath, cookies, or any other strategy
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
        mutateFragment: CART_MUTATE_FRAGMENT,
      },
    },
    additionalContext,
  );

  return hydrogenContext;
}
