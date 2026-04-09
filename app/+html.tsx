import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every page in the web app.
 * It's particularly useful for adding PWA meta tags and other global web configurations.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA: iOS Specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Settlr" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* PWA: Theme Color for Chrome/Android */}
        <meta name="theme-color" content="#0A0A0A" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackgroundStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackgroundStyles = `
body {
  background-color: #FAFAFA;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0A0A0A;
  }
}
`;
