/**
 * BECMI D&D Character Manager - API Client
 * 
 * Centralized service for handling all AJAX communication with the PHP backend.
 * Provides a clean abstraction layer for API calls with built-in error handling,
 * CSRF protection, and response processing.
 */

class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        console.log('API Client initialized');
    }
    
    /**
     * Make a GET request
     */
    async get(endpoint, params = {}) {
        const url = this.buildURL(endpoint, params);
        return this.makeRequest('GET', url);
    }
    
    /**
     * Make a POST request
     */
    async post(endpoint, data = {}) {
        const url = this.buildURL(endpoint);
        return this.makeRequest('POST', url, data);
    }
    
    /**
     * Make a PUT request
     */
    async put(endpoint, data = {}) {
        const url = this.buildURL(endpoint);
        return this.makeRequest('PUT', url, data);
    }
    
    /**
     * Make a DELETE request
     */
    async delete(endpoint, data = {}) {
        const url = this.buildURL(endpoint);
        return this.makeRequest('DELETE', url, data);
    }
    
    /**
     * Build complete URL with query parameters
     */
    buildURL(endpoint, params = {}) {
        // Ensure endpoint starts with /
        if (!endpoint.startsWith('/')) {
            endpoint = '/'+ endpoint;
        }
        
        // Add /api/ prefix for all endpoints
        if (!endpoint.startsWith('/api/')) {
            endpoint = '/api'+ endpoint;
        }
        
        let url = this.baseURL + endpoint;
        
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += '?'+ queryString;
        }
        
        return url;
    }
    
    /**
     * Make HTTP request with retry logic and error handling
     */
    async makeRequest(method, url, data = null) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`[API] ${method} ${url} (attempt ${attempt})`);
                
                const requestOptions = {
                    method: method,
                    headers: this.getHeaders(),
                    timeout: this.timeout
                };
                
                // Add body for POST/PUT/DELETE requests
                if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
                    console.log(`[API Client] Adding body to ${method} request:`, JSON.stringify(data));
                    requestOptions.body = JSON.stringify(data);
                }
                
                const response = await fetch(url, requestOptions);
                
                // Check if response is ok
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    let errorDetails = null;
                    let fullResponseText = '';
                    
                    // Try to get error details from response body
                    try {
                        fullResponseText = await response.text();
                        
                        // CRITICAL: For 500 errors, ALWAYS show full response text (PHP errors!)
                        if (response.status === 500) {
                            console.error('=== HTTP 500 ERROR - FULL PHP RESPONSE ===');
                            console.error(fullResponseText);
                            console.error('=== END PHP RESPONSE ===');
                        } else {
                            console.error('[API Client] Error response text:', fullResponseText);
                        }
                        
                        try {
                            const errorData = JSON.parse(fullResponseText);
                            errorDetails = errorData;
                            if (errorData.message) {
                                errorMessage = errorData.message;
                            }
                            if (errorData.errors) {
                                errorMessage += ' - '+ JSON.stringify(errorData.errors);
                            }
                        } catch (jsonError) {
                            // Not JSON - this is likely a PHP error page
                            console.error('[API Client] Response is not JSON - likely PHP error');
                            
                            // For 500 errors, try to extract useful info
                            if (response.status === 500 && fullResponseText.length > 0) {
                                // Try to extract PHP error from HTML or plain text
                                const lines = fullResponseText.split('\n').slice(0, 10); // First 10 lines
                                const errorSnippet = lines.join('\n');
                                console.error('Error snippet:', errorSnippet);
                                errorMessage = `Server error: ${errorSnippet.substring(0, 200)}...`;
                            } else if (fullResponseText.length > 0 && fullResponseText.length < 1000) {
                                errorMessage += ' - ' + fullResponseText;
                            }
                        }
                    } catch (e) {
                        console.error('[API Client] Could not read response text:', e);
                    }
                    
                    console.error('[API Client] Request failed:', {
                        method,
                        url,
                        status: response.status,
                        statusText: response.statusText,
                        errorMessage,
                        errorDetails,
                        fullResponseLength: fullResponseText.length
                    });
                    
                    const apiError = new Error(errorMessage);
                    apiError.responseText = fullResponseText;
                    throw apiError;
                }
                
                // Parse JSON response
                let result;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    throw new Error(`Invalid JSON response: ${jsonError.message}`);
                }
                
                // Log successful response
                console.log(`[API] ${method} ${url} - success`);
                
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`[API] ${method} ${url} - attempt ${attempt} failed:`, error.message);
                
                // Don't retry on authentication errors or server errors
                if (error.message.includes('401') || error.message.includes('403')) {
                    console.log('[API] Not retrying - authentication error');
                    break;
                }
                
                // Don't retry on 500 errors (PHP/server errors won't fix themselves)
                if (error.message.includes('500')) {
                    console.log('[API] Not retrying - server error (500)');
                    break;
                }
                
                // Wait before retry
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        
        // All retries failed
        console.error(`[API] ${method} ${url} - all attempts failed:`, lastError);
        
        // Log the full response text to see the actual PHP error
        if (lastError.responseText) {
            console.error('Full API Error Response:', lastError.responseText);
        }
        
        throw new Error(`API request failed after ${this.retryAttempts} attempts: ${lastError.message}`);
    }
    
    /**
     * Get request headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'};
        
        // Add CSRF token if available
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        // Add auth token if available
        const authToken = localStorage.getItem('auth_token');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        return headers;
    }
    
    /**
     * Get CSRF token from global state
     */
    getCSRFToken() {
        if (window.becmiApp && window.becmiApp.state) {
            return window.becmiApp.state.csrfToken;
        }
        return null;
    }
    
    /**
     * Delay execution for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Handle API errors consistently
     */
    handleError(error, context = '') {
        console.error(`API Error${context ? `(${context})`: ''}:`, error);
        
        let message = 'An unexpected error occurred';
        
        if (error.message.includes('401')) {
            message = 'Authentication required. Please log in again.';
            // Trigger logout
            if (window.becmiApp) {
                window.becmiApp.logout();
            }
        } else if (error.message.includes('403')) {
            message = 'You do not have permission to perform this action.';
        } else if (error.message.includes('404')) {
            message = 'The requested resource was not found.';
        } else if (error.message.includes('500')) {
            message = 'Server error. Please try again later.';
        } else if (error.message.includes('timeout')) {
            message = 'Request timed out. Please check your connection.';
        } else if (error.message.includes('NetworkError')) {
            message = 'Network error. Please check your connection.';
        }
        
        // Show error notification
        if (window.becmiApp && window.becmiApp.modules && window.becmiApp.modules.notifications) {
            window.becmiApp.modules.notifications.show(message, 'error');
        } else {
            console.error('API Error (notifications not available):', message);
        }
        
        return message;
    }
    
    /**
     * Upload file with progress tracking
     */
    async uploadFile(endpoint, file, onProgress = null) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });
            
            xhr.addEventListener('timeout', () => {
                reject(new Error('Upload timeout'));
            });
            
            xhr.timeout = this.timeout;
            xhr.open('POST', this.buildURL(endpoint));
            
            // Add auth headers
            const authToken = localStorage.getItem('auth_token');
            if (authToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
            }
            
            xhr.send(formData);
        });
    }
    
    /**
     * Test API connectivity
     */
    async testConnection() {
        try {
            const response = await this.get('/api/health.php');
            return response.status === 'ok';
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
    
    /**
     * Get API status information
     */
    async getStatus() {
        try {
            const response = await this.get('/api/status.php');
            return response;
        } catch (error) {
            console.error('Failed to get API status:', error);
            return null;
        }
    }
}

// Export to window for use in other scripts
window.APIClient = APIClient;
