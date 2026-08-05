import OpenAI from 'openai';
import { z } from 'zod';
import { requireOrganizer } from '../application/auth/organizer-context.js';
import { ApiError } from '../shared/errors.js';
export async function externalRoutes(app, options) {
    const { env, clients } = options;
    app.get('/api/places/search', async (request) => {
        const { input } = z.object({ input: z.string().default('') }).parse(request.query);
        if (!input)
            return { predictions: [] };
        if (!env.GOOGLE_PLACES_API_KEY)
            return { predictions: [] };
        const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
        url.searchParams.set('input', input);
        url.searchParams.set('language', 'pt-BR');
        url.searchParams.set('types', 'geocode');
        url.searchParams.set('key', env.GOOGLE_PLACES_API_KEY);
        const response = await fetch(url);
        if (!response.ok)
            throw new ApiError('Falha ao consultar o serviço de endereços.', 502, 'PLACES_ERROR');
        const data = await response.json();
        return { predictions: (data.predictions ?? []).map((item) => ({ placeId: item.place_id, description: item.description, mainText: item.structured_formatting?.main_text ?? item.description, secondaryText: item.structured_formatting?.secondary_text ?? null })) };
    });
    app.post('/api/ai/generate-cover', async (request) => {
        const context = await requireOrganizer(request, clients);
        if (!env.OPENAI_API_KEY)
            throw new ApiError('OpenAI não está configurada.', 503, 'OPENAI_NOT_CONFIGURED');
        const input = z.object({ title: z.string().trim().min(1), short_description: z.string().optional(), description: z.string().optional(), categoryId: z.string().uuid().optional() }).parse(request.body);
        const { data: category } = input.categoryId ? await clients.admin.from('event_categories').select('name,description').eq('id', input.categoryId).maybeSingle() : { data: null };
        const prompt = `Create a professional 16:9 landscape event cover for "${input.title}". ${input.short_description ?? input.description ?? ''} ${category ? `Theme: ${category.name}. ${category.description ?? ''}` : ''} Use a clean cinematic composition, leave room for overlay text, and do not render words, letters, logos, or recognizable faces.`;
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
        const generated = await openai.images.generate({ model: 'gpt-image-1', prompt, n: 1, size: '1536x1024', quality: 'high' });
        const base64 = generated.data?.[0]?.b64_json;
        if (!base64)
            throw new ApiError('A geração não retornou uma imagem.', 502, 'IMAGE_GENERATION_FAILED');
        const buffer = Buffer.from(base64, 'base64');
        const path = `${context.user.id}/ai/event-cover-${crypto.randomUUID()}.png`;
        const { error: uploadError } = await clients.admin.storage.from('media').upload(path, buffer, { contentType: 'image/png' });
        if (uploadError)
            throw uploadError;
        const { data: file, error: fileError } = await clients.admin.from('media_files').insert({ bucket: 'media', path, filename: path.split('/').at(-1), title: input.title, type: 'image/png', filesize: buffer.length, uploaded_by: context.user.id, metadata: { generated: true, prompt } }).select('*').single();
        if (fileError)
            throw fileError;
        const { data: publicUrl } = clients.public.storage.from('media').getPublicUrl(path);
        return { fileId: file.id, assetUrl: publicUrl.publicUrl, generatedPrompt: prompt, category };
    });
}
//# sourceMappingURL=external.js.map