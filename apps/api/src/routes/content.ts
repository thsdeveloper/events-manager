import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { readAccessToken, requireUser } from '../application/auth/session.js';
import { ContentService } from '../application/content/content-service.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { ApiError } from '../shared/errors.js';

export async function contentRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
  const { clients } = options;
  const content = new ContentService(clients.public);

  app.get('/api/content/site', () => content.getSite());

  app.get('/api/content/pages', async (request) => {
    const query = z.object({ permalink: z.string().default('/'), page: z.coerce.number().int().positive().default(1) }).parse(request.query);
    return content.getPage(query.permalink, query.page);
  });

  app.get('/api/content/posts/:slug', async (request) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    return content.getPost(slug);
  });

  app.get('/api/content/posts', async (request) => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(6), page: z.coerce.number().int().positive().default(1) }).parse(request.query);
    return content.listPosts(query.limit, query.page);
  });

  app.get('/api/content/redirects', () => content.getRedirects());

  app.get('/api/content/sitemap', async () => {
    const [pages, posts, events] = await Promise.all([
      clients.public.from('pages').select('permalink,published_at,date_updated').eq('status', 'published'),
      clients.public.from('posts').select('slug,published_at,date_updated').eq('status', 'published'),
      clients.public.from('events').select('slug,start_date,date_updated').eq('status', 'published'),
    ]);
    for (const result of [pages, posts, events]) if (result.error) throw result.error;
    return { pages: pages.data ?? [], posts: posts.data ?? [], events: events.data ?? [] };
  });

  app.post('/api/forms/:formId/submissions', async (request, reply) => {
    const { formId } = z.object({ formId: z.string().uuid() }).parse(request.params);
    const body = z.object({ values: z.array(z.object({ field: z.string().uuid(), value: z.string().optional(), file: z.string().uuid().optional() })) }).parse(request.body);
    const accessToken = readAccessToken(request);
    const userId = accessToken ? (await requireUser(request, clients)).user.id : null;
    const { data: submission, error } = await clients.admin
      .from('form_submissions')
      .insert({ form: formId, submitted_by: userId })
      .select('id')
      .single();
    if (error) throw error;
    const values = body.values.map((value, index) => ({ ...value, form_submission: submission.id, sort: index + 1 }));
    const { error: valuesError } = await clients.admin.from('form_submission_values').insert(values);
    if (valuesError) throw valuesError;
    return reply.code(201).send({ success: true, id: submission.id });
  });

  app.get('/api/search', async (request) => {
    const parsed = z.object({ q: z.string().optional(), search: z.string().optional() }).parse(request.query);
    const q = (parsed.q ?? parsed.search ?? '').trim();
    if (q.length < 2) return { pages: [], posts: [], events: [] };
    const pattern = `%${q}%`;
    const [pages, posts, events] = await Promise.all([
      clients.public.from('pages').select('id,title,permalink').eq('status', 'published').ilike('title', pattern).limit(10),
      clients.public.from('posts').select('id,title,slug,description').eq('status', 'published').ilike('title', pattern).limit(10),
      clients.public.from('events').select('id,title,slug,short_description').eq('status', 'published').ilike('title', pattern).limit(10),
    ]);
    for (const result of [pages, posts, events]) if (result.error) throw result.error;
    return { pages: pages.data ?? [], posts: posts.data ?? [], events: events.data ?? [] };
  });

  app.get('/api/event-config', async () => {
    const { data, error } = await clients.public.from('event_configurations').select('*').eq('id', 1).single();
    if (error) throw new ApiError('Configuração de eventos não encontrada.', 404, 'CONFIG_NOT_FOUND');
    return data;
  });
}
