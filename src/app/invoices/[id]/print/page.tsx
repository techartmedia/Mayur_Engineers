import { getInvoiceById } from '@/lib/actions/invoices';
import { notFound } from 'next/navigation';
import PrintableInvoice from '@/components/printable/PrintableInvoice';
import PrintTrigger from './PrintTrigger';

export const dynamic = 'force-dynamic';

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen p-4 sm:p-8">
      <PrintTrigger />
      <PrintableInvoice invoice={invoice} items={invoice.items || []} />
    </div>
  );
}
