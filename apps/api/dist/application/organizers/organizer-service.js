import { ApiError } from '../../shared/errors.js';
function detailsFromProfile(profile) {
    if (!profile.document) {
        throw new ApiError('Cadastre e valide seu CPF no perfil antes de continuar.', 422, 'PROFILE_DOCUMENT_REQUIRED');
    }
    if (!profile.first_name || !profile.last_name || !profile.email || !profile.phone) {
        throw new ApiError('Complete nome, e-mail e telefone no seu perfil antes de continuar.', 422, 'PROFILE_INCOMPLETE');
    }
    return {
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: profile.phone,
        document: profile.document,
    };
}
export class OrganizerService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getProfile(organizerId) {
        return this.repository.findById(organizerId);
    }
    /**
     * Regras do cadastro: uma conta de organizador por pessoa; quem vende como
     * pessoa física usa o CPF já validado no perfil (o cliente não escolhe o
     * documento); quem vende como empresa informa um CNPJ que ainda não pertence
     * a outra organização.
     */
    /**
     * Regras do cadastro: uma conta de organizador por pessoa; pessoa física
     * vende com os dados já validados no perfil (nome, e-mail, telefone e CPF),
     * ignorando qualquer valor enviado pelo cliente; empresa informa os dados
     * da organização e um CNPJ válido e único.
     */
    async create(userId, input, initialStatus, context) {
        if (await this.repository.existsForUser(userId)) {
            throw new ApiError('Você já possui uma conta de organizador.', 409, 'ORGANIZER_EXISTS');
        }
        const details = input.account_type === 'individual' ? detailsFromProfile(context.profile) : await this.detailsFromCompany(input);
        const organizer = await this.repository.create(userId, normalizeWebsite({
            ...details,
            description: input.description ?? null,
            website: input.website ?? null,
        }), initialStatus);
        if (organizer === 'exists') {
            throw new ApiError('Você já possui uma conta de organizador.', 409, 'ORGANIZER_EXISTS');
        }
        return organizer;
    }
    async detailsFromCompany(input) {
        const owner = await this.repository.findByDocument(input.document);
        if (owner)
            throw new ApiError('Este CNPJ já está vinculado a outra organização.', 409, 'DOCUMENT_IN_USE');
        return { name: input.name, email: input.email, phone: input.phone, document: input.document };
    }
    async update(organizerId, input) {
        const organizer = await this.repository.updateById(organizerId, normalizeWebsite(input));
        if (!organizer)
            throw new ApiError('Perfil de organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
        return organizer;
    }
    setLogo(organizerId, mediaId) {
        return this.repository.setLogo(organizerId, mediaId);
    }
    stats(organizerId) {
        return this.repository.stats(organizerId);
    }
    updatePayout(organizerId, input) {
        return this.repository.updatePayout(organizerId, input);
    }
}
function normalizeWebsite(input) {
    return { ...input, ...(input.website !== undefined ? { website: input.website || null } : {}) };
}
//# sourceMappingURL=organizer-service.js.map