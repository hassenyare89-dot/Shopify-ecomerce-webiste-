/**
 * MOCK DATA — development & automated tests only.
 *
 * Deterministic sample catalog served by mock/storefront-server.mjs. None of
 * this is real merchant data and it is never used in production: the
 * storefront only talks to this server when PUBLIC_STORE_DOMAIN points at
 * http://127.0.0.1:<port>. Product names are prefixed with nothing special so
 * the UI looks realistic, but the shop name and every content entry are
 * marked as sample/mock data.
 */

export const MOCK_ORIGIN = process.env.MOCK_ORIGIN ?? 'http://127.0.0.1:4010';

const PALETTES = [
  ['#e8ddd0', '#b4532a'],
  ['#dfe6e1', '#2f5d50'],
  ['#e6e1ec', '#5b4b8a'],
  ['#efe4d6', '#8a5a2b'],
  ['#e2e6ee', '#2c4a7a'],
  ['#f0e2e2', '#9b2c3a'],
  ['#e9e9e4', '#3b3b36'],
  ['#f3ead8', '#b08a2e'],
];

let imageCounter = 1000;
function image(seed, label, w = 1200, h = 1500) {
  imageCounter += 1;
  return {
    __typename: 'Image',
    id: `gid://shopify/ProductImage/${imageCounter}`,
    url: `${MOCK_ORIGIN}/mock-images/${encodeURIComponent(seed)}.svg?label=${encodeURIComponent(label)}&w=${w}&h=${h}`,
    altText: label,
    width: w,
    height: h,
    thumbhash: null,
  };
}

const money = (amount, currencyCode = 'USD') => ({
  __typename: 'MoneyV2',
  amount: Number(amount).toFixed(2),
  currencyCode,
});

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-01T12:00:00Z');

const COLORS = {
  Sand: '#d9c7ad',
  Clay: '#b4532a',
  Sage: '#9fb3a2',
  Ink: '#1f2a44',
  Bone: '#efe9df',
  Charcoal: '#3a3a38',
};

/**
 * Product blueprints. `stock` maps "Color/Size" → available (true/false).
 * A missing combination means the variant doesn't exist.
 */
