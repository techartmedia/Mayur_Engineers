import { getInvoiceById } from '@/lib/actions/invoices';
import { notFound } from 'next/navigation';
import InvoiceDetailClient from './InvoiceDetailClient';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice} />;
}
