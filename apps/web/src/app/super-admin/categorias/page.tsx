import { fetchEventCategories } from '@/features/super-admin/api/server';
import { CategoryManager } from '@/features/super-admin/components/CategoryManager';

export default async function CategoriesPage() {
  const { data } = await fetchEventCategories();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-violet-700">Catálogo da plataforma</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Categorias de evento</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Estas categorias alimentam a etapa &ldquo;Básico&rdquo; do cadastro de eventos e a navegação pública. O ícone e
          a cor definidos aqui são os mesmos que o organizador vê ao escolher.
        </p>
      </header>
      <CategoryManager initialCategories={data} />
    </div>
  );
}