const BLUEPRINTS = [
  {handle: 'linen-overshirt', title: 'Linen Overshirt', type: 'Shirts', vendor: 'Atelier North', price: 128, compareAt: 160, colors: ['Sand', 'Sage', 'Ink'], sizes: ['XS', 'S', 'M', 'L', 'XL'], soldOut: ['Ink/XS', 'Sage/XL'], rating: [4.8, 124], collections: ['apparel', 'new-arrivals', 'best-sellers', 'sale', 'frontpage'], ageDays: 5, sales: 98},
  {handle: 'merino-crew-sweater', title: 'Merino Crew Sweater', type: 'Knitwear', vendor: 'Atelier North', price: 148, colors: ['Bone', 'Charcoal', 'Clay'], sizes: ['S', 'M', 'L', 'XL'], soldOut: [], rating: [4.7, 89], collections: ['apparel', 'best-sellers', 'frontpage', 'trending'], ageDays: 60, sales: 95},
  {handle: 'organic-cotton-tee', title: 'Organic Cotton Tee', type: 'T-Shirts', vendor: 'Field & Thread', price: 38, colors: ['Bone', 'Ink', 'Sage', 'Clay'], sizes: ['XS', 'S', 'M', 'L', 'XL'], soldOut: ['Clay/XS'], rating: [4.6, 310], collections: ['apparel', 'best-sellers', 'trending'], ageDays: 120, sales: 99},
  {handle: 'relaxed-chino', title: 'Relaxed Chino', type: 'Trousers', vendor: 'Field & Thread', price: 98, colors: ['Sand', 'Charcoal'], sizes: ['28', '30', '32', '34', '36'], soldOut: ['Sand/36'], rating: [4.4, 57], collections: ['apparel'], ageDays: 200, sales: 60},
  {handle: 'ceramic-pour-over-set', title: 'Ceramic Pour-Over Set', type: 'Kitchen', vendor: 'Kiln Studio', price: 72, colors: ['Bone', 'Charcoal'], sizes: [], soldOut: [], rating: [4.9, 212], collections: ['home', 'best-sellers', 'frontpage', 'trending'], ageDays: 15, sales: 97},
  {handle: 'stoneware-dinner-plates', title: 'Stoneware Dinner Plates (Set of 4)', type: 'Tableware', vendor: 'Kiln Studio', price: 96, compareAt: 120, colors: ['Bone', 'Sage', 'Clay'], sizes: [], soldOut: ['Clay'], rating: [4.7, 76], collections: ['home', 'sale'], ageDays: 90, sales: 70},
  {handle: 'waxed-canvas-tote', title: 'Waxed Canvas Tote', type: 'Bags', vendor: 'Harbor Goods', price: 118, colors: ['Sand', 'Ink', 'Charcoal'], sizes: [], soldOut: [], rating: [4.8, 143], collections: ['accessories', 'best-sellers', 'new-arrivals', 'frontpage'], ageDays: 8, sales: 90},
  {handle: 'leather-card-holder', title: 'Leather Card Holder', type: 'Small Leather Goods', vendor: 'Harbor Goods', price: 45, colors: ['Clay', 'Ink'], sizes: [], soldOut: [], rating: [4.5, 64], collections: ['accessories'], ageDays: 150, sales: 55},
  {handle: 'wool-throw-blanket', title: 'Wool Throw Blanket', type: 'Textiles', vendor: 'Loom & Co', price: 165, colors: ['Bone', 'Sage'], sizes: [], soldOut: [], rating: [4.9, 38], collections: ['home', 'new-arrivals'], ageDays: 3, sales: 40},
  {handle: 'beeswax-candle-trio', title: 'Beeswax Candle Trio', type: 'Candles', vendor: 'Loom & Co', price: 34, colors: [], sizes: [], soldOut: [], rating: null, collections: ['home', 'new-arrivals', 'trending'], ageDays: 2, sales: 30},
  {handle: 'trail-runner-sneaker', title: 'Trail Runner Sneaker', type: 'Footwear', vendor: 'Stride Lab', price: 145, compareAt: 175, colors: ['Charcoal', 'Sand'], sizes: ['7', '8', '9', '10', '11', '12'], soldOut: ['Sand/12', 'Charcoal/7'], rating: [4.3, 51], collections: ['footwear', 'sale', 'apparel'], ageDays: 45, sales: 66},
  {handle: 'suede-chelsea-boot', title: 'Suede Chelsea Boot', type: 'Footwear', vendor: 'Stride Lab', price: 210, colors: ['Clay', 'Charcoal'], sizes: ['7', '8', '9', '10', '11'], soldOut: [], rating: [4.6, 29], collections: ['footwear'], ageDays: 25, sales: 35},
  {handle: 'archive-field-jacket', title: 'Archive Field Jacket', type: 'Outerwear', vendor: 'Atelier North', price: 245, colors: ['Ink'], sizes: ['S', 'M', 'L'], soldOut: ['Ink/S', 'Ink/M', 'Ink/L'], rating: null, collections: ['apparel'], ageDays: 300, sales: 20},
  {handle: 'brass-desk-lamp', title: 'Brass Desk Lamp', type: 'Lighting', vendor: 'Kiln Studio', price: 189, colors: [], sizes: [], soldOut: [], rating: [4.2, 12], collections: ['home'], ageDays: 75, sales: 25},
];

const COLLECTION_META = {
  frontpage: {title: 'Editor’s Picks', description: 'Hand-picked favorites from across the store.'},
  apparel: {title: 'Apparel', description: 'Everyday essentials in natural fibres.'},
  home: {title: 'Home', description: 'Objects for slower mornings and well-set tables.'},
  accessories: {title: 'Accessories', description: 'Carry-alls and small goods built to age well.'},
  footwear: {title: 'Footwear', description: 'From trail to town.'},
  'new-arrivals': {title: 'New Arrivals', description: 'The latest additions to the store.'},
  'best-sellers': {title: 'Best Sellers', description: 'Our most-loved pieces.'},
  sale: {title: 'Sale', description: 'Selected styles at reduced prices.'},
  trending: {title: 'Trending Now', description: 'What everyone is shopping this week.'},
};

let variantId = 40000;

function encodeTrie(combos, depth, optionCount) {
  // combos: sorted arrays of indices; returns encoded string (no "v1_").
  const groups = new Map();
  for (const c of combos) {
    if (!groups.has(c[depth])) groups.set(c[depth], []);
    groups.get(c[depth]).push(c);
  }
  const keys = [...groups.keys()].sort((a, b) => a - b);
  if (depth === optionCount - 1) return keys.join(' ');
  return keys.map((k) => `${k}:${encodeTrie(groups.get(k), depth + 1, optionCount)},`).join('');
}

/** Encodes option-value index combinations in Shopify's v1 trie format. */
export function encodeVariants(combos, optionCount) {
  if (!combos.length || optionCount === 0) return '';
  const sorted = [...combos].sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  const body = encodeTrie(sorted, 0, optionCount);
  return `v1_${body}`;
}

