import type { AppUser } from './domain.js';
export interface ProfileChecklistItem {
    id: 'name' | 'avatar' | 'birth_date' | 'document' | 'phone' | 'phone_verified' | 'location' | 'description';
    label: string;
    complete: boolean;
}
/**
 * O que significa "cadastro completo". A lista alimenta a porcentagem do perfil
 * no front e a regra da API que só deixa virar organizador com tudo preenchido,
 * então os dois lados sempre concordam sobre o que falta.
 */
export declare function getProfileChecklist(user: AppUser): ProfileChecklistItem[];
export declare function getProfileCompletion(user: AppUser): number;
export declare function isProfileComplete(user: AppUser): boolean;
//# sourceMappingURL=profile.d.ts.map