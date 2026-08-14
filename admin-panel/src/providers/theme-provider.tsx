'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      storageKey="vite-theme"
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}