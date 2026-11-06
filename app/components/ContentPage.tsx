import {Breadcrumbs} from '~/components/ui/Breadcrumbs';
import {Notice} from '~/components/ui/primitives';
import {cn} from '~/lib/cn';

/** Layout for editorial/legal pages. `html` must come from Shopify (trusted merchant content). */
export function ContentPage({
  title,
  eyebrow,
  intro,
  html,
  path,
  updatedAt,
  templateNotice = false,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  intro?: string;
  html?: string;
  path: string;
  updatedAt?: string;
  templateNotice?: boolean;
  children?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="container-page py-8 md:py-12">
      <Breadcrumbs crumbs={[{name: 'Home', path: '/'}, {name: title, path}]} />
      <article className={cn('mx-auto', wide ? 'max-w-5xl' : 'max-w-3xl')}>
        <header className="mb-10">
          {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          {intro ? <p className="mt-4 text-lg text-muted">{intro}</p> : null}
          {updatedAt ? <p className="mt-3 text-xs text-muted">Last updated: {updatedAt}</p> : null}
        </header>
        {templateNotice ? (
          <div className="mb-8">
            <Notice tone="warning" title="Template — pending review">
              This page uses a starter template. The store owner must review and adapt it to their actual business
              practices with legal counsel before relying on it.
            </Notice>
          </div>
        ) : null}
        {html ? <div className="prose-store" dangerouslySetInnerHTML={{__html: html}} /> : null}
        {children}
      </article>
    </div>
  );
}
