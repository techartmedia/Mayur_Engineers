import { getBusinessProfile } from '@/lib/actions/settings';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const profile = await getBusinessProfile();
  return <SettingsClient profile={profile} />;
}
