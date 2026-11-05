import { getSalesReport } from '@/lib/actions/reports';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const invoiceList = await getSalesReport();
  return <ReportsClient invoices={invoiceList} />;
}
