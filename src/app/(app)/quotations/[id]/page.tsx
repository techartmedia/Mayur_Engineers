import { getQuotationById } from '@/lib/actions/quotations';
import { notFound } from 'next/navigation';
import QuotationDetailClient from './QuotationDetailClient';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuotationById(id);

  if (!quote) {
    notFound();
  }

  return <QuotationDetailClient quotation={quote} />;
}
