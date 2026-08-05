import type { Globals, Navigation } from '@events-manager/contracts';
import type { ReactNode } from 'react';
import Footer from '@/components/layout/Footer';
import NavigationBar from '@/components/layout/NavigationBar';

interface SiteLayoutProps {
  headerNavigation: Navigation;
  footerNavigation: Navigation;
  globals: Globals;
  children: ReactNode;
}

export default function SiteLayout({ headerNavigation, footerNavigation, globals, children }: SiteLayoutProps) {
  return (
    <>
      <NavigationBar navigation={headerNavigation} globals={globals} />
      {children}
      <Footer navigation={footerNavigation} globals={globals} />
    </>
  );
}
