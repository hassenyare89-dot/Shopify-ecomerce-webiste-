import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';
import {applySecurityHeaders} from '~/lib/security';
import {logger} from '~/lib/logger';

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);
      applySecurityHeaders(response.headers, {
        isProduction: process.env.NODE_ENV === 'production',
      });

      if (hydrogenContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        // Redirects managed in Shopify admin → Content → Menus → URL Redirects.
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      logger.error('unhandled_request_error', {
        error,
        url: new URL(request.url).pathname,
        method: request.method,
      });
      const headers = new Headers({'Content-Type': 'text/plain; charset=utf-8'});
      applySecurityHeaders(headers, {isProduction: process.env.NODE_ENV === 'production'});
      return new Response('An unexpected error occurred', {status: 500, headers});
    }
  },
};
