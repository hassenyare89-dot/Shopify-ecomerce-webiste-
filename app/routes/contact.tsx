import {useEffect, useRef} from 'react';
import {Link, useFetcher} from 'react-router';
import type {Route} from './+types/contact';
import {ContentPage} from '~/components/ContentPage';
import {Button} from '~/components/ui/Button';
import {Field, Honeypot, inputClasses, Notice} from '~/components/ui/primitives';
import {Icon} from '~/components/ui/Icon';
import {CONTACT_TOPICS} from '~/lib/contact';
import {canonicalUrl, seoMeta} from '~/lib/seo';
import {siteConfig} from '~/config/site';
import type {ContactActionData} from './api.contact';

export const meta: Route.MetaFunction = ({data}) =>
  seoMeta({title: 'Contact us', description: `Get in touch with ${siteConfig.name}.`, url: data?.canonical});

export function loader({request}: Route.LoaderArgs) {
  return {canonical: canonicalUrl(request.url)};
}

export default function Contact() {
  const fetcher = useFetcher<ContactActionData>();
  const formRef = useRef<HTMLFormElement>(null);
  const result = fetcher.data;
  const errors = result && !result.ok ? result.fieldErrors : undefined;

  useEffect(() => {
    if (result?.ok) formRef.current?.reset();
  }, [result]);

  return (
    <ContentPage title="Contact us" intro="We’re here to help. Send us a message and we’ll reply by email." path="/contact" wide>
      <div className="grid gap-12 md:grid-cols-[1.4fr_1fr]">
        <fetcher.Form ref={formRef} method="post" action="/api/contact" className="relative space-y-5" noValidate>
          <Honeypot />
          {result ? (
            <Notice tone={result.ok ? 'success' : 'error'} title={result.ok ? 'Message sent' : 'We couldn’t send your message'}>
              {result.message}
            </Notice>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" name="name" autoComplete="name" required error={errors?.name} maxLength={100} />
            <Field label="Email" name="email" type="email" autoComplete="email" required error={errors?.email} maxLength={254} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-topic" className="text-sm font-medium">
                Topic
              </label>
              <select id="contact-topic" name="topic" className={inputClasses}>
                {CONTACT_TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <Field label="Order number (optional)" name="orderNumber" error={errors?.orderNumber} maxLength={40} placeholder="#1001" />
          </div>
          <Field label="Message" name="message" textarea required error={errors?.message} maxLength={5000} />
          <p className="text-xs text-muted">
            We use your details only to respond to your request. See our{' '}
            <Link to="/policies/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
          <Button type="submit" size="lg" loading={fetcher.state !== 'idle'}>
            Send message
          </Button>
        </fetcher.Form>

        <aside className="space-y-6 rounded-brand bg-surface p-6 text-sm">
          <div className="flex gap-3">
            <Icon name="mail" className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">Email</p>
              <a href={`mailto:${siteConfig.contact.email}`} className="underline underline-offset-4">
                {siteConfig.contact.email}
              </a>
            </div>
          </div>
          {siteConfig.contact.phone ? (
            <div className="flex gap-3">
              <Icon name="phone" className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">Phone</p>
                <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phone}</a>
              </div>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Icon name="support" className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">Hours</p>
              <p className="text-muted">{siteConfig.contact.hours}</p>
            </div>
          </div>
          {siteConfig.contact.address ? (
            <div className="flex gap-3">
              <Icon name="map" className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">Address</p>
                <p className="whitespace-pre-line text-muted">{siteConfig.contact.address}</p>
              </div>
            </div>
          ) : null}
          <div className="border-t border-border pt-6">
            <p className="font-semibold">Quick help</p>
            <ul className="mt-2 space-y-2">
              <li><Link to="/order-tracking" className="underline underline-offset-4">Track an order</Link></li>
              <li><Link to="/faq" className="underline underline-offset-4">FAQs</Link></li>
              <li><Link to="/policies/refund-policy" className="underline underline-offset-4">Returns &amp; refunds</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </ContentPage>
  );
}
