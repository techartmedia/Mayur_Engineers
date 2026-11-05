import { getCustomers } from '@/lib/actions/customers';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const customerList = await getCustomers();
  return <CustomersClient initialCustomers={customerList} />;
}
