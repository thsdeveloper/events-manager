export class ContentService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getSite() {
        return this.repository.getSite();
    }
    getPage(permalink, postPage = 1) {
        return this.repository.getPage(permalink, postPage);
    }
    getPost(slug) {
        return this.repository.getPost(slug);
    }
    listPosts(limit, page) {
        return this.repository.listPosts(limit, page);
    }
    getRedirects() {
        return this.repository.getRedirects();
    }
    search(query) {
        if (query.length < 2)
            return Promise.resolve({ pages: [], posts: [], events: [] });
        return this.repository.search(query);
    }
}
//# sourceMappingURL=content-service.js.map