import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/ui/NotificationProvider';

export const metadata: Metadata = {
  title: 'Mayur Engineers – GST Billing Lite',
  description: 'Lightweight GST billing, quotations, and invoicing system for Mayur Engineers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
