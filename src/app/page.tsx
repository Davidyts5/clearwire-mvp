import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to the AP dashboard for MVP demo purposes
  redirect('/dashboard');
}