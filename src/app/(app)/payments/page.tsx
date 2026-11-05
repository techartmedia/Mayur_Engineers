import { getPayments } from '@/lib/actions/payments';
import PaymentsClient from './PaymentsClient';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const paymentList = await getPayments();
  return <PaymentsClient initialPayments={paymentList} />;
}
