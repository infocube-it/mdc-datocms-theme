import '../globals.css';
import { core } from '@/site/core';

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  const label = await core.labelsFor(locale);

  // `lang` is the content's locale, even when Labels fall back to another one.
  return (
    <html lang={locale}>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only">
          {label('skipToContent')}
        </a>
        <main id="content">{children}</main>
      </body>
    </html>
  );
}
