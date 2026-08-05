import type { PageBlock } from '@events-manager/contracts';
import PageBuilder from '@/components/layout/PageBuilder';

interface PageClientProps {
  sections: PageBlock[];
}

export default function PageClient({ sections }: PageClientProps) {
  return <PageBuilder sections={sections} />;
}
