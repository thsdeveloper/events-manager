/**
 * Sanitizador de HTML por lista de permissão, compartilhado entre API e web.
 *
 * O conteúdo editorial (blocos de texto rico, posts) é escrito por superadmins
 * no painel e renderizado como HTML na página pública. Mesmo vindo de pessoas
 * de confiança, o HTML passa por aqui na gravação e na leitura: um editor
 * comprometido, um copiar-e-colar de outro site ou um bug no editor nunca
 * podem injetar script na home. A abordagem é reconstruir a saída apenas com
 * o que é conhecido, em vez de tentar remover o que é perigoso.
 */
export declare function sanitizeHtml(html: string | null | undefined): string;
//# sourceMappingURL=html-sanitizer.d.ts.map