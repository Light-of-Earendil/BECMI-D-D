/**
 * BECMI D&D Character Manager - Authentication Module
 * 
 * Handles user authentication, registration, && session management.
 */

class AuthModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.googleLoginRendered = false;
        this.googleLoginRenderTimer = null;
        
    }
    
    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        const form = event.target;
        const formData = new FormData(form);
        
        const loginData = {
            username: formData.get('username'),
            password: $('input[name="password"]').val()
        };
        
        try {
            // Show loading state
            this.setFormLoading(form, true);
            
            // Make login request
            const response = await this.apiClient.post('/api/auth/login.php', loginData, {
                expectedStatusCodes: [401, 403, 422, 429]
            });
            
            if (response.status === 'success') {
                await this.completeLogin(response, 'Welcome back, ' + response.data.username + '!');
            } else {
                this.showFormError(form, response.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Extract specific error message
            let errorMessage = 'Login failed. Please check your credentials.';
            
            if (error.message.includes('422')) {
                errorMessage = 'Please check your input && try again.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Too many attempts. Please wait a moment && try again.';
            } else if (error.message.includes('Invalid username or password')) {
                errorMessage = 'Invalid username or password. Please try again.';
            } else if (error.message.includes('Account is disabled')) {
                errorMessage = 'Your account has been disabled. Please contact support.';
            }
            
            this.showFormError(form, errorMessage);
        } finally {
            this.setFormLoading(form, false);
        }
    }

    /**
     * Handle a Google Identity Services credential callback.
     */
    async handleGoogleCredential(googleResponse) {
        const form = document.getElementById('login-form');
        if (!form) {
            return;
        }

        this.clearFormFeedback(form);

        const credential = (googleResponse && googleResponse.credential) ? googleResponse.credential : '';
        if (!credential) {
            this.showFormError(form, 'Google login could not be completed. Please try again.');
            return;
        }

        try {
            const response = await this.apiClient.post('/api/auth/google-login.php', {
                credential: credential
            });

            if (response.status === 'success') {
                await this.completeLogin(response, 'Welcome, ' + response.data.username + '!');
                return;
            }

            this.showFormError(form, response.message || 'Google login failed');
        } catch (error) {
            console.error('Google login error:', error);
            this.showFormError(form, 'Google login failed. Please try again.');
        }
    }

    /**
     * Finish a successful authentication flow.
     */
    async completeLogin(response, successMessage) {
        localStorage.removeItem('auth_token');

        this.app.updateState({
            user: response.data,
            csrfToken: response.data.csrf_token
        });

        $('.modal').removeClass('show');
        this.app.updateUserInterface();

        await this.app.loadUserData();
        this.app.navigateToView('dashboard');
        this.app.showSuccess(successMessage);

        if (this.app.eventBus) {
            this.app.eventBus.emit('user:login', response.data);
        }
    }

    /**
     * Initialize Google Login button when configured.
     */
    setupGoogleLogin() {
        const googleAuthConfig = window.BECMI_RUNTIME_CONFIG && window.BECMI_RUNTIME_CONFIG.googleAuth
            ? window.BECMI_RUNTIME_CONFIG.googleAuth
            : { enabled: false, clientId: '' };

        const section = document.getElementById('google-login-section');
        const buttonContainer = document.getElementById('google-login-button');
        const status = document.getElementById('google-login-status');

        if (!section || !buttonContainer || !status) {
            return;
        }

        if (!googleAuthConfig.enabled || !googleAuthConfig.clientId) {
            section.hidden = true;
            this.googleLoginRendered = false;
            return;
        }

        section.hidden = false;

        const renderButton = () => {
            if (!(window.google && window.google.accounts && window.google.accounts.id)) {
                return false;
            }

            if (!this.googleLoginRendered) {
                window.google.accounts.id.initialize({
                    client_id: googleAuthConfig.clientId,
                    callback: (response) => this.handleGoogleCredential(response),
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                this.googleLoginRendered = true;
            }

            buttonContainer.innerHTML = '';
            window.google.accounts.id.renderButton(buttonContainer, {
                theme: 'outline',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                width: Math.max(260, Math.min(buttonContainer.clientWidth || 320, 360))
            });
            status.textContent = 'Continue with your Google account.';
            return true;
        };

        if (renderButton()) {
            if (this.googleLoginRenderTimer) {
                clearTimeout(this.googleLoginRenderTimer);
                this.googleLoginRenderTimer = null;
            }
            return;
        }

        status.textContent = 'Loading Google Login...';

        if (this.googleLoginRenderTimer) {
            clearTimeout(this.googleLoginRenderTimer);
        }

        this.googleLoginRenderTimer = setTimeout(() => {
            if (!renderButton()) {
                status.textContent = 'Google Login is temporarily unavailable.';
            }
        }, 750);
    }
    
/**
     * Handle registration form submission
     */
    async handleRegister(event) {
        const form = event.target;
        const formData = new FormData(form);

        const passwordField = $('#reg-password');
        const confirmField = $('#reg-confirm-password');

        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: passwordField.val(),
            confirm_password: confirmField.val()
        };

        try {
            this.setFormLoading(form, true);

            if (registerData.password !== registerData.confirm_password) {
                this.showFormError(form, 'Passwords do not match');
                return;
            }

            const response = await this.apiClient.post('/api/auth/register.php', registerData, {
                expectedStatusCodes: [422, 429]
            });

            if (response.status === 'success') {
                this.showFormSuccess(form, 'Account created successfully! Please log in.');

                setTimeout(() => {
                    $('#register-modal').removeClass('show');
                    $('#login-modal').addClass('show');
                    form.reset();
                }, 2000);

                if (this.app.eventBus) {
                    this.app.eventBus.emit('user:register', response.data);
                }
            } else {
                const fieldErrors = response?.errors || response?.data?.errors || null;

                if (fieldErrors && typeof fieldErrors === 'object') {
                    this.showFormError(form, 'Please correct the highlighted fields.');

                    const fieldSelectors = {
                        username: '#reg-username',
                        email: '#reg-email',
                        password: '#reg-password',
                        confirm_password: '#reg-confirm-password'
                    };

                    Object.entries(fieldSelectors).forEach(([fieldName, selector]) => {
                        const message = fieldErrors[fieldName];
                        const field = form.querySelector(selector);

                        if (message && field) {
                            this.showFieldError(field, message);
                        }
                    });
                } else {
                    this.showFormError(form, response.message || 'Registration failed');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);

            let errorMessage = 'Registration failed. Please try again.';

            if (error.message.includes('422')) {
                errorMessage = 'Please check your input && try again.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Too many attempts. Please wait a moment && try again.';
            } else if (error.message.includes('Username already exists')) {
                errorMessage = 'Username already exists. Please choose a different username.';
            } else if (error.message.includes('Email already exists')) {
                errorMessage = 'Email already exists. Please use a different email.';
            } else if (error.message.includes('Invalid email format')) {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.message.includes('Password must be at least 8 characters')) {
                errorMessage = 'Password must be at least 8 characters with letters && numbers.';
            } else if (error.message.includes('Passwords do not match')) {
                errorMessage = 'Passwords do not match. Please try again.';
            }

            this.showFormError(form, errorMessage);
        } finally {
            this.setFormLoading(form, false);
        }
    }

    /**
     * Handle password reset request
     */
    async handleForgotPassword(event) {
        const form = event.target;
        const email = ($('#forgot-email').val() || '').trim();

        try {
            this.clearFormFeedback(form);

            if (!email) {
                this.showFormError(form, 'Enter your email to receive a reset link.');
                return;
            }

            if (!this.validateEmail(email)) {
                this.showFormError(form, 'Enter a valid email address.');
                return;
            }

            this.setFormLoading(form, true);

            const response = await this.apiClient.post('/api/auth/request-password-reset.php', { email }, {
                expectedStatusCodes: [422, 429]
            });

            if (response.status === 'success') {
                this.showFormSuccess(form, response.message || 'If the email exists, a reset link has been sent.');
            } else {
                const emailFieldError = response?.data?.errors?.email;
                this.showFormError(form, emailFieldError || response.message || 'Unable to request password reset.');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            let message = 'Unable to request password reset. Please try again later.';
            if (error.message && error.message.includes('429')) {
                message = 'Too many requests. Please wait a few minutes before trying again.';
            }
            this.showFormError(form, message);
        } finally {
            this.setFormLoading(form, false);
        }
    }

    /**
     * Handle resetting the password with selector/token
     */
    async handlePasswordReset(event) {
        const form = event.target;
        const selector = $('#reset-selector').val();
        const token = $('#reset-token').val();
        const password = $('#reset-password').val();
        const confirmPassword = $('#reset-confirm-password').val();

        try {
            this.clearFormFeedback(form);

            if (password !== confirmPassword) {
                this.showFormError(form, 'Passwords do not match');
                return;
            }

            const validation = this.validatePassword(password);
            if (!validation.valid) {
                this.showFormError(form, validation.message);
                return;
            }

            this.setFormLoading(form, true);

            const response = await this.apiClient.post('/api/auth/reset-password.php', {
                selector,
                token,
                password,
                confirm_password: confirmPassword
            }, {
                expectedStatusCodes: [400, 422, 429]
            });

            if (response.status === 'success') {
                this.showFormSuccess(form, response.message || 'Password updated successfully.');
                setTimeout(() => {
                    $('#password-reset-modal').removeClass('show');
                    $('#login-modal').addClass('show');
                    form.reset();
                }, 2000);
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                this.showFormError(form, response.message || 'Unable to reset password.');
            }
        } catch (error) {
            let message = 'Unable to reset password. Please try again later.';
            if (error.message && error.message.includes('400')) {
                message = 'Reset code is invalid or has expired.';
            } else if (error.message) {
                // Show the actual error message
                message = error.message;
            }
            this.showFormError(form, message);
        } finally {
            this.setFormLoading(form, false);
        }
    }

    showForgotPasswordModal() {
        this.clearFormFeedback(document.getElementById('forgot-password-form'));
        document.getElementById('forgot-password-form').reset();
        $('.modal').removeClass('show');
        $('#forgot-password-modal').addClass('show');
    }

    showPasswordResetModal(selector = '', token = '') {
        this.clearFormFeedback(document.getElementById('password-reset-form'));
        const resetForm = document.getElementById('password-reset-form');
        if (resetForm) {
            resetForm.reset();
        }
        $('#reset-selector').val(selector);
        $('#reset-token').val(token);
        $('.modal').removeClass('show');
        $('#password-reset-modal').addClass('show');
    }

    checkForPasswordResetToken() {
        const params = new URLSearchParams(window.location.search);
        const hasReset = params.get('password-reset');
        const selector = params.get('selector');
        const token = params.get('token');

        if (hasReset && selector && token) {
            this.showPasswordResetModal(selector, token);
        }
    }

    clearFormFeedback(form) {
        if (!form) {
            return;
        }

        form.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
        form.querySelectorAll('.field-error').forEach(el => el.remove());
        form.querySelectorAll('input').forEach(input => {
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
        });
    }

    /**
     * Validate username format
     */
    validateUsername(username) {
        // Username must be 3-50 characters, alphanumeric and underscores only
        return /^[a-zA-Z0-9_]{3,50}$/.test(username);
    }
    
    /**
     * Validate email format
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate password strength
     */
    validatePassword(password) {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters'};
        }
        
        if (!/[a-zA-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one letter'};
        }
        
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number'};
        }
        
        return { valid: true, message: 'Password is valid'};
    }
    
    /**
     * Set form loading state
     */
    setFormLoading(form, isLoading) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            if (isLoading) {
                submitButton.disabled = true;
                submitButton.setAttribute('data-original-text', submitButton.textContent);
                submitButton.textContent = 'Loading...';
            } else {
                submitButton.disabled = false;
                const originalText = submitButton.getAttribute('data-original-text');
                if (originalText) {
                    submitButton.textContent = originalText;
                }
            }
        }
    }
    
    /**
     * Show form error message
     */
    showFormError(form, message) {
        this.clearFormFeedback(form);
        
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.setAttribute('role', 'alert');
        errorEl.textContent = message;

        const actions = form.querySelector('.form-actions');
        if (actions) {
            form.insertBefore(errorEl, actions);
        } else {
            form.appendChild(errorEl);
        }
    }
    
    /**
     * Show form success message
     */
    showFormSuccess(form, message) {
        this.clearFormFeedback(form);
        
        const successEl = document.createElement('div');
        successEl.className = 'success-message';
        successEl.setAttribute('role', 'status');
        successEl.textContent = message;

        const actions = form.querySelector('.form-actions');
        if (actions) {
            form.insertBefore(successEl, actions);
        } else {
            form.appendChild(successEl);
        }
    }
    
    /**
     * Setup password visibility toggle buttons
     */
    setupPasswordVisibilityToggles() {
        const self = this;
        
        // Handle click on password toggle buttons
        $(document).off('click', '.password-toggle-btn').on('click', '.password-toggle-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const button = $(this);
            const icon = button.find('i');
            const input = button.closest('.password-input-wrapper').find('input');
            
            if (input.length === 0) {
                console.warn('Password toggle: Input field not found');
                return;
            }
            
            // Toggle input type between password and text
            const currentType = input.attr('type');
            const newType = currentType === 'password' ? 'text' : 'password';
            input.attr('type', newType);
            
            // Toggle icon between eye and eye-slash
            if (newType === 'text') {
                icon.removeClass('fa-eye').addClass('fa-eye-slash');
                button.attr('aria-label', 'Hide password');
            } else {
                icon.removeClass('fa-eye-slash').addClass('fa-eye');
                button.attr('aria-label', 'Show password');
            }
            
        });
    }
    
    /**
     * Setup form validation
     */
    setupFormValidation() {
        const self = this; // Capture this context
        
        // Username validation
        $(document).off('input', 'input[name="username"]').on('input', 'input[name="username"]', function(e) {
            const username = e.target.value;
            const isValid = self.validateUsername(username);
            
            if (username.length > 0 && !isValid) {
                self.showFieldError(e.target, 'Username must be 3-50 characters, alphanumeric && underscores only');
            } else {
                self.clearFieldError(e.target);
            }
        });
        
        // Email validation
        $(document).off('input', 'input[name="email"]').on('input', 'input[name="email"]', function(e) {
            const email = e.target.value;
            const isValid = self.validateEmail(email);
            
            if (email.length > 0 && !isValid) {
                self.showFieldError(e.target, 'Please enter a valid email address');
            } else {
                self.clearFieldError(e.target);
            }
        });
        
        // Password validation
        $(document).off('input', 'input[name="password"]').on('input', 'input[name="password"]', function(e) {
            const password = e.target.value;
            const validation = self.validatePassword(password);
            
            if (password.length > 0 && !validation.valid) {
                self.showFieldError(e.target, validation.message);
            } else {
                self.clearFieldError(e.target);
            }
        });
        
        // Password validation (register form)
        $(document).off('input', '#reg-password').on('input', '#reg-password', function(e) {
            const password = e.target.value;
            const validation = self.validatePassword(password);
            
            if (password.length > 0 && !validation.valid) {
                self.showFieldError(e.target, validation.message);
            } else {
                self.clearFieldError(e.target);
            }
            self.validatePasswordMatch(self);
        });
        
        // Password confirmation (register form)
        $(document).off('input', '#reg-confirm-password').on('input', '#reg-confirm-password', function(e) {
            self.validatePasswordMatch(self);
        });
        
        // Handle paste events for better copy-paste support (register form)
        $(document).off('paste', '#reg-password, #reg-confirm-password').on('paste', '#reg-password, #reg-confirm-password', function(e) {
            // Small delay to allow paste to complete
            setTimeout(() => {
                self.validatePasswordMatch(self);
            }, 10);
        });
        
        // Handle change events for all input types (register form)
        $(document).off('change', '#reg-password, #reg-confirm-password').on('change', '#reg-password, #reg-confirm-password', function(e) {
            self.validatePasswordMatch(self);
        });
        
        // Form submission handlers
        $(document).off('submit', '#login-form').on('submit', '#login-form', function(e) {
            e.preventDefault();
            self.handleLogin(e);
        });
        
        $(document).off('submit', '#register-form').on('submit', '#register-form', function(e) {
            e.preventDefault();
            self.handleRegister(e);
        });
    }
    
    /**
     * Validate password match
     */
    validatePasswordMatch(self = this) {
        const passwordField = $('#reg-password');
        const confirmField = $('#reg-confirm-password');

        if (passwordField.length === 0 || confirmField.length === 0) {
            return; // Fields don't exist
        }
        
        const password = passwordField.val();
        const confirmPassword = confirmField.val();

        // Only validate if both fields have content
        if (password.length > 0 && confirmPassword.length > 0) {
            if (password !== confirmPassword) {
                self.showFieldError(confirmField[0], 'Passwords do not match');
            } else {
                self.clearFieldError(confirmField[0]);
            }
        } else if (confirmPassword.length > 0) {
            // Only confirm password has content
            if (password !== confirmPassword) {
                self.showFieldError(confirmField[0], 'Passwords do not match');
            } else {
                self.clearFieldError(confirmField[0]);
            }
        } else {
            // Clear any existing errors
            self.clearFieldError(confirmField[0]);
        }
    }
    
    /**
     * Show field-specific error
     */
    showFieldError(field, message) {
        this.clearFieldError(field);

        const errorContainer = field.closest('.form-group') || field.parentNode;
        
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.textContent = message;
        
        errorContainer.appendChild(errorEl);
        field.classList.add('is-invalid');
        field.setAttribute('aria-invalid', 'true');
    }
    
    /**
     * Clear field-specific error
     */
    clearFieldError(field) {
        const errorContainer = field.closest('.form-group') || field.parentNode;
        const errorEl = errorContainer.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
        field.classList.remove('is-invalid');
        field.removeAttribute('aria-invalid');
    }
    
    /**
     * Initialize authentication module
     */
    init() {
        const self = this; // Capture this context
        
        // Store original button text
        $("button[type=\"submit\"]").each(function() {
            $(this).attr("data-original-text", $(this).text());
        });

        // Setup form validation
        this.setupFormValidation();
        
        // Setup password visibility toggles
        this.setupPasswordVisibilityToggles();

        // Auth form event bindings
        $(document).off("click", "#show-register").on("click", "#show-register", function(e) {
            e.preventDefault();
            self.clearFormFeedback(document.getElementById("login-form"));
            document.getElementById("login-form").reset();
            $("#login-modal").removeClass('show');
            $("#register-modal").addClass('show');
        });

        $(document).off("click", "#show-login").on("click", "#show-login", function(e) {
            e.preventDefault();
            self.clearFormFeedback(document.getElementById("register-form"));
            document.getElementById("register-form").reset();
            $("#register-modal").removeClass('show');
            $("#login-modal").addClass('show');
            self.setupGoogleLogin();
        });

        $(document).off("click", "#show-forgot-password").on("click", "#show-forgot-password", function(e) {
            e.preventDefault();
            self.showForgotPasswordModal();
        });

        $(document).off("click", "#back-to-login-from-forgot").on("click", "#back-to-login-from-forgot", function(e) {
            e.preventDefault();
            self.clearFormFeedback(document.getElementById("forgot-password-form"));
            document.getElementById("forgot-password-form").reset();
            $("#forgot-password-modal").removeClass('show');
            $("#login-modal").addClass('show');
            self.setupGoogleLogin();
        });

        $(document).off("click", "#back-to-login-from-reset").on("click", "#back-to-login-from-reset", function(e) {
            e.preventDefault();
            self.clearFormFeedback(document.getElementById("password-reset-form"));
            document.getElementById("password-reset-form").reset();
            $("#password-reset-modal").removeClass('show');
            $("#login-modal").addClass('show');
            self.setupGoogleLogin();
        });

        $(document).off("submit", "#forgot-password-form").on("submit", "#forgot-password-form", function(e) {
            e.preventDefault();
            self.handleForgotPassword(e);
        });

        $(document).off("submit", "#password-reset-form").on("submit", "#password-reset-form", function(e) {
            e.preventDefault();
            self.handlePasswordReset(e);
        });

        this.checkForPasswordResetToken();
        this.setupGoogleLogin();

    }
}

// Export to window for use in app.js
window.AuthModule = AuthModule;
