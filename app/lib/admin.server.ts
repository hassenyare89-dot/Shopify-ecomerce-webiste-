/**
 * Minimal, server-only Shopify Admin GraphQL client.
 *
 * SECURITY:
 *  - The Admin token (PRIVATE_ADMIN_API_TOKEN) is a server-side secret from a
 *    custom app with the *minimum* scopes needed (see docs/SHOPIFY_SETUP.md).
 *    It is never sent to the browser and never logged.
 *  - Only used by specific, rate-limited server actions.
 */
export class AdminApiNotConfiguredError extends Error {}

export interface AdminClientEnv {
  PRIVATE_ADMIN_API_TOKEN?: string;
  SHOPIFY_STORE_MYSHOPIFY_DOMAIN?: string;
  ADMIN_API_VERSION?: string;
}

export function createAdminClient(env: AdminClientEnv) {
  const token = env.PRIVATE_ADMIN_API_TOKEN;
  const domain = env.SHOPIFY_STORE_MYSHOPIFY_DOMAIN;
  const version = env.ADMIN_API_VERSION || '2026-04';

  const configured = Boolean(token && domain && /^[a-z0-9-]+\.myshopify\.com$/.test(domain));

  async function request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    if (!configured) throw new AdminApiNotConfiguredError('Admin API is not configured');
    const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token!,
      },
      body: JSON.stringify({query, variables}),
    });
    if (response.status === 429) throw new Error('Admin API throttled');
    if (!response.ok) throw new Error(`Admin API error ${response.status}`);
    const json = (await response.json()) as {data?: T; errors?: Array<{message: string}>};
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
    return json.data as T;
  }

  return {configured, request};
}

// Admin API documents are intentionally untagged (no `#graphql`) so Storefront
// codegen does not validate them against the Storefront schema.
type UserError = {field?: string[] | null; message: string};

/**
 * Records explicit email marketing consent for an email address in Shopify
 * (creates the customer if needed). Requires `write_customers` + `read_customers`.
 */
export async function subscribeEmailInShopify(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<'subscribed' | 'already_subscribed'> {
  const consent = {
    marketingState: 'SUBSCRIBED',
    marketingOptInLevel: 'SINGLE_OPT_IN',
    consentUpdatedAt: new Date().toISOString(),
  };

  const created = await admin.request<{
    customerCreate: {customer: {id: string} | null; userErrors: UserError[]};
  }>(
    `
      mutation NewsletterCustomerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }`,
    {input: {email, emailMarketingConsent: consent, tags: ['newsletter', 'headless-storefront']}},
  );

  if (created.customerCreate.customer) return 'subscribed';

  const taken = created.customerCreate.userErrors.some((e) => /taken|already/i.test(e.message));
  if (!taken) {
    throw new Error(created.customerCreate.userErrors.map((e) => e.message).join('; ') || 'customerCreate failed');
  }

  // Existing customer: look them up and update consent.
  const found = await admin.request<{
    customers: {nodes: Array<{id: string; emailMarketingConsent: {marketingState: string} | null}>};
  }>(
    `
      query NewsletterCustomerLookup($query: String!) {
        customers(first: 1, query: $query) {
          nodes { id emailMarketingConsent { marketingState } }
        }
      }`,
    {query: `email:"${email.replace(/["\\]/g, '')}"`},
  );
  const customer = found.customers.nodes[0];
  if (!customer) throw new Error('Customer lookup failed');
  if (customer.emailMarketingConsent?.marketingState === 'SUBSCRIBED') return 'already_subscribed';

  const updated = await admin.request<{
    customerEmailMarketingConsentUpdate: {userErrors: UserError[]};
  }>(
    `
      mutation NewsletterConsentUpdate($input: CustomerEmailMarketingConsentUpdateInput!) {
        customerEmailMarketingConsentUpdate(input: $input) {
          userErrors { field message }
        }
      }`,
    {input: {customerId: customer.id, emailMarketingConsent: consent}},
  );
  if (updated.customerEmailMarketingConsentUpdate.userErrors.length) {
    throw new Error(updated.customerEmailMarketingConsentUpdate.userErrors.map((e) => e.message).join('; '));
  }
  return 'subscribed';
}

/** Subscribes a profile to a Klaviyo list (server-side, private key). */
export async function subscribeEmailInKlaviyo(
  env: {KLAVIYO_PRIVATE_API_KEY?: string; KLAVIYO_LIST_ID?: string},
  email: string,
  source: string,
) {
  if (!env.KLAVIYO_PRIVATE_API_KEY || !env.KLAVIYO_LIST_ID) {
    throw new AdminApiNotConfiguredError('Klaviyo is not configured');
  }
  const response = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${env.KLAVIYO_PRIVATE_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
      revision: '2025-10-15',
    },
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          custom_source: `Headless storefront (${source})`,
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email,
                  subscriptions: {email: {marketing: {consent: 'SUBSCRIBED'}}},
                },
              },
            ],
          },
        },
        relationships: {list: {data: {type: 'list', id: env.KLAVIYO_LIST_ID}}},
      },
    }),
  });
  if (!response.ok) throw new Error(`Klaviyo error ${response.status}`);
}
