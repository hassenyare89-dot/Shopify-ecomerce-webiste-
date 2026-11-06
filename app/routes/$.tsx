import {isRouteErrorResponse, useRouteError} from 'react-router';
import type {Route} from './+types/$';
import {ButtonLink} from '~/components/ui/Button';
import {seoMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = () => seoMeta({title: 'Page not found', noindex: true});

export async function loader({request}: Route.LoaderArgs) {
  throw new Response(`${new URL(request.url).pathname} not found`, {status: 404});
}

export default function CatchAllPage() {
  return null;
}

/** Rendered inside the page layout so header/footer/search remain usable. */
export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Error {status}</p>
      <h1 className="mt-3 text-5xl md:text-7xl">{status === 404 ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="mt-4 max-w-md text-muted">
        {status === 404
          ? 'The page you’re looking for doesn’t exist or has moved.'
          : 'Please try again in a moment.'}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/collections/all" variant="outline">
          Shop all products
        </ButtonLink>
        <ButtonLink to="/search" variant="ghost">
          Search
        </ButtonLink>
      </div>
    </div>
  );
}
