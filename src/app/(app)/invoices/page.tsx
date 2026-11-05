import { getInvoices } from '@/lib/actions/invoices';
import InvoicesClient from './InvoicesClient';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoiceList = await getInvoices();
  return <InvoicesClient initialInvoices={invoiceList} />;
}
