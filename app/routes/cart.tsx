import {Suspense} from 'react';
import {Await, useLoaderData, data, redirect, type HeadersFunction} from 'react-router';
import type {Route} from './+types/cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm, Analytics} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {ProductRail} from '~/components/ProductRail';
import {seoMeta} from '~/lib/seo';
import {sanitizeText} from '~/lib/security';
import {PRODUCT_CARD_FRAGMENT} from '~/lib/fragments';

export const meta: Route.MetaFunction = () =>
  seoMeta({title: 'Cart', noindex: true});

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

/**
 * All cart mutations go through Shopify's Cart API via Hydrogen's cart
 * handler. We never compute authoritative totals locally.
 */
export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const formData = await request.formData();
  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    return data({errors: [{message: 'No cart action provided'}]}, {status: 400});
  }

  const status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = sanitizeText(inputs.discountCode, 64);
      const discountCodes = formDiscountCode ? [formDiscountCode] : [];
      discountCodes.push(...((inputs.discountCodes as string[]) ?? []));
      result = await cart.updateDiscountCodes(
        Array.from(new Set(discountCodes)),
      );
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const code = sanitizeText(inputs.giftCardCode, 32);
      result = await cart.addGiftCardCodes(code ? [code] : []);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      result = await cart.removeGiftCardCodes(inputs.giftCardCodes as string[]);
      break;
    }
    case CartForm.ACTIONS.NoteUpdate: {
      result = await cart.updateNote(sanitizeText(inputs.note, 500));
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({...inputs.buyerIdentity});
      break;
    }
    default:
      return data(
        {errors: [{message: `${action} cart action is not supported`}]},
        {status: 400},
      );
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings, userErrors} = result;

  // "Buy now": send the shopper straight to Shopify's hosted checkout.
  const checkoutUrl = cartResult?.checkoutUrl;
  if (
    inputs.buyNow === '1' &&
    !errors?.length &&
    !userErrors?.length &&
    isAllowedCheckoutUrl(checkoutUrl)
  ) {
    // A real redirect Response so React Router performs a full-page
    // navigation to Shopify's (cross-origin) hosted checkout.
    return redirect(checkoutUrl, {status: 303, headers});
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      userErrors,
      analytics: {cartId},
    },
    {status, headers},
  );
}

/** Shopify checkout URLs are HTTPS; plain HTTP is only allowed for the local mock API. */
export function isAllowedCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart, storefront} = context;
  const cartData = await cart.get();
  const firstProductId = cartData?.lines?.nodes?.[0]?.merchandise?.product?.id;

  const recommendations = firstProductId
    ? storefront
        .query(CART_RECOMMENDATIONS_QUERY, {
          variables: {productId: firstProductId},
          cache: storefront.CacheShort(),
        })
        .then((r) => r.productRecommendations ?? [])
        .catch(() => [])
    : Promise.resolve([]);

  return {cart: cartData, recommendations};
}

export default function Cart() {
  const {cart, recommendations} = useLoaderData<typeof loader>();

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="mb-8 text-4xl md:text-5xl">Your cart</h1>
      <CartMain layout="page" cart={cart} />
      <Suspense fallback={null}>
        <Await resolve={recommendations}>
          {(products) =>
            products.length ? (
              <div className="mt-20">
                <ProductRail title="You may also like" products={products} />
              </div>
            ) : null
          }
        </Await>
      </Suspense>
      <Analytics.CartView />
    </div>
  );
}

const CART_RECOMMENDATIONS_QUERY = `#graphql
  query CartRecommendations(
    $productId: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: COMPLEMENTARY) {
      ...ProductCard
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;
