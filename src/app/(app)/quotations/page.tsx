import { getQuotations } from '@/lib/actions/quotations';
import QuotationsClient from './QuotationsClient';

export const dynamic = 'force-dynamic';

export default async function QuotationsPage() {
  const quoteList = await getQuotations();
  return <QuotationsClient initialQuotations={quoteList} />;
}
