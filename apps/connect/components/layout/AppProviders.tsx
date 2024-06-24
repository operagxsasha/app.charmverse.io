import theme from '@connect/theme/theme';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <CssVarsProvider theme={theme}>{children}</CssVarsProvider>
    </AppRouterCacheProvider>
  );
}
