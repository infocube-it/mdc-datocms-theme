import '../globals.css';

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
