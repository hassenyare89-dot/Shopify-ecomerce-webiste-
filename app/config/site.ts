/**
 * Centralized storefront configuration.
 *
 * Everything brand- or merchandising-related that is NOT commerce data lives
 * here. Commerce data (products, prices, inventory, collections, menus,
 * policies, discounts) always comes from Shopify and must never be hardcoded.
 *
 * Content that merchants should edit without a deploy (hero slides, FAQs,
 * testimonials, promo banners, social posts) is loaded from Shopify
 * metaobjects first; the values below are only fallbacks. See
 * docs/CONTENT_MODEL.md.
 */

export type HomeSectionId =
  | 'hero'
  | 'categories'
  | 'featuredCollections'
  | 'bestSellers'
  | 'newArrivals'
  | 'trending'
  | 'limitedOffers'
  | 'promoBanners'
  | 'testimonials'
  | 'reviews'
  | 'brandStory'
  | 'trust'
  | 'faq'
  | 'social'
  | 'newsletter';

export interface NavLinkConfig {
  title: string;
  to: string;
}

export interface TrustItem {
  icon: 'lock' | 'truck' | 'return' | 'support';
  title: string;
  body: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export const siteConfig = {
  /** Displayed store name. Replace with your brand name. */
  name: 'Himilomart',
  tagline: 'Your everyday market, thoughtfully curated.',
  description:
    'Shop thoughtfully designed products with secure checkout powered by Shopify.',

  /**
   * Logo. Put an SVG/PNG in /public and set `src`, or leave null to render a
   * typographic wordmark using `name`.
   */
  logo: {
    src: null as string | null,
    alt: 'Himilomart',
    width: 132,
    height: 32,
  },

  /**
   * Brand palette. These are injected as CSS custom properties at runtime, so
   * changing them restyles the entire storefront. Use OKLCH or hex values.
   * Keep text/background combinations at WCAG AA contrast (4.5:1).
   */
  theme: {
    // Forest green & cream. Every text/background pairing below meets WCAG AA
    // (4.5:1); e.g. cream on forest green 11.3:1, brass accent on cream 5.2:1.
    light: {
      primary: '#1F3D2B',
      primaryForeground: '#FBF8F1',
      secondary: '#EDE6D6',
      secondaryForeground: '#1F3D2B',
      accent: '#8C5F27',
      accentForeground: '#FFFFFF',
      background: '#FBF8F1',
      foreground: '#18211C',
      muted: '#5B6660',
      border: '#E3DCCB',
      surface: '#F4EFE3',
      sale: '#B42318',
      success: '#2F6B46',
    },
    dark: {
      primary: '#EDE6D6',
      primaryForeground: '#15241B',
      secondary: '#1C2A21',
      secondaryForeground: '#EDE6D6',
      accent: '#D4A866',
      accentForeground: '#15241B',
      background: '#0F1712',
      foreground: '#F1ECDF',
      muted: '#A3ADA6',
      border: '#2A3A30',
      surface: '#16211A',
      sale: '#F97066',
      success: '#6FCF97',
    },
    /** Dark, image-free hero backdrop (white text sits on it; keep it dark). */
    heroBackground: '#13281C',
    /** 'system' follows the OS setting until the shopper picks one. */
    defaultMode: 'system' as 'light' | 'dark' | 'system',
    /** Set false to hide the theme toggle and always use light mode. */
    enableDarkMode: true,
    radius: '0.75rem',
    fonts: {
      /** Loaded from Google Fonts in root.tsx. Set to null to use system fonts. */
      googleFontsHref:
        'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap' as
          | string
          | null,
      heading: '"Fraunces", ui-serif, Georgia, serif',
      body: '"Inter", ui-sans-serif, system-ui, sans-serif',
    },
  },

  /** Rotating announcement bar messages. Keep them truthful. */
  announcements: [
    {text: 'Secure checkout powered by Shopify', to: null as string | null},
    {text: 'New arrivals are here — shop the latest', to: '/new-arrivals'},
  ],

  /**
   * Fallback navigation used only when the Shopify "main-menu" menu is empty
   * or missing. Manage the real menu in Shopify admin → Content → Menus.
   */
  menus: {
    headerHandle: 'main-menu',
    footerHandle: 'footer',
    fallbackHeader: [
      {title: 'Shop all', to: '/collections/all'},
      {title: 'New arrivals', to: '/new-arrivals'},
      {title: 'Best sellers', to: '/best-sellers'},
      {title: 'Collections', to: '/collections'},
      {title: 'Sale', to: '/sale'},
      {title: 'Journal', to: '/blogs'},
    ] satisfies NavLinkConfig[],
    footerColumns: [
      {
        title: 'Shop',
        links: [
          {title: 'All products', to: '/collections/all'},
          {title: 'New arrivals', to: '/new-arrivals'},
          {title: 'Best sellers', to: '/best-sellers'},
          {title: 'Sale', to: '/sale'},
          {title: 'Gift cards', to: '/gift-cards'},
        ],
      },
      {
        title: 'Help',
        links: [
          {title: 'Contact us', to: '/contact'},
          {title: 'FAQs', to: '/faq'},
          {title: 'Shipping', to: '/shipping'},
          {title: 'Returns & refunds', to: '/returns'},
          {title: 'Order tracking', to: '/order-tracking'},
        ],
      },
      {
        title: 'Company',
        links: [
          {title: 'About us', to: '/about'},
          {title: 'Journal', to: '/blogs'},
          {title: 'Accessibility', to: '/accessibility'},
        ],
      },
    ] satisfies {title: string; links: NavLinkConfig[]}[],
  },

  /**
   * Collection handles used by merchandising pages and homepage rails.
   * Create these collections in Shopify admin. If a handle does not exist,
   * the page falls back to a Shopify-sorted product query (new arrivals,
   * best sellers) or shows an honest empty state (sale, trending).
   */
  collections: {
    newArrivals: 'new-arrivals',
    bestSellers: 'best-sellers',
    sale: 'sale',
    trending: 'trending',
    featured: ['frontpage'],
    /** Handles to show in "Shop by category". Empty = first 6 collections. */
    categories: [] as string[],
  },

  /** Ordered homepage sections. Remove or reorder freely. */
  homeSections: [
    'hero',
    'categories',
    'bestSellers',
    'featuredCollections',
    'newArrivals',
    'promoBanners',
    'trending',
    'limitedOffers',
    'reviews',
    'testimonials',
    'brandStory',
    'trust',
    'faq',
    'social',
    'newsletter',
  ] satisfies HomeSectionId[],

  hero: {
    eyebrow: 'New season',
    heading: 'Designed for everyday rituals',
    subheading:
      'Discover pieces crafted with care, from materials chosen to last.',
    primaryCta: {label: 'Shop now', to: '/collections/all'},
    secondaryCta: {label: 'Explore collections', to: '/collections'},
    /**
     * Optional interactive 3D presentation. Only loads on capable devices
     * that do not prefer reduced motion and are not on a slow/save-data
     * connection. A static image is always rendered first.
     */
    enable3D: true,
  },

  /**
   * A limited-time offer is only shown when `endsAt` is a future ISO date AND
   * the referenced collection exists. Never show fake countdowns.
   */
  limitedOffer: {
    enabled: false,
    heading: 'Limited-time offer',
    body: 'Selected styles at special prices while the offer lasts.',
    collectionHandle: 'sale',
    endsAt: null as string | null,
    termsUrl: '/pages/promotional-terms',
  },

  brandStory: {
    heading: 'Made with intention',
    body: 'We believe in fewer, better things. Every product we offer is selected for quality, longevity and the people who make it. Replace this copy with your own brand story, or manage it as a Shopify page with the handle "about".',
    cta: {label: 'Our story', to: '/about'},
    image: null as string | null,
  },

  /**
   * Trust indicators. Only list claims that are true for your business.
   * "Secure checkout" is accurate because payment happens on Shopify checkout.
   */
  trust: [
    {
      icon: 'lock',
      title: 'Secure checkout',
      body: 'Payments are processed by Shopify. We never see or store your card details.',
    },
    {
      icon: 'truck',
      title: 'Shipping options',
      body: 'Rates and delivery estimates are calculated at checkout.',
    },
    {
      icon: 'return',
      title: 'Easy returns',
      body: 'See our returns policy for eligibility and timelines.',
    },
    {
      icon: 'support',
      title: 'Real support',
      body: 'Questions? Our team is here to help.',
    },
  ] satisfies TrustItem[],

  /** Fallback FAQ entries — prefer the `faq_item` metaobject in Shopify. */
  faq: [
    {
      question: 'How much does shipping cost?',
      answer:
        'Shipping rates are calculated at checkout based on your address and the shipping methods configured for your region. See our shipping policy for details.',
      category: 'Shipping',
    },
    {
      question: 'Which payment methods do you accept?',
      answer:
        'Available payment methods are shown at checkout and depend on your region. Checkout is hosted and secured by Shopify.',
      category: 'Payments',
    },
    {
      question: 'How do I track my order?',
      answer:
        'You will receive an email with a link to your order status page. If you have an account, you can also view orders and tracking from your account.',
      category: 'Orders',
    },
    {
      question: 'What is your return policy?',
      answer:
        'Please review our returns and refunds policy for eligibility, timelines and how to start a return.',
      category: 'Returns',
    },
  ] satisfies FaqItem[],

  newsletter: {
    heading: 'Join our newsletter',
    body: 'Be the first to hear about new arrivals and offers. Unsubscribe anytime.',
    /**
     * Optional welcome discount. Only advertise it if this code exists in
     * Shopify admin → Discounts. Applied via /discount/<code>.
     */
    welcomeDiscountCode: null as string | null,
  },

  contact: {
    email: 'support@himilomart.com',
    phone: null as string | null,
    hours: 'Mon–Fri, 9am–5pm ET',
    address: null as string | null,
  },

  social: {
    instagram: null as string | null,
    tiktok: null as string | null,
    pinterest: null as string | null,
    facebook: null as string | null,
    youtube: null as string | null,
    x: null as string | null,
  },

  product: {
    /** Show "Only N left" when inventory is at or below this number. Requires
     * the `unauthenticated_read_product_inventory` scope. */
    lowStockThreshold: 5,
    showInventoryCount: false,
    deliveryNote:
      'Shipping options and delivery estimates are shown at checkout.',
    returnsNote: 'See our returns policy for eligibility.',
    /** Metafield used for the specifications accordion (namespace.key). */
    specsMetafield: {namespace: 'custom', key: 'specifications'},
    sizeChartMetafield: {namespace: 'custom', key: 'size_chart'},
  },

  /** Page size for product grids. */
  pageSize: 24,

  features: {
    wishlist: true,
    predictiveSearch: true,
    quickAdd: true,
  },

  legal: {
    /**
     * The non-Shopify legal pages (cookie policy, accessibility statement,
     * promotional terms) ship as templates. Until you have reviewed them with
     * counsel and set this to true, they render with a visible notice.
     */
    templatesReviewed: false,
    lastUpdated: '2026-11-06',
    /** Legal entity name (footer copyright, legal page templates). */
    businessName: 'Himilomart LLC',
  },
} as const;

export type SiteConfig = typeof siteConfig;
