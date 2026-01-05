/**
 * BECMI D&D Character Manager - Forum Moderation Module
 * 
 * Handles moderation tools and actions for forum administrators
 */

class ForumModerationModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.isModerator = false;
        
        console.log('Forum Moderation Module initialized');
    }
    
    /**
     * Render moderation panel
     */
    async render() {
        // Check if user is moderator using cached status from app state
        const isModerator = this.app.state.user && this.app.state.user.is_moderator === true;
        
        if (!isModerator) {
            // User is not a moderator - no need to make API call
            return `<div class="card">
                <h2>Access Denied</h2>
                <p>You do not have permission to access the moderation panel.</p>
            </div>`;
        }
        
        // User is moderator - fetch moderation queue data
        const response = await this.apiClient.get('/api/forum/moderation/queue.php');
        
        if (!response.success || response.status !== 'success') {
            return `<div class="card">
                <h2>Error</h2>
                <p>Failed to load moderation queue: ${response.error || response.message || 'Unknown error'}</p>
            </div>`;
        }
        
        this.isModerator = true;
        const queue = response.data.queue || {};
        const stats = response.data.stats || {};
        
        const html = this.renderModerationPanel(queue, stats);
        
        // Load categories list asynchronously after rendering
        setTimeout(async () => {
            const categoriesList = await this.renderCategoriesList();
            $('#categories-list').html(categoriesList);
        }, 100);
        
        return html;
    }
    
    /**
     * Render moderation panel HTML
     */
    renderModerationPanel(queue, stats) {
        return `<div class="forum-moderation-container">
            <div class="moderation-header">
                <h1><i class="fas fa-shield-alt"></i> Moderation Panel</h1>
                <p>Manage forum content and users</p>
            </div>
            
            <div class="moderation-stats">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-comments"></i></div>
                    <div class="stat-content">
                        <h3>${stats.total_posts_24h || 0}</h3>
                        <p>Posts (24h)</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-folder"></i></div>
                    <div class="stat-content">
                        <h3>${stats.total_threads_24h || 0}</h3>
                        <p>Threads (24h)</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-ban"></i></div>
                    <div class="stat-content">
                        <h3>${stats.total_banned_users || 0}</h3>
                        <p>Banned Users</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-edit"></i></div>
                    <div class="stat-content">
                        <h3>${stats.total_edits_7d || 0}</h3>
                        <p>Edits (7d)</p>
                    </div>
                </div>
            </div>
            
            <div class="moderation-sections">
                <div class="moderation-section">
                    <div class="section-header">
                        <h2><i class="fas fa-folder-open"></i> Category Management</h2>
                        <button class="btn btn-primary btn-sm" id="create-category-btn">
                            <i class="fas fa-plus"></i> Create Category
                        </button>
                    </div>
                    <div class="moderation-list" id="categories-list">
                        <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading categories...</div>
                    </div>
                </div>
                
                <div class="moderation-section">
                    <h2><i class="fas fa-comments"></i> Recent Posts (24h)</h2>
                    <div class="moderation-list">
                        ${this.renderRecentPosts(queue.recent_posts || [])}
                    </div>
                </div>
                
                <div class="moderation-section">
                    <h2><i class="fas fa-folder"></i> Recent Threads (24h)</h2>
                    <div class="moderation-list">
                        ${this.renderRecentThreads(queue.recent_threads || [])}
                    </div>
                </div>
                
                <div class="moderation-section">
                    <h2><i class="fas fa-ban"></i> Banned Users</h2>
                    <div class="moderation-list">
                        ${this.renderBannedUsers(queue.banned_users || [])}
                    </div>
                </div>
                
                <div class="moderation-section">
                    <h2><i class="fas fa-history"></i> Recent Edits (7d)</h2>
                    <div class="moderation-list">
                        ${this.renderRecentEdits(queue.recent_edits || [])}
                    </div>
                </div>
            </div>
        </div>`;
    }
    
    /**
     * Render recent posts list
     */
    renderRecentPosts(posts) {
        if (posts.length === 0) {
            return '<div class="empty-state"><p>No recent posts</p></div>';
        }
        
        return posts.map(post => `
            <div class="moderation-item" data-post-id="${post.post_id}">
                <div class="item-content">
                    <div class="item-header">
                        <strong>${this.escapeHtml(post.author.username)}</strong>
                        <span class="item-meta">${this.formatRelativeTime(post.created_at)}</span>
                    </div>
                    <div class="item-preview">
                        ${this.escapeHtml(post.post_content_preview)}...
                    </div>
                    <div class="item-context">
                        <a href="#" class="thread-link" data-thread-id="${post.thread_id}">
                            ${this.escapeHtml(post.thread_title)}
                        </a> in ${this.escapeHtml(post.category_name)}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-secondary" data-action="view-post" data-post-id="${post.post_id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-post" data-post-id="${post.post_id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Render recent threads list
     */
    renderRecentThreads(threads) {
        if (threads.length === 0) {
            return '<div class="empty-state"><p>No recent threads</p></div>';
        }
        
        return threads.map(thread => `
            <div class="moderation-item" data-thread-id="${thread.thread_id}">
                <div class="item-content">
                    <div class="item-header">
                        <strong>${this.escapeHtml(thread.thread_title)}</strong>
                        <span class="item-meta">${this.formatRelativeTime(thread.created_at)}</span>
                    </div>
                    <div class="item-context">
                        By ${this.escapeHtml(thread.author.username)} in ${this.escapeHtml(thread.category_name)}
                        <span class="item-stats">${thread.post_count} posts, ${thread.view_count} views</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-secondary" data-action="view-thread" data-thread-id="${thread.thread_id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-warning" data-action="lock-thread" data-thread-id="${thread.thread_id}">
                        <i class="fas fa-lock"></i> Lock
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-thread" data-thread-id="${thread.thread_id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Render banned users list
     */
    renderBannedUsers(users) {
        if (users.length === 0) {
            return '<div class="empty-state"><p>No banned users</p></div>';
        }
        
        return users.map(user => `
            <div class="moderation-item" data-user-id="${user.user_id}">
                <div class="item-content">
                    <div class="item-header">
                        <strong>${this.escapeHtml(user.username)}</strong>
                        <span class="item-meta">Banned ${this.formatRelativeTime(user.banned_at)}</span>
                    </div>
                    <div class="item-context">
                        ${user.ban_reason ? `Reason: ${this.escapeHtml(user.ban_reason)}` : 'No reason provided'}
                        ${user.ban_expires_at ? ` | Expires: ${new Date(user.ban_expires_at).toLocaleDateString()}` : ' | Permanent ban'}
                        ${user.banned_by ? ` | By: ${this.escapeHtml(user.banned_by.username)}` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-success" data-action="unban-user" data-user-id="${user.user_id}">
                        <i class="fas fa-unlock"></i> Unban
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Render recent edits list
     */
    renderRecentEdits(edits) {
        if (edits.length === 0) {
            return '<div class="empty-state"><p>No recent edits</p></div>';
        }
        
        return edits.map(edit => `
            <div class="moderation-item" data-edit-id="${edit.edit_id}">
                <div class="item-content">
                    <div class="item-header">
                        <strong>Edit by ${this.escapeHtml(edit.editor.username)}</strong>
                        <span class="item-meta">${this.formatRelativeTime(edit.edited_at)}</span>
                    </div>
                    <div class="item-preview">
                        ${this.escapeHtml(edit.current_content_preview)}...
                    </div>
                    <div class="item-context">
                        <a href="#" class="thread-link" data-thread-id="${edit.thread_id}">
                            ${this.escapeHtml(edit.thread_title)}
                        </a>
                        ${edit.edit_reason ? ` | Reason: ${this.escapeHtml(edit.edit_reason)}` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-secondary" data-action="view-edit-history" data-post-id="${edit.post_id}">
                        <i class="fas fa-history"></i> History
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // View post
        $(document).on('click', '[data-action="view-post"]', async (e) => {
            e.preventDefault();
            const postId = $(e.currentTarget).data('post-id');
            await this.viewPost(postId);
        });
        
        // Delete post
        $(document).on('click', '[data-action="delete-post"]', async (e) => {
            e.preventDefault();
            const postId = $(e.currentTarget).data('post-id');
            await this.deletePost(postId);
        });
        
        // View thread
        $(document).on('click', '[data-action="view-thread"]', async (e) => {
            e.preventDefault();
            const threadId = $(e.currentTarget).data('thread-id');
            if (this.app.modules.forumThread) {
                await this.app.modules.forumThread.loadThread(threadId);
            }
        });
        
        // Lock thread
        $(document).on('click', '[data-action="lock-thread"]', async (e) => {
            e.preventDefault();
            const threadId = $(e.currentTarget).data('thread-id');
            await this.lockThread(threadId);
        });
        
        // Delete thread
        $(document).on('click', '[data-action="delete-thread"]', async (e) => {
            e.preventDefault();
            const threadId = $(e.currentTarget).data('thread-id');
            await this.deleteThread(threadId);
        });
        
        // Unban user
        $(document).on('click', '[data-action="unban-user"]', async (e) => {
            e.preventDefault();
            const userId = $(e.currentTarget).data('user-id');
            await this.unbanUser(userId);
        });
        
        // View edit history
        $(document).on('click', '[data-action="view-edit-history"]', async (e) => {
            e.preventDefault();
            const postId = $(e.currentTarget).data('post-id');
            await this.viewEditHistory(postId);
        });
        
        // Create category button
        $(document).on('click', '#create-category-btn', async (e) => {
            e.preventDefault();
            await this.showCreateCategoryModal();
        });
        
        // Edit category button
        $(document).on('click', '[data-action="edit-category"]', async (e) => {
            e.preventDefault();
            const categoryId = $(e.currentTarget).data('category-id');
            await this.showEditCategoryModal(categoryId);
        });
        
        // Delete category button
        $(document).on('click', '[data-action="delete-category"]', async (e) => {
            e.preventDefault();
            const categoryId = $(e.currentTarget).data('category-id');
            await this.handleDeleteCategory(categoryId);
        });
    }
    
    /**
     * View post
     */
    async viewPost(postId) {
        try {
            const response = await this.apiClient.get('/api/forum/posts/get.php', {
                post_id: postId
            });
            
            if (response.status === 'success' && this.app.modules.forumThread) {
                await this.app.modules.forumThread.loadThread(response.data.thread.thread_id);
            }
        } catch (error) {
            console.error('View post error:', error);
            this.app.showError('Failed to view post: ' + error.message);
        }
    }
    
    /**
     * Delete post
     */
    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }
        
        try {
            const response = await this.apiClient.delete('/api/forum/posts/delete.php', {
                post_id: postId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Post deleted successfully');
                // Reload moderation panel
                const content = await this.render();
                $('#content-area').html(content);
            } else {
                throw new Error(response.message || 'Failed to delete post');
            }
        } catch (error) {
            console.error('Delete post error:', error);
            this.app.showError('Failed to delete post: ' + error.message);
        }
    }
    
    /**
     * Lock thread
     */
    async lockThread(threadId) {
        try {
            const response = await this.apiClient.post('/api/forum/threads/lock.php', {
                thread_id: threadId,
                is_locked: true
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Thread locked successfully');
                // Reload moderation panel
                const content = await this.render();
                $('#content-area').html(content);
            } else {
                throw new Error(response.message || 'Failed to lock thread');
            }
        } catch (error) {
            console.error('Lock thread error:', error);
            this.app.showError('Failed to lock thread: ' + error.message);
        }
    }
    
    /**
     * Delete thread
     */
    async deleteThread(threadId) {
        if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await this.apiClient.delete('/api/forum/threads/delete.php', {
                thread_id: threadId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Thread deleted successfully');
                // Reload moderation panel
                const content = await this.render();
                $('#content-area').html(content);
            } else {
                throw new Error(response.message || 'Failed to delete thread');
            }
        } catch (error) {
            console.error('Delete thread error:', error);
            this.app.showError('Failed to delete thread: ' + error.message);
        }
    }
    
    /**
     * Unban user
     */
    async unbanUser(userId) {
        if (!confirm('Are you sure you want to unban this user?')) {
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/forum/moderation/ban-user.php', {
                user_id: userId,
                is_banned: false
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('User unbanned successfully');
                // Reload moderation panel
                const content = await this.render();
                $('#content-area').html(content);
            } else {
                throw new Error(response.message || 'Failed to unban user');
            }
        } catch (error) {
            console.error('Unban user error:', error);
            this.app.showError('Failed to unban user: ' + error.message);
        }
    }
    
    /**
     * View edit history
     */
    async viewEditHistory(postId) {
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
     * Render categories list
     */
    async renderCategoriesList() {
        try {
            const response = await this.apiClient.get('/api/forum/categories/list.php');
            
            if (response.status !== 'success') {
                return '<div class="empty-state"><p>Failed to load categories</p></div>';
            }
            
            const categories = response.data.categories || [];
            
            if (categories.length === 0) {
                return '<div class="empty-state"><p>No categories yet. Create your first category!</p></div>';
            }
            
            return categories.map(category => `
                <div class="moderation-item" data-category-id="${category.category_id}">
                    <div class="item-content">
                        <div class="item-header">
                            <strong>
                                ${this.escapeHtml(category.category_name)}
                                ${category.is_private ? '<span class="badge badge-warning">Private</span>' : ''}
                            </strong>
                            <span class="item-meta">Order: ${category.display_order}</span>
                        </div>
                        <div class="item-preview">
                            ${this.escapeHtml(category.category_description || 'No description')}
                        </div>
                        <div class="item-context">
                            <span class="item-stats">
                                ${category.thread_count} threads, ${category.post_count} posts
                            </span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" data-action="edit-category" data-category-id="${category.category_id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" data-action="delete-category" data-category-id="${category.category_id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load categories:', error);
            return '<div class="empty-state"><p>Failed to load categories</p></div>';
        }
    }
    
    /**
     * Show create category modal
     */
    async showCreateCategoryModal() {
        await this.showCategoryModal(null);
    }
    
    /**
     * Show edit category modal
     */
    async showEditCategoryModal(categoryId) {
        try {
            const response = await this.apiClient.get('/api/forum/categories/get.php', {
                category_id: categoryId
            });
            
            if (response.status === 'success') {
                await this.showCategoryModal(response.data);
            } else {
                throw new Error(response.message || 'Failed to load category');
            }
        } catch (error) {
            console.error('Failed to load category:', error);
            this.app.showError('Failed to load category: ' + error.message);
        }
    }
    
    /**
     * Show category modal (create or edit)
     */
    async showCategoryModal(category) {
        const isEdit = category !== null;
        const categoryId = category ? category.category_id : null;
        
        // Load all categories for parent selection
        let parentCategories = [];
        try {
            const categoriesResponse = await this.apiClient.get('/api/forum/categories/list.php');
            if (categoriesResponse.status === 'success') {
                parentCategories = categoriesResponse.data.categories || [];
                // Filter out self if editing
                if (isEdit) {
                    parentCategories = parentCategories.filter(c => c.category_id != categoryId);
                }
            }
        } catch (error) {
            console.error('Failed to load categories for parent selection:', error);
        }
        
        const parentOptions = parentCategories.map(cat => 
            `<option value="${cat.category_id}" ${category && category.parent_category_id == cat.category_id ? 'selected' : ''}>
                ${this.escapeHtml(cat.category_name)}
            </option>`
        ).join('');
        
        const modalHtml = `
            <div class="modal show" id="category-modal" style="display: flex;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-folder${isEdit ? '-open' : '-plus'}"></i> ${isEdit ? 'Edit' : 'Create'} Category</h2>
                        <button type="button" class="close" id="close-category-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal__inner">
                        <form id="category-form">
                            <input type="hidden" id="category-id" value="${categoryId || ''}">
                            
                            <div class="form-group">
                                <label for="category-name">Category Name *</label>
                                <input type="text" id="category-name" name="category_name" 
                                    value="${category ? this.escapeHtml(category.category_name) : ''}" 
                                    required maxlength="100">
                            </div>
                            
                            <div class="form-group">
                                <label for="category-description">Description</label>
                                <textarea id="category-description" name="category_description" rows="3">${category ? this.escapeHtml(category.category_description || '') : ''}</textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="parent-category">Parent Category</label>
                                    <select id="parent-category" name="parent_category_id">
                                        <option value="">None (Top Level)</option>
                                        ${parentOptions}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="display-order">Display Order</label>
                                    <input type="number" id="display-order" name="display_order" 
                                        value="${category ? category.display_order : 0}" min="0">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="control">
                                        <input type="checkbox" id="is-private" name="is_private" 
                                            ${category && category.is_private ? 'checked' : ''}>
                                        <span class="box"></span>
                                        <span>Private Category</span>
                                    </label>
                                    <small class="form-help">Private categories are only visible to moderators</small>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="requires-permission">Requires Permission</label>
                                <input type="text" id="requires-permission" name="requires_permission" 
                                    value="${category ? this.escapeHtml(category.requires_permission || '') : ''}" 
                                    placeholder="e.g., 'admin', 'dm'">
                                <small class="form-help">Optional: Permission name required to access this category</small>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} Category
                                </button>
                                <button type="button" class="btn btn-secondary" id="cancel-category-modal">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        $('#category-modal').remove();
        
        // Add modal to page
        $('body').append(modalHtml);
        
        // Setup event handlers
        $('#close-category-modal, #cancel-category-modal').on('click', () => {
            $('#category-modal').remove();
        });
        
        $('#category-form').on('submit', async (e) => {
            e.preventDefault();
            await this.handleCategorySubmit(isEdit);
        });
        
        // Close on background click
        $('#category-modal').on('click', (e) => {
            if (e.target === e.currentTarget) {
                $('#category-modal').remove();
            }
        });
    }
    
    /**
     * Handle category form submission
     */
    async handleCategorySubmit(isEdit) {
        try {
            const categoryId = $('#category-id').val();
            const categoryName = $('#category-name').val().trim();
            const categoryDescription = $('#category-description').val().trim();
            const parentCategoryId = $('#parent-category').val() || null;
            const displayOrder = parseInt($('#display-order').val()) || 0;
            const isPrivate = $('#is-private').is(':checked');
            const requiresPermission = $('#requires-permission').val().trim() || null;
            
            if (!categoryName) {
                this.app.showError('Category name is required');
                return;
            }
            
            let response;
            
            if (isEdit) {
                response = await this.apiClient.put('/api/forum/categories/update.php', {
                    category_id: parseInt(categoryId),
                    category_name: categoryName,
                    category_description: categoryDescription || null,
                    parent_category_id: parentCategoryId ? parseInt(parentCategoryId) : null,
                    display_order: displayOrder,
                    is_private: isPrivate,
                    requires_permission: requiresPermission
                });
            } else {
                response = await this.apiClient.post('/api/forum/categories/create.php', {
                    category_name: categoryName,
                    category_description: categoryDescription || null,
                    parent_category_id: parentCategoryId ? parseInt(parentCategoryId) : null,
                    display_order: displayOrder,
                    is_private: isPrivate,
                    requires_permission: requiresPermission
                });
            }
            
            if (response.status === 'success') {
                this.app.showSuccess(`Category ${isEdit ? 'updated' : 'created'} successfully`);
                $('#category-modal').remove();
                
                // Reload moderation panel
                const content = await this.render();
                $('#content-area').html(content);
            } else {
                throw new Error(response.message || `Failed to ${isEdit ? 'update' : 'create'} category`);
            }
            
        } catch (error) {
            console.error('Category submit error:', error);
            this.app.showError(`Failed to ${isEdit ? 'update' : 'create'} category: ` + error.message);
        }
    }
    
    /**
     * Handle delete category
     */
    async handleDeleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category? This action cannot be undone. Categories with threads cannot be deleted.')) {
            return;
        }
        
        try {
            const response = await this.apiClient.delete('/api/forum/categories/delete.php', {
                category_id: categoryId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Category deleted successfully');
                // Reload moderation panel
                const content = await this.render();
                $('#content-area').html(content);
            } else {
                throw new Error(response.message || 'Failed to delete category');
            }
        } catch (error) {
            console.error('Delete category error:', error);
            this.app.showError('Failed to delete category: ' + error.message);
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
    /**
     * Escape HTML to prevent XSS
     * @deprecated Use global escapeHtml() function from utils.js instead
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
    
    /**
     * Initialize moderation module
     */
    init() {
        this.setupEventHandlers();
        console.log('Forum Moderation Module event handlers setup complete');
    }
}

// Export to window for use in app.js
window.ForumModerationModule = ForumModerationModule;