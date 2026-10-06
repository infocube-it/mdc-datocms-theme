import { draftMode } from 'next/headers';
import '../globals.css';
import { core } from '@/site/core';

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  const label = await core.labelsFor(locale);
  const isDraftMode = (await draftMode()).isEnabled;

  // `lang` is the content's locale, even when Labels fall back to another one.
  return (
    <html lang={locale}>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only">
          {label('skipToContent')}
        </a>
        <main id="content">
          {isDraftMode && (
            <p>
              <a href="/api/draft/disable">{label('exitDraftMode')}</a>
            </p>
          )}
          {children}
        </main>
      </body>
    </html>
  );
}
