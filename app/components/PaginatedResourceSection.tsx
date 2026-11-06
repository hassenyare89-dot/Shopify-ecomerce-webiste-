import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';
import {buttonClasses} from '~/components/ui/Button';
import {cn} from '~/lib/cn';

/**
 * Cursor-based pagination using Hydrogen's <Pagination>. "Load more" links
 * are real, crawlable URLs (?cursor=...&direction=next), so it works without
 * JavaScript and search engines can reach every page.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
  as: Wrapper = 'div',
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{node: NodesType; index: number}>;
  ariaLabel?: string;
  resourcesClassName?: string;
  as?: 'div' | 'ul';
}) {
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) => children({node, index}));
        return (
          <div>
            <div className="mb-8 flex justify-center empty:hidden">
              <PreviousLink className={buttonClasses({variant: 'outline'})}>
                {isLoading ? 'Loading…' : 'Load previous'}
              </PreviousLink>
            </div>
            <Wrapper
              aria-label={ariaLabel}
              className={cn(resourcesClassName)}
              role={ariaLabel && Wrapper === 'div' ? 'region' : undefined}
            >
              {resourcesMarkup}
            </Wrapper>
            <div className="mt-12 flex justify-center empty:hidden">
              <NextLink className={buttonClasses({variant: 'outline', size: 'lg'})}>
                {isLoading ? 'Loading…' : 'Load more'}
              </NextLink>
            </div>
          </div>
        );
      }}
    </Pagination>
  );
}
