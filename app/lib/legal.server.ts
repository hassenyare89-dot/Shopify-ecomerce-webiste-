import type {Storefront} from '@shopify/hydrogen';
import {LEGAL_DOCUMENTS} from '~/content/legal';

/**
 * Loads a legal/editorial page: a Shopify Page with the same handle wins;
 * otherwise the bundled template is used.
 */
export async function loadLegalPage(storefront: Storefront, handle: keyof typeof LEGAL_DOCUMENTS) {
  const {page} = await storefront.query(LEGAL_PAGE_QUERY, {
    variables: {handle},
    cache: storefront.CacheLong(),
  });
  if (page) return {source: 'shopify' as const, page, template: null};
  return {source: 'template' as const, page: null, template: LEGAL_DOCUMENTS[handle]};
}

export const LEGAL_PAGE_QUERY = `#graphql
  query LegalPage($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    page(handle: $handle) {
      id
      handle
      title
      body
      updatedAt
      seo {
        title
        description
      }
    }
  }
` as const;
