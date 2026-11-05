import { getCustomers } from '@/lib/actions/customers';
import { getProducts } from '@/lib/actions/products';
import { getBusinessProfile } from '@/lib/actions/settings';
import NewQuotationClient from './NewQuotationClient';

export const dynamic = 'force-dynamic';

export default async function NewQuotationPage() {
  const [customers, products, profile] = await Promise.all([
    getCustomers(),
    getProducts(),
    getBusinessProfile(),
  ]);

  return (
    <NewQuotationClient
      customers={customers}
      products={products}
      profile={profile}
    />
  );
}
