import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {
  AddressFragment,
  CustomerFragment,
} from 'customer-accountapi.generated';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type Fetcher,
} from 'react-router';
import type {Route} from './+types/account.addresses';
import {useId} from 'react';
import {Button} from '~/components/ui/Button';
import {Icon} from '~/components/ui/Icon';
import {Badge, Field, Notice} from '~/components/ui/primitives';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: Route.MetaFunction = () => [{title: 'Addresses'}, {name: 'robots', content: 'noindex'}];

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address: CustomerAddressInput = {};
    const keys: (keyof CustomerAddressInput)[] = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl">Addresses</h2>
      {addresses.nodes.length ? (
        <ExistingAddresses addresses={addresses} defaultAddress={defaultAddress} />
      ) : (
        <p className="text-muted">You have no saved addresses.</p>
      )}
      <details className="group rounded-brand border border-border" open={!addresses.nodes.length}>
        <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-semibold [&::-webkit-details-marker]:hidden">
          Add a new address
          <Icon name="plus" className="size-4 transition group-open:rotate-45" />
        </summary>
        <div className="border-t border-border p-5">
          <NewAddressForm key={addresses.nodes.length} />
        </div>
      </details>
    </div>
  );
}

function NewAddressForm() {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: 'US',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  } as CustomerAddressInput;

  return (
    <AddressForm addressId="NEW_ADDRESS_ID" address={newAddress} defaultAddress={null}>
      {({stateForMethod}) => (
        <Button type="submit" formMethod="POST" loading={stateForMethod('POST') !== 'idle'}>
          Save address
        </Button>
      )}
    </AddressForm>
  );
}

function ExistingAddresses({addresses, defaultAddress}: Pick<CustomerFragment, 'addresses' | 'defaultAddress'>) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {addresses.nodes.map((address) => (
        <li key={address.id} className="rounded-brand border border-border">
          <div className="p-5 text-sm">
            {defaultAddress?.id === address.id ? <Badge className="mb-3">Default</Badge> : null}
            <address className="not-italic">
              {address.formatted.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
          <details className="group border-t border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Edit
              <Icon name="chevronDown" className="size-4 transition group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5">
              <AddressForm addressId={address.id} address={address} defaultAddress={defaultAddress}>
                {({stateForMethod}) => (
                  <div className="flex gap-2">
                    <Button type="submit" formMethod="PUT" size="sm" loading={stateForMethod('PUT') !== 'idle'}>
                      Save
                    </Button>
                    <Button type="submit" formMethod="DELETE" size="sm" variant="ghost" loading={stateForMethod('DELETE') !== 'idle'}>
                      Delete
                    </Button>
                  </div>
                )}
              </AddressForm>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

export function AddressForm({
  addressId,
  address,
  defaultAddress,
  children,
}: {
  addressId: AddressFragment['id'];
  address: CustomerAddressInput;
  defaultAddress: CustomerFragment['defaultAddress'];
  children: (props: {stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state']}) => React.ReactNode;
}) {
  const {state, formMethod} = useNavigation();
  const action = useActionData<ActionResponse>();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  const checkboxId = useId();
  return (
    <Form id={addressId} className="space-y-4">
      <input type="hidden" name="addressId" defaultValue={addressId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" defaultValue={address?.firstName ?? ''} required />
        <Field label="Last name" name="lastName" autoComplete="family-name" defaultValue={address?.lastName ?? ''} required />
      </div>
      <Field label="Company" name="company" autoComplete="organization" defaultValue={address?.company ?? ''} />
      <Field label="Address" name="address1" autoComplete="address-line1" defaultValue={address?.address1 ?? ''} required />
      <Field label="Apartment, suite, etc." name="address2" autoComplete="address-line2" defaultValue={address?.address2 ?? ''} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="city" autoComplete="address-level2" defaultValue={address?.city ?? ''} required />
        <Field label="State / Province code" name="zoneCode" autoComplete="address-level1" defaultValue={address?.zoneCode ?? ''} placeholder="CA" required />
        <Field label="ZIP / Postal code" name="zip" autoComplete="postal-code" defaultValue={address?.zip ?? ''} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Country code"
          name="territoryCode"
          autoComplete="country"
          defaultValue={address?.territoryCode ?? ''}
          placeholder="US"
          maxLength={2}
          required
          hint="Two-letter ISO code, e.g. US"
        />
        <Field
          label="Phone"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          defaultValue={address?.phoneNumber ?? ''}
          placeholder="+16135551111"
          pattern="^\+?[1-9]\d{3,14}$"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <input defaultChecked={isDefaultAddress} id={checkboxId} name="defaultAddress" type="checkbox" className="size-4 accent-[var(--brand-primary)]" />
        <label htmlFor={checkboxId}>Set as default address</label>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {children({stateForMethod: (method) => (formMethod === method ? state : 'idle')})}
    </Form>
  );
}
