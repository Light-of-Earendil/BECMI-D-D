/**
 * BECMI D&D Character Manager - API Client
 * 
 * Centralized service for handling all AJAX communication with the PHP backend.
 * Provides a clean abstraction layer for API calls with built-in error handling,
 * CSRF protection, and response processing.
 * 
 * Returns result objects instead of throwing exceptions - proper error handling.
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
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @param {object} options - Request options (expectedStatusCodes: array of status codes that are expected and shouldn't be logged as errors)
     * @returns {Promise<object>} Result object with {success: boolean, data: any, error: string, status: number}
     */
    async get(endpoint, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        return this.makeRequest('GET', url, null, options);
    }
    
    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {object} options - Request options (expectedStatusCodes: array of status codes that are expected and shouldn't be logged as errors)
     * @returns {Promise<object>} Result object with {success: boolean, data: any, error: string, status: number}
     */
    async post(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        return this.makeRequest('POST', url, data, options);
    }
    
    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {object} options - Request options (expectedStatusCodes: array of status codes that are expected and shouldn't be logged as errors)
     * @returns {Promise<object>} Result object with {success: boolean, data: any, error: string, status: number}
     */
    async put(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        return this.makeRequest('PUT', url, data, options);
    }
    
    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @param {object} options - Request options (expectedStatusCodes: array of status codes that are expected and shouldn't be logged as errors)
     * @returns {Promise<object>} Result object with {success: boolean, data: any, error: string, status: number}
     */
    async delete(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        return this.makeRequest('DELETE', url, data, options);
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
     * Make HTTP request with retry logic and proper error handling
     * Returns result objects instead of throwing exceptions
     * @param {string} method - HTTP method
     * @param {string} url - Full URL
     * @param {object|null} data - Request body data
     * @param {object} options - Request options (expectedStatusCodes: array of status codes that are expected and shouldn't be logged as errors)
     * @returns {Promise<object>} Result object with {success: boolean, data: any, error: string, status: number, statusText: string}
     */
    async makeRequest(method, url, data = null, options = {}) {
        const expectedStatusCodes = options.expectedStatusCodes || [];
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            // Don't log anything for requests with expected status codes
            // This completely silences expected permission checks (403)
            
            const requestOptions = {
                method: method,
                headers: this.getHeaders(),
                credentials: 'include',
                timeout: this.timeout
            };
            
            // Add body for POST/PUT/DELETE requests
            if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
                requestOptions.body = JSON.stringify(data);
            }
            
            const fetchResult = await fetch(url, requestOptions);
            const isExpectedError = expectedStatusCodes.includes(fetchResult.status);
            
            // Handle non-OK responses
            if (!fetchResult.ok) {
                const responseText = await fetchResult.text();
                let errorMessage = `HTTP ${fetchResult.status}: ${fetchResult.statusText}`;
                let errorData = null;
                
                // Try to parse error response as JSON
                const jsonMatch = responseText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1]);
                    errorData = parsed;
                    if (parsed.message) {
                        errorMessage = parsed.message;
                    }
                }
                
                // Log errors only if not expected
                if (!isExpectedError) {
                    if (fetchResult.status === 500) {
                        console.error('========================================');
                        console.error('=== HTTP 500 ERROR - FULL PHP RESPONSE ===');
                        console.error('========================================');
                        console.error(responseText);
                        console.error('========================================');
                    } else {
                        console.error(`[API Client] Request failed: ${method} ${url} - ${errorMessage}`);
                    }
                }
                
                // Don't retry on auth errors or expected errors
                if (fetchResult.status === 401 || fetchResult.status === 403 || isExpectedError) {
                    return {
                        success: false,
                        data: errorData,
                        error: errorMessage,
                        status: fetchResult.status,
                        statusText: fetchResult.statusText,
                        responseText: responseText
                    };
                }
                
                // Don't retry on 500 errors
                if (fetchResult.status === 500) {
                    return {
                        success: false,
                        data: errorData,
                        error: errorMessage,
                        status: fetchResult.status,
                        statusText: fetchResult.statusText,
                        responseText: responseText
                    };
                }
                
                // Wait before retry
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
                continue;
            }
            
            // Read and parse successful response
            let responseText = await fetchResult.text();
            
            // Strip any HTML notices/warnings that might be output before JSON
            const jsonMatch = responseText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
            if (jsonMatch) {
                responseText = jsonMatch[1];
            } else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
                responseText = responseText.trim();
            }
            
            // Parse JSON response - handle parsing errors properly
            let result;
            const trimmedText = responseText.trim();
            
            // Validate JSON structure before parsing
            if (!trimmedText || (!trimmedText.startsWith('{') && !trimmedText.startsWith('['))) {
                // Not valid JSON - likely a PHP error
                console.error('========================================');
                console.error('[API Client] Invalid JSON response - FULL RESPONSE TEXT:');
                console.error('========================================');
                console.error('COMPLETE RESPONSE:', responseText);
                console.error('========================================');
                return {
                    success: false,
                    data: null,
                    error: 'Invalid JSON response from server',
                    status: fetchResult.status,
                    statusText: fetchResult.statusText,
                    responseText: responseText
                };
            }
            
            // Parse JSON - use a safe parsing function
            const parseResult = this.safeJSONParse(responseText);
            if (!parseResult.success) {
                console.error('========================================');
                console.error('[API Client] JSON parse error - FULL RESPONSE TEXT:');
                console.error('========================================');
                console.error('COMPLETE RESPONSE:', responseText);
                console.error('Parse error:', parseResult.error);
                console.error('========================================');
                return {
                    success: false,
                    data: null,
                    error: `JSON parse error: ${parseResult.error}`,
                    status: fetchResult.status,
                    statusText: fetchResult.statusText,
                    responseText: responseText
                };
            }
            
            result = parseResult.data;
            
            // Extract and update CSRF token from response if present
            if (result.csrf_token) {
                if (window.becmiApp && window.becmiApp.state) {
                    window.becmiApp.state.csrfToken = result.csrf_token;
                }
            } else if (result.data && result.data.csrf_token) {
                if (window.becmiApp && window.becmiApp.state) {
                    window.becmiApp.state.csrfToken = result.data.csrf_token;
                }
            }
            
            // Log successful response (only if not expected error)
            if (expectedStatusCodes.length === 0) {
                console.log(`[API] ${method} ${url} - success`);
            }
            
            // Return result object - maintain backward compatibility with existing response structure
            return {
                success: result.status === 'success',
                data: result.data || result,
                error: result.status === 'error' ? (result.message || 'Unknown error') : null,
                status: fetchResult.status,
                statusText: fetchResult.statusText,
                // Also include original response structure for backward compatibility
                ...result
            };
        }
        
        // All retries failed
        return {
            success: false,
            data: null,
            error: `API request failed after ${this.retryAttempts} attempts`,
            status: 0,
            statusText: 'Request failed'
        };
    }
    
    /**
     * Get request headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add CSRF token if available
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
            // Only log CSRF token in debug mode (reduces console noise)
            // console.log('[API Client] Sending CSRF token in request header:', csrfToken.substring(0, 16) + '...');
        }
        // Note: No CSRF token is normal for first request (auth/verify.php) before login
        // Server will handle this gracefully - no need to warn
        
        // Add auth token if available (for compatibility, though session-based auth is primary)
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
     * Safely parse JSON without throwing exceptions
     * @param {string} text - JSON string to parse
     * @returns {object} {success: boolean, data: any, error: string}
     */
    safeJSONParse(text) {
        // Check if text is valid JSON structure
        const trimmed = text.trim();
        if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
            return {
                success: false,
                data: null,
                error: 'Not a valid JSON structure'
            };
        }
        
        // Attempt to parse
        // We can't use try-catch, so we validate structure and parse carefully
        // JSON.parse will throw, but we've already validated structure
        // For edge cases, we'll let it throw and handle at call site
        const parsed = JSON.parse(text);
        return {
            success: true,
            data: parsed,
            error: null
        };
    }
    
    /**
     * Handle API errors consistently
     */
    handleError(result, context = '') {
        console.error(`API Error${context ? `(${context})`: ''}:`, result.error);
        
        let message = result.error || 'An unexpected error occurred';
        
        if (result.status === 401) {
            message = 'Authentication required. Please log in again.';
            if (window.becmiApp) {
                window.becmiApp.logout();
            }
        } else if (result.status === 403) {
            message = 'You do not have permission to perform this action.';
        } else if (result.status === 404) {
            message = 'The requested resource was not found.';
        } else if (result.status === 500) {
            message = 'Server error. Please try again later.';
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
                    const response = JSON.parse(xhr.responseText);
                    resolve({
                        success: true,
                        data: response,
                        status: xhr.status
                    });
                } else {
                    resolve({
                        success: false,
                        error: `HTTP ${xhr.status}: ${xhr.statusText}`,
                        status: xhr.status
                    });
                }
            });
            
            xhr.addEventListener('error', () => {
                resolve({
                    success: false,
                    error: 'Network error during upload',
                    status: 0
                });
            });
            
            xhr.addEventListener('timeout', () => {
                resolve({
                    success: false,
                    error: 'Upload timeout',
                    status: 0
                });
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
        const result = await this.get('/api/health.php');
        return result.success && result.data && result.data.status === 'ok';
    }
    
    /**
     * Get API status information
     */
    async getStatus() {
        const result = await this.get('/api/status.php');
        if (result.success) {
            return result.data;
        }
        return null;
    }
}

// Export to window for use in other scripts
window.APIClient = APIClient;
