import { ApiError } from '../../shared/errors.js';
export class OrganizerService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getProfile(organizerId) {
        return this.repository.findById(organizerId);
    }
    async create(userId, input, initialStatus) {
        const organizer = await this.repository.create(userId, normalizeWebsite(input), initialStatus);
        if (organizer === 'exists') {
            throw new ApiError('Já existe uma solicitação ou perfil para este usuário.', 409, 'ORGANIZER_EXISTS');
        }
        return organizer;
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