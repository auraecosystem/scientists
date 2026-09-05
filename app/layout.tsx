import type { ReactNode } from 'react';
import ServiceWorkerRegister from './sw-register';

export const metadata = {
  title: 'Scientists',
  description: 'Aura Scientists AI runtime',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
