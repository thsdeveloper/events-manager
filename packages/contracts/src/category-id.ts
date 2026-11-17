import { z } from 'zod';

/**
 * IDs do catálogo são UUIDs do PostgreSQL, incluindo os IDs determinísticos
 * do seed anterior ao Zod 4. GUID valida o formato hexadecimal 8-4-4-4-12 sem
 * exigir bits de versão/variante RFC que esses registros existentes não têm.
 */
export const categoryIdSchema = z.guid({ error: 'Selecione uma categoria válida.' });