function buildProduct(bp, index) {
  const id = `gid://shopify/Product/${8000 + index}`;
  const palette = PALETTES[index % PALETTES.length];
  const options = [];
  if (bp.colors.length) options.push({name: 'Color', values: bp.colors});
  if (bp.sizes.length) options.push({name: 'Size', values: bp.sizes});

  const images = [
    image(`${bp.handle}-1|${palette[0]}|${palette[1]}`, `${bp.title}`),
    image(`${bp.handle}-2|${palette[1]}|${palette[0]}`, `${bp.title} — detail`),
    image(`${bp.handle}-3|${palette[0]}|${palette[1]}|alt`, `${bp.title} — lifestyle`),
  ];
  const colorImages = Object.fromEntries(
    bp.colors.map((c) => [c, image(`${bp.handle}-${c}|${COLORS[c]}|${palette[1]}`, `${bp.title} in ${c}`)]),
  );

  // Build variant combinations (cartesian product).
  let combos = [[]];
  for (const opt of options) {
    combos = combos.flatMap((c) => opt.values.map((_, i) => [...c, i]));
  }
  if (!options.length) combos = [[]];

  const variants = combos.map((combo) => {
    variantId += 1;
    const selectedOptions = options.length
      ? combo.map((vi, oi) => ({__typename: 'SelectedOption', name: options[oi].name, value: options[oi].values[vi]}))
      : [{__typename: 'SelectedOption', name: 'Title', value: 'Default Title'}];
    const key = selectedOptions.map((o) => o.value).join('/');
    const available = !bp.soldOut.includes(key);
    const color = options[0]?.name === 'Color' ? options[0].values[combo[0]] : null;
    const sizeBump = options.find((o) => o.name === 'Size') && ['XL', '12', '36'].includes(selectedOptions.at(-1).value) ? 6 : 0;
    const price = bp.price + sizeBump;
    return {
      __typename: 'ProductVariant',
      id: `gid://shopify/ProductVariant/${variantId}`,
      title: options.length ? key.replace(/\//g, ' / ') : 'Default Title',
      sku: `${bp.handle.slice(0, 6).toUpperCase()}-${variantId}`,
      availableForSale: available,
      currentlyNotInStock: !available,
      quantityAvailable: available ? 3 + ((variantId * 7) % 20) : 0,
      requiresShipping: true,
      price: money(price),
      compareAtPrice: bp.compareAt ? money(bp.compareAt + sizeBump) : null,
      unitPrice: null,
      unitPriceMeasurement: null,
      image: color ? colorImages[color] : images[0],
      selectedOptions,
      _combo: combo,
      _productId: id,
    };
  });

  const encodedExistence = options.length ? encodeVariants(variants.map((v) => v._combo), options.length) : '';
  const encodedAvailability = options.length
    ? encodeVariants(variants.filter((v) => v.availableForSale).map((v) => v._combo), options.length)
    : '';

  const product = {
    __typename: 'Product',
    id,
    handle: bp.handle,
    title: bp.title,
    vendor: bp.vendor,
    productType: bp.type,
    tags: [bp.type.toLowerCase(), ...(bp.compareAt ? ['sale'] : [])],
    isGiftCard: false,
    description: `${bp.title} — a sample product from the mock catalog. Thoughtfully made from considered materials and designed for everyday use.`,
    descriptionHtml: `<p><strong>Sample product (mock data).</strong> The ${bp.title.toLowerCase()} is designed for everyday use and made from considered materials.</p><ul><li>Responsibly sourced materials</li><li>Designed to last</li><li>Care: see label</li></ul>`,
    publishedAt: new Date(NOW - bp.ageDays * DAY).toISOString(),
    createdAt: new Date(NOW - bp.ageDays * DAY).toISOString(),
    updatedAt: new Date(NOW - DAY).toISOString(),
    onlineStoreUrl: null,
    requiresSellingPlan: false,
    trackingParameters: null,
    totalInventory: variants.reduce((a, v) => a + v.quantityAvailable, 0),
    availableForSale: variants.some((v) => v.availableForSale),
    encodedVariantExistence: encodedExistence,
    encodedVariantAvailability: encodedAvailability,
    seo: {__typename: 'SEO', title: null, description: null},
    images,
    featuredImage: images[0],
    _variants: variants,
    _options: options,
    _collections: bp.collections,
    _sales: bp.sales,
    _rating: bp.rating,
    _colorImages: colorImages,
  };
  for (const v of variants) {
    v.product = product;
  }
  return product;
}

export const PRODUCTS = BLUEPRINTS.map(buildProduct);

export const COLLECTIONS = Object.entries(COLLECTION_META).map(([handle, meta], i) => ({
  __typename: 'Collection',
  id: `gid://shopify/Collection/${500 + i}`,
  handle,
  title: meta.title,
  description: meta.description,
  descriptionHtml: `<p>${meta.description}</p>`,
  seo: {__typename: 'SEO', title: null, description: null},
  updatedAt: new Date(NOW - i * DAY).toISOString(),
  onlineStoreUrl: null,
  trackingParameters: null,
  image: image(`collection-${handle}|${PALETTES[i % PALETTES.length][1]}|${PALETTES[i % PALETTES.length][0]}`, meta.title, 1600, 1200),
}));

export const SHOP = {
  __typename: 'Shop',
  id: 'gid://shopify/Shop/1',
  name: 'Demo Store (mock data)',
  description: 'Mock Storefront API for local development and tests.',
  moneyFormat: '${{amount}}',
  primaryDomain: {__typename: 'Domain', url: MOCK_ORIGIN, host: '127.0.0.1', sslEnabled: false},
  brand: null,
  paymentSettings: {
    __typename: 'PaymentSettings',
    acceptedCardBrands: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER'],
    supportedDigitalWallets: ['APPLE_PAY', 'GOOGLE_PAY', 'SHOPIFY_PAY'],
    countryCode: 'US',
    currencyCode: 'USD',
    enabledPresentmentCurrencies: ['USD'],
  },
};

const policy = (handle, title) => ({
  __typename: 'ShopPolicy',
  id: `gid://shopify/ShopPolicy/${handle}`,
  handle,
  title,
  url: `${MOCK_ORIGIN}/policies/${handle}`,
  body: `<p><strong>Mock policy content.</strong> In production this ${title.toLowerCase()} is managed in Shopify admin → Settings → Policies.</p>`,
});
export const POLICIES = {
  privacyPolicy: policy('privacy-policy', 'Privacy Policy'),
  refundPolicy: policy('refund-policy', 'Refund Policy'),
  shippingPolicy: policy('shipping-policy', 'Shipping Policy'),
  termsOfService: policy('terms-of-service', 'Terms of Service'),
  subscriptionPolicy: null,
};

const menuItem = (id, title, url, items = []) => ({
  __typename: 'MenuItem',
  id: `gid://shopify/MenuItem/${id}`,
  resourceId: null,
  tags: [],
  title,
  type: 'HTTP',
  url,
  items,
});

export const MENUS = {
  'main-menu': {
    __typename: 'Menu',
    id: 'gid://shopify/Menu/1',
    handle: 'main-menu',
    title: 'Main menu',
    items: [
      menuItem(1, 'Shop', '/collections/all', [
        menuItem(11, 'Apparel', '/collections/apparel'),
        menuItem(12, 'Home', '/collections/home'),
        menuItem(13, 'Accessories', '/collections/accessories'),
        menuItem(14, 'Footwear', '/collections/footwear'),
      ]),
      menuItem(2, 'New arrivals', '/new-arrivals'),
      menuItem(3, 'Best sellers', '/best-sellers'),
      menuItem(4, 'Sale', '/sale'),
      menuItem(5, 'Journal', '/blogs/journal'),
    ],
  },
  footer: {
    __typename: 'Menu',
    id: 'gid://shopify/Menu/2',
    handle: 'footer',
    title: 'Footer',
    items: [],
  },
};

export const PAGES = [
  {
    __typename: 'Page',
    id: 'gid://shopify/Page/1',
    handle: 'size-guide',
    title: 'Size Guide',
    body: '<p>Mock page content: sizing information would be managed in Shopify → Online Store → Pages.</p>',
    bodySummary: 'Sizing information',
    seo: {__typename: 'SEO', title: null, description: null},
    createdAt: new Date(NOW - 100 * DAY).toISOString(),
    updatedAt: new Date(NOW - 10 * DAY).toISOString(),
    onlineStoreUrl: null,
    trackingParameters: null,
  },
];

const article = (n, title, ageDays) => ({
  __typename: 'Article',
  id: `gid://shopify/Article/${n}`,
  handle: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  title,
  contentHtml: `<p>Mock article body for “${title}”. In production, write articles in Shopify → Online Store → Blog posts.</p>`,
  content: `Mock article body for ${title}.`,
  excerpt: 'A sample article from the mock blog.',
  excerptHtml: '<p>A sample article from the mock blog.</p>',
  publishedAt: new Date(NOW - ageDays * DAY).toISOString(),
  author: {__typename: 'ArticleAuthor', name: 'Sample Author'},
  authorV2: {__typename: 'ArticleAuthor', name: 'Sample Author'},
  image: image(`article-${n}|${PALETTES[n % 8][0]}|${PALETTES[n % 8][1]}`, title, 1600, 1066),
  seo: {__typename: 'SEO', title: null, description: null},
  tags: [],
  onlineStoreUrl: null,
  trackingParameters: null,
});
export const BLOGS = [
  {
    __typename: 'Blog',
    id: 'gid://shopify/Blog/1',
    handle: 'journal',
    title: 'Journal',
    seo: {__typename: 'SEO', title: null, description: null},
    onlineStoreUrl: null,
    _articles: [
      article(1, 'How to care for linen', 4),
      article(2, 'Setting a slow-morning table', 12),
      article(3, 'Inside the kiln studio', 30),
    ],
  },
];
for (const blog of BLOGS) for (const a of blog._articles) a.blog = blog;

const field = (key, value, type = 'single_line_text_field', reference = null) => ({
  __typename: 'MetaobjectField',
  key,
  type,
  value,
  reference,
});
const mediaImageRef = (img) => ({__typename: 'MediaImage', id: `gid://shopify/MediaImage/${img.id.split('/').pop()}`, image: img, alt: img.altText, mediaContentType: 'IMAGE', previewImage: img});

export const METAOBJECTS = {
  testimonial: [
    ['The linen overshirt is the best thing I bought this year — it gets softer every wash.', 'Sample customer A.', 'Portland, OR', '5'],
    ['Beautiful packaging, fast delivery and the pour-over set is stunning.', 'Sample customer B.', 'Austin, TX', '5'],
    ['Customer service sorted my exchange in a day. Will shop again.', 'Sample customer C.', 'Brooklyn, NY', '4'],
  ].map(([quote, author, location, rating], i) => ({
    __typename: 'Metaobject',
    id: `gid://shopify/Metaobject/t${i}`,
    handle: `testimonial-${i}`,
    type: 'testimonial',
    updatedAt: new Date(NOW).toISOString(),
    fields: [field('quote', quote, 'multi_line_text_field'), field('author', author), field('location', location), field('rating', rating, 'number_integer')],
  })),
  faq_item: [
    ['How long does shipping take?', 'Mock answer: delivery estimates are shown at checkout based on your address.', 'Shipping'],
    ['Do you ship internationally?', 'Mock answer: international shipping depends on Shopify Markets configuration.', 'Shipping'],
    ['Can I return an item?', 'Mock answer: see the refund policy for eligibility and timelines.', 'Returns'],
    ['Which payment methods do you accept?', 'Mock answer: available methods are shown at Shopify checkout.', 'Payments'],
    ['How do I care for linen?', 'Mock answer: machine wash cold, line dry.', 'Products'],
  ].map(([q, a, c], i) => ({
    __typename: 'Metaobject',
    id: `gid://shopify/Metaobject/f${i}`,
    handle: `faq-${i}`,
    type: 'faq_item',
    updatedAt: new Date(NOW).toISOString(),
    fields: [field('question', q), field('answer', a, 'multi_line_text_field'), field('category', c)],
  })),
  promo_banner: [
    ['The home edit', 'Ceramics, textiles and light for slower days.', '/collections/home', 'Shop home'],
    ['Built to carry', 'Waxed canvas and leather goods that age beautifully.', '/collections/accessories', 'Shop accessories'],
  ].map(([h, b, url, label], i) => {
    const img = image(`promo-${i}|${PALETTES[i + 2][1]}|${PALETTES[i + 2][0]}`, h, 1600, 1100);
    return {
      __typename: 'Metaobject',
      id: `gid://shopify/Metaobject/p${i}`,
      handle: `promo-${i}`,
      type: 'promo_banner',
      updatedAt: new Date(NOW).toISOString(),
      fields: [field('heading', h), field('body', b, 'multi_line_text_field'), field('cta_url', url, 'url'), field('cta_label', label), field('image', img.id, 'file_reference', mediaImageRef(img))],
    };
  }),
  social_post: Array.from({length: 6}, (_, i) => {
    const img = image(`social-${i}|${PALETTES[i][0]}|${PALETTES[i][1]}`, `Sample social post ${i + 1}`, 1000, 1000);
    return {
      __typename: 'Metaobject',
      id: `gid://shopify/Metaobject/s${i}`,
      handle: `social-${i}`,
      type: 'social_post',
      updatedAt: new Date(NOW).toISOString(),
      fields: [field('image', img.id, 'file_reference', mediaImageRef(img)), field('caption', `Sample post ${i + 1}`)],
    };
  }),
  hero_slide: [],
};

/** Valid discount codes in the mock (for e2e tests). */
export const DISCOUNT_CODES = {WELCOME10: 0.1};
