import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/faq';
import {ContentPage} from '~/components/ContentPage';
import {Accordion} from '~/components/ui/primitives';
import {getMetaobjects, mapNodes, toFaqEntry, type FaqEntry} from '~/lib/content';
import {canonicalUrl, faqJsonLd, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({
    title: 'Frequently asked questions',
    description: 'Answers to common questions about orders, shipping, payments and returns.',
    url: data?.canonical,
    jsonLd: data?.faqs.length ? faqJsonLd(data.faqs) : undefined,
  });

/** FAQs from the `faq_item` metaobject (Shopify admin), falling back to config. */
export async function loader({context, request}: Route.LoaderArgs) {
  const entries = mapNodes(await getMetaobjects(context.storefront, 'faq_item', 100), toFaqEntry);
  const faqs: FaqEntry[] = entries.length
    ? entries
    : siteConfig.faq.map((f, i) => ({id: `config-${i}`, ...f}));
  return {faqs, canonical: canonicalUrl(request.url)};
}

export default function Faq() {
  const {faqs} = useLoaderData<typeof loader>();
  const groups = new Map<string, FaqEntry[]>();
  for (const f of faqs) {
    const key = f.category ?? 'General';
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  return (
    <ContentPage title="Frequently asked questions" intro="Can’t find your answer? Contact our team." path="/faq">
      {groups.size > 1 ? (
        <nav aria-label="FAQ categories" className="mb-10 flex flex-wrap gap-2">
          {[...groups.keys()].map((g) => (
            <a key={g} href={`#faq-${slug(g)}`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-foreground">
              {g}
            </a>
          ))}
        </nav>
      ) : null}
      <div className="space-y-12">
        {[...groups.entries()].map(([group, items]) => (
          <section key={group} id={`faq-${slug(group)}`} aria-labelledby={`faq-h-${slug(group)}`} className="scroll-mt-28">
            <h2 id={`faq-h-${slug(group)}`} className="mb-2 text-2xl">
              {group}
            </h2>
            <div className="border-t border-border">
              {items.map((item) => (
                <Accordion key={item.id} title={item.question}>
                  <p className="whitespace-pre-line">{item.answer}</p>
                </Accordion>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-muted">
        Still need help? <Link to="/contact" className="underline">Contact us</Link>.
      </p>
    </ContentPage>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
