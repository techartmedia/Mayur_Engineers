import { getCustomers } from '@/lib/actions/customers';
import { getProducts } from '@/lib/actions/products';
import { getBusinessProfile } from '@/lib/actions/settings';
import NewInvoiceClient from './NewInvoiceClient';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  const [customers, products, profile] = await Promise.all([
    getCustomers(),
    getProducts(),
    getBusinessProfile(),
  ]);

  return (
    <NewInvoiceClient
      customers={customers}
      products={products}
      profile={profile}
    />
  );
}
