import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/account.profile';
import {Button} from '~/components/ui/Button';
import {Field, Notice} from '~/components/ui/primitives';
import {sanitizeText} from '~/lib/security';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => [{title: 'Profile'}, {name: 'robots', content: 'noindex'}];

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ['firstName', 'lastName'] as const;
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key as (typeof validInputKeys)[number]] = sanitizeText(value, 100);
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl">Profile &amp; settings</h2>
      <Form method="PUT" className="max-w-xl space-y-5 rounded-brand border border-border p-6">
        <fieldset className="space-y-5">
          <legend className="mb-2 font-semibold">Personal information</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" name="firstName" autoComplete="given-name" defaultValue={customer.firstName ?? ''} minLength={2} maxLength={100} />
            <Field label="Last name" name="lastName" autoComplete="family-name" defaultValue={customer.lastName ?? ''} minLength={2} maxLength={100} />
          </div>
        </fieldset>
        {action?.error ? <Notice tone="error">{action.error}</Notice> : null}
        {action && !action.error ? <Notice tone="success">Profile updated.</Notice> : null}
        <Button type="submit" loading={state !== 'idle'}>
          Save changes
        </Button>
      </Form>

      <section className="max-w-xl space-y-3 rounded-brand border border-border p-6 text-sm">
        <h3 className="font-body text-base font-semibold tracking-normal">Sign-in &amp; email</h3>
        <p>
          <span className="text-muted">Email: </span>
          {customer.emailAddress?.emailAddress ?? '—'}
        </p>
        <p className="text-muted">
          Your sign-in is managed securely by Shopify using one-time email codes, so there’s no password to manage.
          Marketing emails:{' '}
          <strong className="text-foreground">
            {customer.emailAddress?.marketingState === 'SUBSCRIBED' ? 'subscribed' : 'not subscribed'}
          </strong>
          . You can unsubscribe at any time from any marketing email.
        </p>
      </section>

      <section className="max-w-xl space-y-2 rounded-brand border border-border p-6 text-sm">
        <h3 className="font-body text-base font-semibold tracking-normal">Your privacy</h3>
        <p className="text-muted">
          To request a copy of your data or ask us to delete it, contact us — see our{' '}
          <a href="/policies/privacy-policy" className="underline">
            Privacy Policy
          </a>{' '}
          for your rights.
        </p>
      </section>
    </div>
  );
}
