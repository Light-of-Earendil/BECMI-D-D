/**
 * BECMI D&D Character Manager - Forum Thread Module
 * 
 * Handles thread view with posts, post editor, and thread actions
 */

class ForumThreadModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentThreadId = null;
        this.currentPage = 1;
        this.thread = null;
        this.posts = [];
        this.isModerator = false;
        
        console.log('Forum Thread Module initialized');
    }
    
    /**
     * Load and display a thread
     */
    async loadThread(threadId, page = 1) {
        try {
            this.currentThreadId = threadId;
            this.currentPage = page;
            
            // Load thread info
            const threadResponse = await this.apiClient.get('/api/forum/threads/get.php', {
                thread_id: threadId
            });
            
            if (threadResponse.status !== 'success') {
                throw new Error(threadResponse.message || 'Failed to load thread');
            }
            
            this.thread = threadResponse.data;
            
            // Check if user is moderator (we'll get this from app state or make a separate call)
            // For now, we'll check permissions from thread response
            
            // Load posts
            const postsResponse = await this.apiClient.get('/api/forum/posts/list.php', {
                thread_id: threadId,
                page: page,
                per_page: 20
            });
            
            if (postsResponse.status !== 'success') {
                throw new Error(postsResponse.message || 'Failed to load posts');
            }
            
            this.posts = postsResponse.data.posts || [];
            const pagination = postsResponse.data.pagination || {};
            
            // Render thread view
            const content = this.renderThreadView(this.thread, this.posts, pagination);
            $('#content-area').html(content);
            this.app.currentView = 'forum-thread';
            
            // Setup event handlers for this view
            this.setupThreadEventHandlers();
            
        } catch (error) {
            console.error('Failed to load thread:', error);
            this.app.showError('Failed to load thread: ' + error.message);
        }
    }
    
    /**
     * Render thread view with posts
     */
    renderThreadView(thread, posts, pagination) {
        const breadcrumb = `
            <div class="forum-breadcrumb">
                <a href="#" class="nav-link" data-view="forum">
                    <i class="fas fa-home"></i> Forum
                </a>
                <i class="fas fa-chevron-right"></i>
                <a href="#" class="category-link" data-category-id="${thread.category.category_id}">
                    ${this.escapeHtml(thread.category.category_name)}
                </a>
                <i class="fas fa-chevron-right"></i>
                <span>${this.escapeHtml(thread.thread_title)}</span>
            </div>
        `;
        
        const threadHeader = `
            <div class="forum-thread-header">
                <div class="thread-title-section">
                    <h2>
                        ${thread.is_sticky ? '<i class="fas fa-thumbtack" title="Sticky"></i>' : ''}
                        ${thread.is_locked ? '<i class="fas fa-lock" title="Locked"></i>' : ''}
                        ${this.escapeHtml(thread.thread_title)}
                    </h2>
                    <div class="thread-meta">
                        <span class="thread-author">
                            <i class="fas fa-user"></i> ${this.escapeHtml(thread.author.username)}
                        </span>
                        <span class="thread-stats">
                            <i class="fas fa-eye"></i> ${thread.view_count} views
                            <i class="fas fa-reply"></i> ${thread.post_count} posts
                        </span>
                        <span class="thread-created">
                            Created ${this.formatRelativeTime(thread.created_at)}
                        </span>
                    </div>
                </div>
                <div class="thread-actions">
                    <button class="btn btn-sm btn-secondary" id="subscribe-thread-btn" 
                        data-subscribed="${thread.is_subscribed}">
                        <i class="fas fa-${thread.is_subscribed ? 'bell-slash' : 'bell'}"></i>
                        ${thread.is_subscribed ? 'Unsubscribe' : 'Subscribe'}
                    </button>
                    ${thread.can_edit ? `
                        <button class="btn btn-sm btn-secondary" id="edit-thread-btn">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                    ${thread.can_delete ? `
                        <button class="btn btn-sm btn-danger" id="delete-thread-btn">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        const postsHTML = posts.length === 0 ? 
            '<div class="empty-state"><p>No posts yet</p></div>' :
            posts.map((post, index) => this.renderPost(post, index === 0)).join('');
        
        const paginationHTML = this.generatePaginationHTML(pagination);
        
        const replySection = thread.is_locked ? 
            '<div class="alert alert-info"><i class="fas fa-lock"></i> This thread is locked. Only moderators can post.</div>' :
            `
            <div class="forum-reply-section">
                <h3><i class="fas fa-reply"></i> Post a Reply</h3>
                <form id="post-reply-form">
                    <div class="form-group">
                        <textarea id="post-content" name="post_content" rows="8" 
                            placeholder="Write your reply here..." required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Post Reply
                        </button>
                        <button type="button" class="btn btn-secondary" id="preview-post-btn">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        return `<div class="forum-container">
            ${breadcrumb}
            ${threadHeader}
            <div class="forum-posts">
                ${postsHTML}
            </div>
            ${paginationHTML}
            ${replySection}
        </div>`;
    }
    
    /**
     * Render a single post
     */
    renderPost(post, isFirstPost = false) {
        const editedInfo = post.is_edited ? 
            `<div class="post-edited">
                <i class="fas fa-edit"></i> Edited ${this.formatRelativeTime(post.edited_at)}
                ${post.edit_reason ? ` - ${this.escapeHtml(post.edit_reason)}` : ''}
            </div>` : '';
        
        return `
            <div class="forum-post" data-post-id="${post.post_id}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="author-info">
                            <strong>${this.escapeHtml(post.author.username)}</strong>
                            ${isFirstPost ? '<span class="badge badge-primary">Original Poster</span>' : ''}
                        </div>
                    </div>
                    <div class="post-meta">
                        <span class="post-number">#${post.post_id}</span>
                        <span class="post-date">${this.formatRelativeTime(post.created_at)}</span>
                        ${editedInfo}
                    </div>
                </div>
                <div class="post-content">
                    ${this.formatPostContent(post.post_content)}
                </div>
                <div class="post-actions">
                    ${post.can_edit ? `
                        <button class="btn btn-sm btn-secondary edit-post-btn" data-post-id="${post.post_id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                    ${post.can_delete ? `
                        <button class="btn btn-sm btn-danger delete-post-btn" data-post-id="${post.post_id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                    ${post.is_edited ? `
                        <button class="btn btn-sm btn-info view-edit-history-btn" data-post-id="${post.post_id}">
                            <i class="fas fa-history"></i> Edit History
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Format post content (basic formatting, can be enhanced with markdown later)
     */
    formatPostContent(content) {
        if (!content) return '';
        
        // Escape HTML first
        let formatted = this.escapeHtml(content);
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Convert URLs to links (basic regex)
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
        
        return formatted;
    }
    
    /**
     * Generate pagination HTML
     */
    generatePaginationHTML(pagination) {
        if (!pagination || pagination.total_pages <= 1) {
            return '';
        }
        
        const currentPage = pagination.page || 1;
        const totalPages = pagination.total_pages || 1;
        
        let paginationHTML = '<div class="forum-pagination">';
        
        if (currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm btn-secondary pagination-btn" 
                data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i> Previous
            </button>`;
        }
        
        const maxPages = 10;
        let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn btn-sm pagination-btn ${activeClass}" 
                data-page="${i}">${i}</button>`;
        }
        
        if (currentPage < totalPages) {
            paginationHTML += `<button class="btn btn-sm btn-secondary pagination-btn" 
                data-page="${currentPage + 1}">
                Next <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        paginationHTML += '</div>';
        
        return paginationHTML;
    }
    
    /**
     * Show create thread modal
     */
    async showCreateThreadModal(categoryId) {
        if (!categoryId) {
            this.app.showError('Category ID is required');
            return;
        }
        
        try {
            // Check if user is moderator
            let isModerator = false;
            try {
                const modResponse = await this.apiClient.get('/api/forum/moderation/queue.php');
                if (modResponse.status === 'success') {
                    isModerator = true;
                }
            } catch (error) {
                // User is not a moderator, that's fine
            }
            
            // Get category info for display
            const categoryResponse = await this.apiClient.get('/api/forum/categories/get.php', {
                category_id: categoryId
            });
            
            if (categoryResponse.status !== 'success') {
                throw new Error('Failed to load category information');
            }
            
            const category = categoryResponse.data;
            
            // Create modal HTML
            const modalHtml = `
                <div class="modal show" id="create-thread-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-plus-circle"></i> Create New Thread</h2>
                            <button type="button" class="close" id="close-create-thread-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <div class="form-info">
                                <p><strong>Category:</strong> ${this.escapeHtml(category.category_name)}</p>
                            </div>
                            <form id="create-thread-form">
                                <input type="hidden" id="thread-category-id" value="${categoryId}">
                                
                                <div class="form-group">
                                    <label for="thread-title">Thread Title *</label>
                                    <input type="text" id="thread-title" name="thread_title" 
                                        required maxlength="255" 
                                        placeholder="Enter thread title...">
                                </div>
                                
                                <div class="form-group">
                                    <label for="thread-post-content">First Post Content *</label>
                                    <textarea id="thread-post-content" name="post_content" 
                                        rows="10" required 
                                        placeholder="Write your post content here..."></textarea>
                                </div>
                                
                                ${isModerator ? `
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="control">
                                            <input type="checkbox" id="thread-is-private" name="is_private">
                                            <span class="box"></span>
                                            <span>Private Thread</span>
                                        </label>
                                        <small class="form-help">Private threads are only visible to moderators</small>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Create Thread
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-create-thread-modal">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#create-thread-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Setup event handlers
            $('#close-create-thread-modal, #cancel-create-thread-modal').on('click', () => {
                $('#create-thread-modal').remove();
            });
            
            $('#create-thread-form').on('submit', async (e) => {
                e.preventDefault();
                await this.handleCreateThread(categoryId);
            });
            
            // Close on background click
            $('#create-thread-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#create-thread-modal').remove();
                }
            });
            
        } catch (error) {
            console.error('Failed to show create thread modal:', error);
            this.app.showError('Failed to load category information: ' + error.message);
        }
    }
    
    /**
     * Handle create thread form submission
     */
    async handleCreateThread(categoryId) {
        try {
            const threadTitle = $('#thread-title').val().trim();
            const postContent = $('#thread-post-content').val().trim();
            const isPrivate = $('#thread-is-private').is(':checked');
            
            if (!threadTitle) {
                this.app.showError('Thread title is required');
                return;
            }
            
            if (threadTitle.length > 255) {
                this.app.showError('Thread title must be 255 characters or less');
                return;
            }
            
            if (!postContent) {
                this.app.showError('Post content is required');
                return;
            }
            
            const response = await this.apiClient.post('/api/forum/threads/create.php', {
                category_id: categoryId,
                thread_title: threadTitle,
                post_content: postContent,
                is_private: isPrivate
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Thread created successfully');
                $('#create-thread-modal').remove();
                
                // Load the newly created thread
                await this.loadThread(response.data.thread_id);
            } else {
                throw new Error(response.message || 'Failed to create thread');
            }
            
        } catch (error) {
            console.error('Create thread error:', error);
            this.app.showError('Failed to create thread: ' + error.message);
        }
    }
    
    /**
     * Setup event handlers for thread view
     */
    setupThreadEventHandlers() {
        // Post reply form
        $(document).off('submit', '#post-reply-form').on('submit', '#post-reply-form', async (e) => {
            e.preventDefault();
            await this.handlePostReply();
        });
        
        // Subscribe/Unsubscribe button
        $(document).off('click', '#subscribe-thread-btn').on('click', '#subscribe-thread-btn', async (e) => {
            e.preventDefault();
            await this.handleSubscribe();
        });
        
        // Edit post button
        $(document).off('click', '.edit-post-btn').on('click', '.edit-post-btn', async (e) => {
            e.preventDefault();
            const postId = $(e.currentTarget).data('post-id');
            await this.showEditPostModal(postId);
        });
        
        // Delete post button
        $(document).off('click', '.delete-post-btn').on('click', '.delete-post-btn', async (e) => {
            e.preventDefault();
            const postId = $(e.currentTarget).data('post-id');
            await this.handleDeletePost(postId);
        });
        
        // View edit history button
        $(document).off('click', '.view-edit-history-btn').on('click', '.view-edit-history-btn', async (e) => {
            e.preventDefault();
            const postId = $(e.currentTarget).data('post-id');
            await this.showEditHistory(postId);
        });
        
        // Pagination buttons
        $(document).off('click', '.pagination-btn').on('click', '.pagination-btn', async (e) => {
            e.preventDefault();
            const page = $(e.currentTarget).data('page');
            await this.loadThread(this.currentThreadId, page);
        });
        
        // Edit thread button
        $(document).off('click', '#edit-thread-btn').on('click', '#edit-thread-btn', (e) => {
            e.preventDefault();
            this.showEditThreadModal();
        });
        
        // Delete thread button
        $(document).off('click', '#delete-thread-btn').on('click', '#delete-thread-btn', async (e) => {
            e.preventDefault();
            await this.handleDeleteThread();
        });
    }
    
    /**
     * Handle post reply
     */
    async handlePostReply() {
        try {
            const content = $('#post-content').val().trim();
            
            if (!content) {
                this.app.showError('Post content cannot be empty');
                return;
            }
            
            const response = await this.apiClient.post('/api/forum/posts/create.php', {
                thread_id: this.currentThreadId,
                post_content: content
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Post created successfully');
                $('#post-content').val('');
                // Reload thread to show new post
                await this.loadThread(this.currentThreadId, this.currentPage);
            } else {
                throw new Error(response.message || 'Failed to create post');
            }
            
        } catch (error) {
            console.error('Post reply error:', error);
            this.app.showError('Failed to post reply: ' + error.message);
        }
    }
    
    /**
     * Handle subscribe/unsubscribe
     */
    async handleSubscribe() {
        try {
            const isSubscribed = $('#subscribe-thread-btn').data('subscribed');
            const subscribe = !isSubscribed;
            
            const response = await this.apiClient.post('/api/forum/threads/subscribe.php', {
                thread_id: this.currentThreadId,
                subscribe: subscribe
            });
            
            if (response.status === 'success') {
                $('#subscribe-thread-btn').data('subscribed', subscribe);
                $('#subscribe-thread-btn').html(`
                    <i class="fas fa-${subscribe ? 'bell-slash' : 'bell'}"></i>
                    ${subscribe ? 'Unsubscribe' : 'Subscribe'}
                `);
                this.app.showSuccess(subscribe ? 'Subscribed to thread' : 'Unsubscribed from thread');
            } else {
                throw new Error(response.message || 'Failed to update subscription');
            }
            
        } catch (error) {
            console.error('Subscribe error:', error);
            this.app.showError('Failed to update subscription: ' + error.message);
        }
    }
    
    /**
     * Show edit post modal
     */
    async showEditPostModal(postId) {
        try {
            // Load current post
            const response = await this.apiClient.get('/api/forum/posts/get.php', {
                post_id: postId
            });
            
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load post');
            }
            
            const post = response.data;
            
            // Check if user can edit (author or moderator)
            if (!post.can_edit) {
                this.app.showError('You do not have permission to edit this post');
                return;
            }
            
            // Create modal HTML
            const modalHtml = `
                <div class="modal show" id="edit-post-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-edit"></i> Edit Post</h2>
                            <button type="button" class="close" id="close-edit-post-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <form id="edit-post-form">
                                <input type="hidden" id="edit-post-id" value="${postId}">
                                
                                <div class="form-group">
                                    <label for="edit-post-content">Post Content *</label>
                                    <textarea id="edit-post-content" name="post_content" 
                                        rows="12" required 
                                        placeholder="Enter post content...">${this.escapeHtml(post.post_content)}</textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-post-reason">Edit Reason (Optional)</label>
                                    <input type="text" id="edit-post-reason" name="edit_reason" 
                                        maxlength="255" 
                                        placeholder="e.g., Fixed typo, Added clarification...">
                                    <small class="form-help">Optional reason for editing this post</small>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Save Changes
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-edit-post-modal">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#edit-post-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Setup event handlers
            $('#close-edit-post-modal, #cancel-edit-post-modal').on('click', () => {
                $('#edit-post-modal').remove();
            });
            
            $('#edit-post-form').on('submit', async (e) => {
                e.preventDefault();
                await this.handleEditPost(postId);
            });
            
            // Close on background click
            $('#edit-post-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#edit-post-modal').remove();
                }
            });
            
        } catch (error) {
            console.error('Failed to show edit post modal:', error);
            this.app.showError('Failed to load post: ' + error.message);
        }
    }
    
    /**
     * Handle edit post form submission
     */
    async handleEditPost(postId) {
        try {
            const postContent = $('#edit-post-content').val().trim();
            const editReason = $('#edit-post-reason').val().trim() || null;
            
            if (!postContent) {
                this.app.showError('Post content is required');
                return;
            }
            
            const response = await this.apiClient.put('/api/forum/posts/update.php', {
                post_id: postId,
                post_content: postContent,
                edit_reason: editReason
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Post updated successfully');
                $('#edit-post-modal').remove();
                
                // Reload thread to show updated post
                await this.loadThread(this.currentThreadId, this.currentPage);
            } else {
                throw new Error(response.message || 'Failed to update post');
            }
            
        } catch (error) {
            console.error('Edit post error:', error);
            this.app.showError('Failed to update post: ' + error.message);
        }
    }
    
    /**
     * Handle delete post
     */
    async handleDeletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }
        
        try {
            const response = await this.apiClient.delete('/api/forum/posts/delete.php', {
                post_id: postId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Post deleted successfully');
                // Reload thread
                await this.loadThread(this.currentThreadId, this.currentPage);
            } else {
                throw new Error(response.message || 'Failed to delete post');
            }
            
        } catch (error) {
            console.error('Delete post error:', error);
            this.app.showError('Failed to delete post: ' + error.message);
        }
    }
    
    /**
     * Show edit history
     */
    async showEditHistory(postId) {
        try {
            // Load edit history
            const response = await this.apiClient.get('/api/forum/posts/edit-history.php', {
                post_id: postId
            });
            
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load edit history');
            }
            
            const history = response.data;
            
            // Create modal HTML
            let historyHTML = '';
            
            if (history.edit_history && history.edit_history.length > 0) {
                historyHTML = history.edit_history.map((edit, index) => `
                    <div class="edit-history-item">
                        <div class="edit-history-header">
                            <strong>Edit #${history.edit_history.length - index}</strong>
                            <span class="edit-history-meta">
                                By ${this.escapeHtml(edit.editor.username)} 
                                ${this.formatRelativeTime(edit.edited_at)}
                            </span>
                        </div>
                        ${edit.edit_reason ? `
                            <div class="edit-history-reason">
                                <strong>Reason:</strong> ${this.escapeHtml(edit.edit_reason)}
                            </div>
                        ` : ''}
                        <div class="edit-history-content">
                            <strong>Previous Content:</strong>
                            <div class="edit-history-text">${this.escapeHtml(edit.old_content)}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                historyHTML = '<div class="empty-state"><p>No edit history available</p></div>';
            }
            
            const modalHtml = `
                <div class="modal show" id="edit-history-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-history"></i> Edit History</h2>
                            <button type="button" class="close" id="close-edit-history-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <div class="edit-history-info">
                                <p><strong>Post created:</strong> ${this.formatRelativeTime(history.created_at)}</p>
                                ${history.is_edited ? `
                                    <p><strong>Last edited:</strong> ${this.formatRelativeTime(history.last_edited_at)}</p>
                                    ${history.last_edit_reason ? `<p><strong>Last edit reason:</strong> ${this.escapeHtml(history.last_edit_reason)}</p>` : ''}
                                    <p><strong>Total edits:</strong> ${history.edit_count}</p>
                                ` : '<p>This post has not been edited.</p>'}
                            </div>
                            
                            ${history.is_edited ? `
                            <div class="edit-history-current">
                                <h3>Current Content:</h3>
                                <div class="edit-history-text">${this.escapeHtml(history.current_content)}</div>
                            </div>
                            ` : ''}
                            
                            <div class="edit-history-list">
                                <h3>Edit History:</h3>
                                ${historyHTML}
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="close-edit-history-modal-btn">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#edit-history-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Setup event handlers
            $('#close-edit-history-modal, #close-edit-history-modal-btn').on('click', () => {
                $('#edit-history-modal').remove();
            });
            
            // Close on background click
            $('#edit-history-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#edit-history-modal').remove();
                }
            });
            
        } catch (error) {
            console.error('Failed to show edit history:', error);
            this.app.showError('Failed to load edit history: ' + error.message);
        }
    }
    
    /**
     * Show edit thread modal
     */
    async showEditThreadModal() {
        if (!this.thread) {
            this.app.showError('Thread not loaded');
            return;
        }
        
        try {
            // Check if user is moderator
            let isModerator = false;
            try {
                const modResponse = await this.apiClient.get('/api/forum/moderation/queue.php');
                if (modResponse.status === 'success') {
                    isModerator = true;
                }
            } catch (error) {
                // User is not a moderator, that's fine
            }
            
            // Check if user can edit (author or moderator)
            if (!this.thread.can_edit) {
                this.app.showError('You do not have permission to edit this thread');
                return;
            }
            
            // Create modal HTML
            const modalHtml = `
                <div class="modal show" id="edit-thread-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-edit"></i> Edit Thread</h2>
                            <button type="button" class="close" id="close-edit-thread-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <form id="edit-thread-form">
                                <input type="hidden" id="edit-thread-id" value="${this.thread.thread_id}">
                                
                                <div class="form-group">
                                    <label for="edit-thread-title">Thread Title *</label>
                                    <input type="text" id="edit-thread-title" name="thread_title" 
                                        value="${this.escapeHtml(this.thread.thread_title)}" 
                                        required maxlength="255" 
                                        placeholder="Enter thread title...">
                                </div>
                                
                                ${isModerator ? `
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="control">
                                            <input type="checkbox" id="edit-thread-is-private" name="is_private" 
                                                ${this.thread.is_private ? 'checked' : ''}>
                                            <span class="box"></span>
                                            <span>Private Thread</span>
                                        </label>
                                        <small class="form-help">Private threads are only visible to moderators</small>
                                    </div>
                                </div>
                                ` : ''}
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Save Changes
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-edit-thread-modal">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#edit-thread-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Setup event handlers
            $('#close-edit-thread-modal, #cancel-edit-thread-modal').on('click', () => {
                $('#edit-thread-modal').remove();
            });
            
            $('#edit-thread-form').on('submit', async (e) => {
                e.preventDefault();
                await this.handleEditThread();
            });
            
            // Close on background click
            $('#edit-thread-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#edit-thread-modal').remove();
                }
            });
            
        } catch (error) {
            console.error('Failed to show edit thread modal:', error);
            this.app.showError('Failed to load thread information: ' + error.message);
        }
    }
    
    /**
     * Handle edit thread form submission
     */
    async handleEditThread() {
        try {
            const threadId = this.thread.thread_id;
            const threadTitle = $('#edit-thread-title').val().trim();
            const isPrivate = $('#edit-thread-is-private').is(':checked');
            
            if (!threadTitle) {
                this.app.showError('Thread title is required');
                return;
            }
            
            if (threadTitle.length > 255) {
                this.app.showError('Thread title must be 255 characters or less');
                return;
            }
            
            const updateData = {
                thread_id: threadId,
                thread_title: threadTitle
            };
            
            // Only include is_private if user is moderator (checkbox only shown to moderators)
            if ($('#edit-thread-is-private').length > 0) {
                updateData.is_private = isPrivate;
            }
            
            const response = await this.apiClient.put('/api/forum/threads/update.php', updateData);
            
            if (response.status === 'success') {
                this.app.showSuccess('Thread updated successfully');
                $('#edit-thread-modal').remove();
                
                // Reload thread to show updated information
                await this.loadThread(threadId, this.currentPage);
            } else {
                throw new Error(response.message || 'Failed to update thread');
            }
            
        } catch (error) {
            console.error('Edit thread error:', error);
            this.app.showError('Failed to update thread: ' + error.message);
        }
    }
    
    /**
     * Handle delete thread
     */
    async handleDeleteThread() {
        if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await this.apiClient.delete('/api/forum/threads/delete.php', {
                thread_id: this.currentThreadId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Thread deleted successfully');
                // Navigate back to category
                if (this.thread && this.thread.category) {
                    if (this.app.modules.forum) {
                        await this.app.modules.forum.loadCategoryThreads(this.thread.category.category_id);
                    } else {
                        this.app.navigateToView('forum');
                    }
                } else {
                    this.app.navigateToView('forum');
                }
            } else {
                throw new Error(response.message || 'Failed to delete thread');
            }
            
        } catch (error) {
            console.error('Delete thread error:', error);
            this.app.showError('Failed to delete thread: ' + error.message);
        }
    }
    
    /**
     * Format relative time
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
     * Initialize forum thread module
     */
    init() {
        console.log('Forum Thread Module event handlers setup complete');
    }
}

// Export to window for use in app.js
window.ForumThreadModule = ForumThreadModule;