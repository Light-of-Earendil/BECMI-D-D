/**
 * BECMI D&D Character Manager - Forum Module
 * 
 * Handles forum category and thread listing views
 */

class ForumModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentCategoryId = null;
        this.currentPage = 1;
        this.categories = [];
        this.threads = [];
        
        console.log('Forum Module initialized');
    }
    
    /**
     * Render main forum view (category list)
     */
    async render() {
        try {
            // Load categories
            const response = await this.apiClient.get('/api/forum/categories/list.php');
            
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load categories');
            }
            
            this.categories = response.data.categories || [];
            
            const html = this.renderCategoryList();
            
            // Check if user is moderator and show moderation button
            // Use cached moderator status from app state (no API call needed)
            setTimeout(() => {
                const isModerator = this.app.state.user && this.app.state.user.is_moderator === true;
                if (isModerator) {
                    $('#forum-moderation-btn').show();
                } else {
                    $('#forum-moderation-btn').hide();
                }
            }, 100);
            
            return html;
            
        } catch (error) {
            console.error('Forum render error:', error);
            return `<div class="card">
                <h2>Error</h2>
                <p>Failed to load forum: ${error.message}</p>
            </div>`;
        }
    }
    
    /**
     * Render category list view
     */
    renderCategoryList() {
        if (this.categories.length === 0) {
            return `<div class="forum-container">
                <div class="forum-header">
                    <h1><i class="fas fa-comments"></i> Forum</h1>
                    <p>Community discussions and announcements</p>
                </div>
                <div class="card">
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>No categories available yet</p>
                    </div>
                </div>
            </div>`;
        }
        
        const categoriesHTML = this.categories.map(category => {
            const lastPostInfo = category.last_post ? 
                `<div class="category-last-post">
                    <span class="last-post-author">${category.last_post.author.username}</span>
                    <span class="last-post-time">${this.formatRelativeTime(category.last_post.created_at)}</span>
                </div>` : 
                '<div class="category-last-post"><span class="text-muted">No posts yet</span></div>';
            
            return `
                <div class="forum-category-item" data-category-id="${category.category_id}">
                    <div class="category-icon">
                        <i class="fas fa-folder${category.is_private ? '-lock' : ''}"></i>
                    </div>
                    <div class="category-content">
                        <div class="category-header">
                            <h3>
                                <a href="#" class="category-link" data-category-id="${category.category_id}">
                                    ${this.escapeHtml(category.category_name)}
                                </a>
                                ${category.is_private ? '<span class="badge badge-warning">Private</span>' : ''}
                            </h3>
                            <p class="category-description">${this.escapeHtml(category.category_description || '')}</p>
                        </div>
                        <div class="category-stats">
                            <span><i class="fas fa-comments"></i> ${category.thread_count} threads</span>
                            <span><i class="fas fa-reply"></i> ${category.post_count} posts</span>
                        </div>
                    </div>
                    <div class="category-last-activity">
                        ${lastPostInfo}
                    </div>
                </div>
            `;
        }).join('');
        
        return `<div class="forum-container">
            <div class="forum-header">
                <h1><i class="fas fa-comments"></i> Forum</h1>
                <div class="forum-actions">
                    <button class="btn btn-primary" id="forum-search-btn">
                        <i class="fas fa-search"></i> Search
                    </button>
                    <button class="btn btn-secondary" id="forum-moderation-btn" style="display: none;">
                        <i class="fas fa-shield-alt"></i> Moderation
                    </button>
                </div>
            </div>
            <div class="forum-categories">
                ${categoriesHTML}
            </div>
        </div>`;
    }
    
    /**
     * Render thread list for a category
     */
    async renderThreadList(categoryId, page = 1) {
        try {
            this.currentCategoryId = categoryId;
            this.currentPage = page;
            
            // Load category info
            const categoryResponse = await this.apiClient.get('/api/forum/categories/list.php');
            const category = categoryResponse.data.categories.find(c => c.category_id == categoryId);
            
            if (!category) {
                throw new Error('Category not found');
            }
            
            // Load threads
            const threadsResponse = await this.apiClient.get('/api/forum/threads/list.php', {
                category_id: categoryId,
                page: page,
                per_page: 20,
                sort_by: 'last_post_at',
                sort_order: 'DESC'
            });
            
            if (threadsResponse.status !== 'success') {
                throw new Error(threadsResponse.message || 'Failed to load threads');
            }
            
            this.threads = threadsResponse.data.threads || [];
            const pagination = threadsResponse.data.pagination || {};
            
            return this.generateThreadListHTML(category, this.threads, pagination);
            
        } catch (error) {
            console.error('Thread list render error:', error);
            return `<div class="card">
                <h2>Error</h2>
                <p>Failed to load threads: ${error.message}</p>
                <button class="btn btn-secondary" onclick="app.navigateToView('forum')">Back to Forum</button>
            </div>`;
        }
    }
    
    /**
     * Generate thread list HTML
     */
    generateThreadListHTML(category, threads, pagination) {
        const breadcrumb = `
            <div class="forum-breadcrumb">
                <a href="#" class="nav-link" data-view="forum">
                    <i class="fas fa-home"></i> Forum
                </a>
                <i class="fas fa-chevron-right"></i>
                <span>${this.escapeHtml(category.category_name)}</span>
            </div>
        `;
        
        const threadsHTML = threads.length === 0 ? 
            `<div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>No threads yet</p>
                <button class="btn btn-primary" id="create-thread-btn">
                    <i class="fas fa-plus"></i> Create First Thread
                </button>
            </div>` :
            threads.map(thread => {
                const stickyClass = thread.is_sticky ? 'thread-sticky' : '';
                const lockedIcon = thread.is_locked ? '<i class="fas fa-lock" title="Locked"></i>' : '';
                const stickyIcon = thread.is_sticky ? '<i class="fas fa-thumbtack" title="Sticky"></i>' : '';
                
                const lastPostInfo = thread.last_post ? 
                    `<div class="thread-last-post">
                        <span class="last-post-author">${thread.last_post.author.username}</span>
                        <span class="last-post-time">${this.formatRelativeTime(thread.last_post.created_at)}</span>
                    </div>` : 
                    '<div class="thread-last-post"><span class="text-muted">No replies</span></div>';
                
                return `
                    <div class="forum-thread-item ${stickyClass}" data-thread-id="${thread.thread_id}">
                        <div class="thread-icon">
                            ${stickyIcon} ${lockedIcon}
                        </div>
                        <div class="thread-content">
                            <h4>
                                <a href="#" class="thread-link" data-thread-id="${thread.thread_id}">
                                    ${this.escapeHtml(thread.thread_title)}
                                </a>
                            </h4>
                            <div class="thread-meta">
                                <span class="thread-author">
                                    <i class="fas fa-user"></i> ${this.escapeHtml(thread.author.username)}
                                </span>
                                <span class="thread-stats">
                                    <i class="fas fa-eye"></i> ${thread.view_count} views
                                    <i class="fas fa-reply"></i> ${thread.post_count} posts
                                </span>
                            </div>
                        </div>
                        <div class="thread-activity">
                            ${lastPostInfo}
                        </div>
                    </div>
                `;
            }).join('');
        
        const paginationHTML = this.generatePaginationHTML(pagination, category.category_id);
        
        return `<div class="forum-container">
            ${breadcrumb}
            <div class="forum-header">
                <h2><i class="fas fa-folder${category.is_private ? '-lock' : ''}"></i> ${this.escapeHtml(category.category_name)}</h2>
                <div class="forum-actions">
                    <button class="btn btn-primary" id="create-thread-btn">
                        <i class="fas fa-plus"></i> New Thread
                    </button>
                </div>
            </div>
            <div class="forum-threads">
                ${threadsHTML}
            </div>
            ${paginationHTML}
        </div>`;
    }
    
    /**
     * Generate pagination HTML
     */
    generatePaginationHTML(pagination, categoryId) {
        if (!pagination || pagination.total_pages <= 1) {
            return '';
        }
        
        const currentPage = pagination.page || 1;
        const totalPages = pagination.total_pages || 1;
        
        let paginationHTML = '<div class="forum-pagination">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm btn-secondary pagination-btn" 
                data-category-id="${categoryId}" 
                data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i> Previous
            </button>`;
        }
        
        // Page numbers
        const maxPages = 10;
        let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn btn-sm pagination-btn ${activeClass}" 
                data-category-id="${categoryId}" 
                data-page="${i}">${i}</button>`;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="btn btn-sm btn-secondary pagination-btn" 
                data-category-id="${categoryId}" 
                data-page="${currentPage + 1}">
                Next <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        paginationHTML += '</div>';
        
        return paginationHTML;
    }
    
    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Category link click
        $(document).on('click', '.category-link', async (e) => {
            e.preventDefault();
            const categoryId = $(e.currentTarget).data('category-id');
            await this.loadCategoryThreads(categoryId);
        });
        
        // Thread link click
        $(document).on('click', '.thread-link', async (e) => {
            e.preventDefault();
            const threadId = $(e.currentTarget).data('thread-id');
            if (this.app.modules.forumThread) {
                await this.app.modules.forumThread.loadThread(threadId);
            } else {
                this.app.showError('Thread view module not available');
            }
        });
        
        // Create thread button
        $(document).on('click', '#create-thread-btn', (e) => {
            e.preventDefault();
            if (this.app.modules.forumThread) {
                this.app.modules.forumThread.showCreateThreadModal(this.currentCategoryId);
            } else {
                this.app.showError('Thread view module not available');
            }
        });
        
        // Pagination buttons
        $(document).on('click', '.pagination-btn', async (e) => {
            e.preventDefault();
            const categoryId = $(e.currentTarget).data('category-id');
            const page = $(e.currentTarget).data('page');
            await this.loadCategoryThreads(categoryId, page);
        });
        
        // Search button
        $(document).on('click', '#forum-search-btn', (e) => {
            e.preventDefault();
            this.showSearchModal();
        });
        
        // Moderation button
        $(document).on('click', '#forum-moderation-btn', (e) => {
            e.preventDefault();
            if (this.app.modules.forumModeration) {
                this.app.navigateToView('forum-moderation');
            } else {
                this.app.showError('Moderation module not available');
            }
        });
    }
    
    /**
     * Load category threads
     */
    async loadCategoryThreads(categoryId, page = 1) {
        try {
            const content = await this.renderThreadList(categoryId, page);
            $('#content-area').html(content);
            this.app.currentView = 'forum-threads';
        } catch (error) {
            console.error('Failed to load category threads:', error);
            this.app.showError('Failed to load threads: ' + error.message);
        }
    }
    
    /**
     * Show search modal
     */
    async showSearchModal() {
        try {
            // Load categories for filter
            const categoriesResponse = await this.apiClient.get('/api/forum/categories/list.php');
            const categories = categoriesResponse.status === 'success' ? (categoriesResponse.data.categories || []) : [];
            
            const categoryOptions = categories.map(cat => 
                `<option value="${cat.category_id}">${this.escapeHtml(cat.category_name)}</option>`
            ).join('');
            
            // Create modal HTML
            const modalHtml = `
                <div class="modal show" id="forum-search-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-search"></i> Search Forum</h2>
                            <button type="button" class="close" id="close-forum-search-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <form id="forum-search-form">
                                <div class="form-group">
                                    <label for="search-query">Search Query</label>
                                    <input type="text" id="search-query" name="q" 
                                        placeholder="Enter search terms..." 
                                        minlength="2">
                                    <small class="form-help">Search in thread titles and post content (minimum 2 characters)</small>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="search-type">Search Type</label>
                                        <select id="search-type" name="type">
                                            <option value="all">All (Threads & Posts)</option>
                                            <option value="threads">Threads Only</option>
                                            <option value="posts">Posts Only</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="search-category">Category (Optional)</label>
                                        <select id="search-category" name="category_id">
                                            <option value="">All Categories</option>
                                            ${categoryOptions}
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-search"></i> Search
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-forum-search-modal">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                            
                            <div id="search-results" style="display: none; margin-top: var(--space-6);">
                                <h3>Search Results</h3>
                                <div id="search-results-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#forum-search-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Setup event handlers
            $('#close-forum-search-modal, #cancel-forum-search-modal').on('click', () => {
                $('#forum-search-modal').remove();
            });
            
            $('#forum-search-form').on('submit', async (e) => {
                e.preventDefault();
                await this.handleSearch();
            });
            
            // Close on background click
            $('#forum-search-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#forum-search-modal').remove();
                }
            });
            
        } catch (error) {
            console.error('Failed to show search modal:', error);
            this.app.showError('Failed to load search form: ' + error.message);
        }
    }
    
    /**
     * Handle search form submission
     */
    async handleSearch() {
        try {
            const query = $('#search-query').val().trim();
            const type = $('#search-type').val();
            const categoryId = $('#search-category').val() || null;
            
            if (!query && !categoryId) {
                this.app.showError('Please enter a search query or select a category');
                return;
            }
            
            if (query && query.length < 2) {
                this.app.showError('Search query must be at least 2 characters');
                return;
            }
            
            // Build search params
            const searchParams = {
                page: 1,
                per_page: 20
            };
            
            if (query) {
                searchParams.q = query;
            }
            
            if (type) {
                searchParams.type = type;
            }
            
            if (categoryId) {
                searchParams.category_id = categoryId;
            }
            
            // Perform search
            const response = await this.apiClient.get('/api/forum/search/search.php', searchParams);
            
            if (response.status !== 'success') {
                throw new Error(response.message || 'Search failed');
            }
            
            const data = response.data;
            
            // Display results - API returns { query, type, results: { threads, posts, pagination } }
            this.displaySearchResults(data.results || data);
            
        } catch (error) {
            console.error('Search error:', error);
            this.app.showError('Search failed: ' + error.message);
        }
    }
    
    /**
     * Display search results
     */
    displaySearchResults(results) {
        let resultsHTML = '';
        
        // Thread results
        if (results.threads && results.threads.length > 0) {
            resultsHTML += '<div class="search-results-section"><h4><i class="fas fa-folder"></i> Threads</h4>';
            resultsHTML += results.threads.map(thread => `
                <div class="search-result-item">
                    <h5>
                        <a href="#" class="thread-link" data-thread-id="${thread.thread_id}">
                            ${this.escapeHtml(thread.thread_title)}
                        </a>
                    </h5>
                    <div class="search-result-meta">
                        <span>By ${this.escapeHtml(thread.author.username)}</span>
                        <span>in ${this.escapeHtml(thread.category.category_name)}</span>
                        <span>${thread.post_count} posts</span>
                        <span>${this.formatRelativeTime(thread.created_at)}</span>
                    </div>
                </div>
            `).join('');
            resultsHTML += '</div>';
        }
        
        // Post results
        if (results.posts && results.posts.length > 0) {
            resultsHTML += '<div class="search-results-section"><h4><i class="fas fa-comment"></i> Posts</h4>';
            resultsHTML += results.posts.map(post => {
                const contentPreview = post.post_content_preview || '';
                
                return `
                    <div class="search-result-item">
                        <h5>
                            <a href="#" class="thread-link" data-thread-id="${post.thread.thread_id}">
                                ${this.escapeHtml(post.thread.thread_title)}
                            </a>
                        </h5>
                        <div class="search-result-content">${this.escapeHtml(contentPreview)}</div>
                        <div class="search-result-meta">
                            <span>By ${this.escapeHtml(post.author.username)}</span>
                            <span>in ${this.escapeHtml(post.thread.category.category_name)}</span>
                            <span>${this.formatRelativeTime(post.created_at)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            resultsHTML += '</div>';
        }
        
        if (!resultsHTML) {
            resultsHTML = '<div class="empty-state"><p>No results found</p></div>';
        }
        
        // Add pagination if needed
        if (results.pagination && results.pagination.total_pages > 1) {
            // TODO: Add pagination controls
        }
        
        $('#search-results-content').html(resultsHTML);
        $('#search-results').show();
        
        // Setup click handlers for result links
        $(document).off('click', '#search-results-content .thread-link').on('click', '#search-results-content .thread-link', async (e) => {
            e.preventDefault();
            const threadId = $(e.currentTarget).data('thread-id');
            $('#forum-search-modal').remove();
            if (this.app.modules.forumThread) {
                await this.app.modules.forumThread.loadThread(threadId);
            }
        });
    }
    
    /**
     * Initialize forum module
     */
    init() {
        this.setupEventHandlers();
        console.log('Forum Module event handlers setup complete');
    }
}

// Export to window for use in app.js
window.ForumModule = ForumModule;