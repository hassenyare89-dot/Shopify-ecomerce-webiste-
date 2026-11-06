import {redirect} from 'react-router';

/** Friendly URL → Shopify-managed policy (Settings → Policies). */
export function loader() {
  return redirect('/policies/terms-of-service', 301);
}
