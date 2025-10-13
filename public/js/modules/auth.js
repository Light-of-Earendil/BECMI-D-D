/**
 * BECMI D&D Character Manager - Authentication Module
 * 
 * Handles user authentication, registration, && session management.
 */

class AuthModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        
        console.log('Auth Module initialized');
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
            const response = await this.apiClient.post('/api/auth/login.php', loginData);
            
            if (response.status === 'success') {
                // Store auth token
                localStorage.setItem('auth_token', response.data.session_id);
                
                // Update app state
                this.app.updateState({
                    user: response.data,
                    csrfToken: response.data.csrf_token
                });
                
                // Hide modal && show app
                $('.modal').removeClass('show');
                this.app.updateUserInterface();
                
                // Load user data
                await this.app.loadUserData();
                
                // Navigate to dashboard
                this.app.navigateToView('dashboard');
                
                // Show success message
                this.app.showSuccess('Welcome back, '+ response.data.username + '!');
                
                // Emit login event
                if (this.app.eventBus) {
                    this.app.eventBus.emit('user:login', response.data);
                }
                
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
     * Handle registration form submission
     */
    async handleRegister(event) {
        const form = event.target;
        const formData = new FormData(form);

        const passwordField = $('#reg-password');
        const confirmField = $('#reg-confirm-password');

        console.log('Registration field check:', {
            passwordFieldFound: passwordField.length > 0,
            confirmFieldFound: confirmField.length > 0,
            passwordFieldId: passwordField.attr('id'),
            confirmFieldId: confirmField.attr('id'),
            passwordFieldValue: passwordField.val(),
            confirmFieldValue: confirmField.val()
        });

        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: passwordField.val(),
            confirm_password: confirmField.val()
        };

        console.log('Registration data:', {
            username: registerData.username,
            email: registerData.email,
            password: registerData.password,
            confirm_password: registerData.confirm_password,
            passwordsMatch: registerData.password === registerData.confirm_password,
            passwordLength: registerData.password.length,
            confirmLength: registerData.confirm_password.length
        });

        try {
            this.setFormLoading(form, true);

            if (registerData.password !== registerData.confirm_password) {
                this.showFormError(form, 'Passwords do not match');
                return;
            }

            const response = await this.apiClient.post('/api/auth/register.php', registerData);

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
                this.showFormError(form, response.message || 'Registration failed');
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
        const email = $('#forgot-email').val();

        try {
            this.clearFormFeedback(form);
            this.setFormLoading(form, true);

            const response = await this.apiClient.post('/api/auth/request-password-reset.php', { email });

            if (response.status === 'success') {
                this.showFormSuccess(form, response.message || 'If the email exists, a reset link has been sent.');
            } else {
                this.showFormError(form, response.message || 'Unable to request password reset.');
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
            console.log('=== PASSWORD RESET DEBUG ===');
            console.log('Selector:', selector);
            console.log('Token:', token);
            console.log('Password length:', password.length);
            console.log('Passwords match:', password === confirmPassword);
            
            this.clearFormFeedback(form);

            if (password !== confirmPassword) {
                console.log('ERROR: Passwords do not match');
                this.showFormError(form, 'Passwords do not match');
                return;
            }

            const validation = this.validatePassword(password);
            if (!validation.valid) {
                console.log('ERROR: Password validation failed:', validation.message);
                this.showFormError(form, validation.message);
                return;
            }

            this.setFormLoading(form, true);
            
            console.log('Sending password reset request...');

            const response = await this.apiClient.post('/api/auth/reset-password.php', {
                selector,
                token,
                password,
                confirm_password: confirmPassword
            });
            
            console.log('Password reset response:', response);
            console.log('Response status:', response.status);
            console.log('Response message:', response.message);

            if (response.status === 'success') {
                console.log('SUCCESS: Password reset successful');
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
                console.log('ERROR: Response status not success');
                console.log('Full response object:', JSON.stringify(response));
                this.showFormError(form, response.message || 'Unable to reset password.');
            }
        } catch (error) {
            console.error('=== PASSWORD RESET EXCEPTION ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            console.error('Error stack:', error.stack);
            
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
        console.log('=== CHECKING FOR PASSWORD RESET TOKEN ===');
        console.log('Full URL:', window.location.href);
        console.log('Search params:', window.location.search);
        
        const params = new URLSearchParams(window.location.search);
        const hasReset = params.get('password-reset');
        const selector = params.get('selector');
        const token = params.get('token');
        
        console.log('Parsed params:', {
            hasReset,
            selector,
            selectorLength: selector ? selector.length : 0,
            token,
            tokenLength: token ? token.length : 0
        });

        if (hasReset && selector && token) {
            console.log('Opening password reset modal with:');
            console.log('Selector:', selector);
            console.log('Token:', token);
            this.showPasswordResetModal(selector, token);
        } else {
            console.log('Missing required parameters for password reset');
        }
    }

    clearFormFeedback(form) {
        if (!form) {
            return;
        }

        form.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
        form.querySelectorAll('.field-error').forEach(el => el.remove());
        form.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '';
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
        errorEl.style.color = 'var(--error-color, #dc3545)';
        errorEl.style.fontSize = 'var(--font-size-sm, 0.875rem)';
        errorEl.style.marginTop = 'var(--spacing-sm, 0.5rem)';
        errorEl.style.padding = 'var(--spacing-sm, 0.5rem)';
        errorEl.style.backgroundColor = 'var(--error-bg, #f8d7da)';
        errorEl.style.border = '1px solid var(--error-border, #f5c6cb)';
        errorEl.style.borderRadius = 'var(--border-radius, 0.25rem)';
        errorEl.textContent = message;
        
        form.appendChild(errorEl);
    }
    
    /**
     * Show form success message
     */
    showFormSuccess(form, message) {
        this.clearFormFeedback(form);
        
        const successEl = document.createElement('div');
        successEl.className = 'success-message';
        successEl.style.color = 'var(--success-color, #155724)';
        successEl.style.fontSize = 'var(--font-size-sm, 0.875rem)';
        successEl.style.marginTop = 'var(--spacing-sm, 0.5rem)';
        successEl.style.padding = 'var(--spacing-sm, 0.5rem)';
        successEl.style.backgroundColor = 'var(--success-bg, #d4edda)';
        successEl.style.border = '1px solid var(--success-border, #c3e6cb)';
        successEl.style.borderRadius = 'var(--border-radius, 0.25rem)';
        successEl.textContent = message;
        
        form.appendChild(successEl);
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
        
        // Debug: Check if fields are found
        console.log('Field detection:', {
            passwordFieldFound: passwordField.length > 0,
            confirmFieldFound: confirmField.length > 0,
            passwordFieldId: passwordField.attr('id'),
            confirmFieldId: confirmField.attr('id'),
            passwordFieldName: passwordField.attr('name'),
            confirmFieldName: confirmField.attr('name')
        });
        
        if (passwordField.length === 0 || confirmField.length === 0) {
            console.log('Fields not found!');
            return; // Fields don't exist
        }
        
        const password = passwordField.val();
        const confirmPassword = confirmField.val();
        
        // Debug logging with more details
        console.log('Password validation:', {
            password: password,
            confirmPassword: confirmPassword,
            passwordLength: password.length,
            confirmLength: confirmPassword.length,
            match: password === confirmPassword,
            passwordType: typeof password,
            confirmType: typeof confirmPassword
        });
        
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
        
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.style.color = 'var(--error-color)';
        errorEl.style.fontSize = 'var(--font-size-xs)';
        errorEl.style.marginTop = 'var(--spacing-xs)';
        errorEl.textContent = message;
        
        field.parentNode.appendChild(errorEl);
        field.style.borderColor = 'var(--error-color)';
    }
    
    /**
     * Clear field-specific error
     */
    clearFieldError(field) {
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
        field.style.borderColor = '';
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
        });

        $(document).off("click", "#back-to-login-from-reset").on("click", "#back-to-login-from-reset", function(e) {
            e.preventDefault();
            self.clearFormFeedback(document.getElementById("password-reset-form"));
            document.getElementById("password-reset-form").reset();
            $("#password-reset-modal").removeClass('show');
            $("#login-modal").addClass('show');
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

        console.log("Auth Module initialized");
    }
}

// Export to window for use in app.js
window.AuthModule = AuthModule;



