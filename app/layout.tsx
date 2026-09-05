import type { ReactNode } from 'react';

export const metadata = { title: 'Scientists', description: 'Aura Scientists AI runtime' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
