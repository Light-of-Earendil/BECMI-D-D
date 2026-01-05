/**
 * BECMI D&D Character Manager - Forum Text Editor Module
 * 
 * Simple rich text editor with formatting toolbar for forum posts
 */

class ForumTextEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        
        this.options = {
            placeholder: options.placeholder || 'Write your post here...',
            minHeight: options.minHeight || '200px',
            maxHeight: options.maxHeight || '500px',
            onImageUpload: options.onImageUpload || null
        };
        
        this.uploadedImages = []; // Store temporarily uploaded images
        this.init();
    }
    
    /**
     * Initialize the editor
     */
    init() {
        // Create editor structure
        const editorHtml = `
            <div class="forum-text-editor">
                <div class="forum-editor-toolbar">
                    <button type="button" class="editor-btn" data-command="bold" title="Bold">
                        <i class="fas fa-bold"></i>
                    </button>
                    <button type="button" class="editor-btn" data-command="italic" title="Italic">
                        <i class="fas fa-italic"></i>
                    </button>
                    <button type="button" class="editor-btn" data-command="underline" title="Underline">
                        <i class="fas fa-underline"></i>
                    </button>
                    <div class="editor-separator"></div>
                    <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Bullet List">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <button type="button" class="editor-btn" data-command="insertOrderedList" title="Numbered List">
                        <i class="fas fa-list-ol"></i>
                    </button>
                    <div class="editor-separator"></div>
                    <button type="button" class="editor-btn" data-command="formatBlock" data-value="h2" title="Heading">
                        <i class="fas fa-heading"></i>
                    </button>
                    <button type="button" class="editor-btn" data-command="formatBlock" data-value="pre" title="Code Block">
                        <i class="fas fa-code"></i>
                    </button>
                    <div class="editor-separator"></div>
                    <button type="button" class="editor-btn" data-command="createLink" title="Insert Link">
                        <i class="fas fa-link"></i>
                    </button>
                    <button type="button" class="editor-btn" id="editor-upload-image-btn" title="Upload Image">
                        <i class="fas fa-image"></i>
                    </button>
                </div>
                <div class="forum-editor-content" contenteditable="true" id="${this.containerId}-editor"></div>
                <input type="file" id="${this.containerId}-file-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display: none;">
                <div class="forum-editor-uploaded-images" id="${this.containerId}-uploaded-images"></div>
            </div>
        `;
        
        this.container.innerHTML = editorHtml;
        
        // Get references
        this.editor = document.getElementById(`${this.containerId}-editor`);
        this.toolbar = this.container.querySelector('.forum-editor-toolbar');
        this.fileInput = document.getElementById(`${this.containerId}-file-input`);
        this.uploadedImagesContainer = document.getElementById(`${this.containerId}-uploaded-images`);
        
        // Set placeholder
        this.editor.setAttribute('data-placeholder', this.options.placeholder);
        
        // Set styles
        this.editor.style.minHeight = this.options.minHeight;
        this.editor.style.maxHeight = this.options.maxHeight;
        
        // Disable resize handle
        this.editor.style.resize = 'none';
        this.editor.style.overflowWrap = 'break-word';
        this.editor.style.wordWrap = 'break-word';
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Handle placeholder
        this.handlePlaceholder();
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Toolbar buttons
        this.toolbar.querySelectorAll('.editor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleToolbarClick(btn);
            });
        });
        
        // Image upload button
        const uploadBtn = document.getElementById('editor-upload-image-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.fileInput.click();
            });
        }
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });
        
        // Placeholder handling
        this.editor.addEventListener('input', () => {
            this.handlePlaceholder();
        });
        
        this.editor.addEventListener('focus', () => {
            this.handlePlaceholder();
        });
        
        this.editor.addEventListener('blur', () => {
            this.handlePlaceholder();
        });
        
        // Update toolbar button states
        this.editor.addEventListener('keyup', () => {
            this.updateToolbarState();
        });
        
        this.editor.addEventListener('mouseup', () => {
            this.updateToolbarState();
        });
    }
    
    /**
     * Handle toolbar button click
     */
    handleToolbarClick(button) {
        const command = button.dataset.command;
        const value = button.dataset.value || null;
        
        // Focus editor first
        this.editor.focus();
        
        if (command === 'createLink') {
            this.insertLink();
        } else if (command === 'formatBlock' && value) {
            document.execCommand('formatBlock', false, value);
        } else {
            document.execCommand(command, false, null);
        }
        
        // Update toolbar state
        this.updateToolbarState();
    }
    
    /**
     * Insert link
     */
    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            const text = window.getSelection().toString() || url;
            document.execCommand('insertHTML', false, `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener">${this.escapeHtml(text)}</a>`);
        }
    }
    
    /**
     * Handle image upload
     */
    async handleImageUpload(file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
            return;
        }
        
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('File too large. Maximum size is 5MB.');
            return;
        }
        
        // If callback provided, use it
        if (this.options.onImageUpload) {
            try {
                const result = await this.options.onImageUpload(file);
                if (result && result.success) {
                    this.uploadedImages.push({
                        file_path: result.file_path,
                        file_name: result.file_name,
                        attachment_id: result.attachment_id || null
                    });
                    this.displayUploadedImage(result);
                }
            } catch (error) {
                console.error('Image upload error:', error);
                alert('Failed to upload image: ' + error.message);
            }
        } else {
            // Default: create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = {
                    file_path: URL.createObjectURL(file),
                    file_name: file.name,
                    attachment_id: null,
                    temp: true
                };
                this.uploadedImages.push(imageData);
                this.displayUploadedImage(imageData);
            };
            reader.readAsDataURL(file);
        }
        
        // Reset file input
        this.fileInput.value = '';
    }
    
    /**
     * Display uploaded image preview
     */
    displayUploadedImage(imageData) {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'forum-editor-image-preview';
        imageDiv.innerHTML = `
            <img src="${this.escapeHtml(imageData.file_path)}" alt="${this.escapeHtml(imageData.file_name)}">
            <button type="button" class="editor-remove-image" data-file-path="${this.escapeHtml(imageData.file_path)}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Remove button handler
        const removeBtn = imageDiv.querySelector('.editor-remove-image');
        removeBtn.addEventListener('click', () => {
            this.removeUploadedImage(imageData.file_path);
            imageDiv.remove();
        });
        
        this.uploadedImagesContainer.appendChild(imageDiv);
    }
    
    /**
     * Remove uploaded image
     */
    removeUploadedImage(filePath) {
        this.uploadedImages = this.uploadedImages.filter(img => img.file_path !== filePath);
    }
    
    /**
     * Get uploaded images
     */
    getUploadedImages() {
        return this.uploadedImages.filter(img => !img.temp); // Only return non-temp images
    }
    
    /**
     * Update toolbar button states based on selection
     */
    updateToolbarState() {
        this.toolbar.querySelectorAll('.editor-btn').forEach(btn => {
            const command = btn.dataset.command;
            if (command === 'createLink' || command === 'formatBlock') {
                // Don't update state for these
                return;
            }
            
            try {
                const isActive = document.queryCommandState(command);
                btn.classList.toggle('active', isActive);
            } catch (e) {
                // Command not supported, ignore
            }
        });
    }
    
    /**
     * Handle placeholder
     */
    handlePlaceholder() {
        if (this.editor.textContent.trim() === '') {
            this.editor.classList.add('empty');
        } else {
            this.editor.classList.remove('empty');
        }
    }
    
    /**
     * Get editor content (HTML)
     */
    getContent() {
        return this.editor.innerHTML.trim();
    }
    
    /**
     * Set editor content (HTML)
     */
    setContent(html) {
        this.editor.innerHTML = html || '';
        this.handlePlaceholder();
    }
    
    /**
     * Get plain text content
     */
    getTextContent() {
        return this.editor.textContent.trim();
    }
    
    /**
     * Clear editor
     */
    clear() {
        this.editor.innerHTML = '';
        this.uploadedImages = [];
        this.uploadedImagesContainer.innerHTML = '';
        this.handlePlaceholder();
    }
    
    /**
     * Insert HTML at cursor position
     */
    insertHTML(html) {
        this.editor.focus();
        document.execCommand('insertHTML', false, html);
        this.handlePlaceholder();
    }
    
    /**
     * Escape HTML
     */
    /**
     * Escape HTML to prevent XSS
     * @deprecated Use global escapeHtml() function from utils.js instead
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
}

// Export to window
window.ForumTextEditor = ForumTextEditor;
