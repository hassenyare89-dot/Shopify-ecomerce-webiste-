import {Link} from 'react-router';
import {Icon} from './Icon';
import type {Crumb} from '~/lib/seo';

/** Visible breadcrumb trail. Pair with breadcrumbJsonLd() in the route meta. */
export function Breadcrumbs({crumbs}: {crumbs: Crumb[]}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link to={crumb.path} className="hover:text-foreground">
                    {crumb.name}
                  </Link>
                  <Icon name="chevronRight" className="size-3" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
