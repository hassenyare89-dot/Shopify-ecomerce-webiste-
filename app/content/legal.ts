/**
 * Starter templates for legal pages that Shopify does not manage natively.
 *
 * IMPORTANT: These are generic starting points, NOT legal advice and NOT a
 * guarantee of compliance. Review with qualified counsel against your actual
 * data practices, vendors and jurisdictions (e.g. CCPA/CPRA, VCDPA, CPA, CTDPA
 * and other U.S. state privacy laws; ADA/WCAG; FTC rules). Until
 * `siteConfig.legal.templatesReviewed` is true, pages render a visible notice.
 *
 * To manage this content in Shopify instead, create a Page in Shopify admin
 * with the matching handle (e.g. "cookie-policy") — it takes precedence.
 *
 * Privacy Policy, Terms of Service, Refund Policy and Shipping Policy are
 * managed in Shopify admin → Settings → Policies and served at /policies/*.
 */
import {siteConfig} from '~/config/site';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalDocument {
  handle: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

const name = siteConfig.legal.businessName;
const email = siteConfig.contact.email;

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  'cookie-policy': {
    handle: 'cookie-policy',
    title: 'Cookie Policy',
    intro: `This Cookie Policy explains how ${name} uses cookies and similar technologies on this website.`,
    sections: [
      {
        heading: 'What are cookies?',
        paragraphs: [
          'Cookies are small text files stored on your device. Similar technologies include local storage and pixels. They help websites work and provide information to site owners.',
        ],
      },
      {
        heading: 'How we use cookies',
        paragraphs: ['We group the technologies we use into these categories:'],
        list: [
          'Strictly necessary — required for core functions such as your cart, secure sign-in and checkout (operated with Shopify). These cannot be switched off.',
          'Preferences — remember choices such as your theme and wishlist (stored in your browser).',
          'Analytics — help us understand how the site is used. Only set with your consent where required.',
          'Marketing — used by advertising partners to measure and personalise ads. Only set with your consent where required.',
        ],
      },
      {
        heading: 'Managing your choices',
        paragraphs: [
          'Where required by law, we ask for your consent before setting non-essential cookies using Shopify’s privacy banner. You can change your choices at any time using the “Privacy choices” link in the footer, or through your browser settings. Blocking some cookies may affect site functionality.',
          'We honor Global Privacy Control (GPC) signals where required by applicable law.',
        ],
      },
      {
        heading: 'Third parties',
        paragraphs: [
          'Depending on your choices and our configuration, third parties such as Shopify, Google, Meta, TikTok, Pinterest and Klaviyo may set cookies. List the providers you actually use here and link to their privacy policies.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about this policy can be sent to ${email}.`],
      },
    ],
  },
  accessibility: {
    handle: 'accessibility',
    title: 'Accessibility Statement',
    intro: `${name} is committed to making our website accessible to everyone, including people with disabilities.`,
    sections: [
      {
        heading: 'Our approach',
        paragraphs: [
          'We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA. Our storefront is built with semantic HTML, keyboard navigation, visible focus indicators, text alternatives for images, sufficient color contrast, and support for reduced-motion preferences.',
        ],
      },
      {
        heading: 'Checkout',
        paragraphs: [
          'Checkout is provided by Shopify, which maintains its own accessibility program for hosted checkout.',
        ],
      },
      {
        heading: 'Known limitations',
        paragraphs: [
          'Some content, such as third-party widgets or product media supplied by partners, may not yet fully meet our standards. We are working to address these. Describe any specific known issues here after your accessibility audit.',
        ],
      },
      {
        heading: 'Feedback and assistance',
        paragraphs: [
          `If you encounter an accessibility barrier or need assistance placing an order, please contact us at ${email}. We aim to respond within two business days.`,
        ],
      },
    ],
  },
  'promotional-terms': {
    handle: 'promotional-terms',
    title: 'Promotional Terms',
    intro: 'These terms apply to promotions, discount codes and offers on this website unless an offer states otherwise.',
    sections: [
      {
        heading: 'General terms',
        paragraphs: [],
        list: [
          'Offers are valid only during the stated promotional period and while supplies last.',
          'Discount codes are applied at checkout, cannot be exchanged for cash and may not be combined with other offers unless stated.',
          'Discounts apply to the merchandise subtotal and exclude taxes, shipping and gift cards unless stated.',
          'We reserve the right to modify or end a promotion where permitted by law; changes will not affect orders already placed.',
        ],
      },
      {
        heading: 'Welcome offers',
        paragraphs: [
          'Newsletter welcome offers are limited to one per new subscriber. Describe any eligibility rules, exclusions and expiry here.',
        ],
      },
      {
        heading: 'Pricing',
        paragraphs: [
          'Compare-at (“was”) prices reflect genuine prior selling prices. Describe how your business sets reference prices to keep this statement accurate.',
        ],
      },
    ],
  },
};
