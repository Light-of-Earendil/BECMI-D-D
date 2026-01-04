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
                    credentials: 'include', // Include cookies (session) in request
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
                        
                        // CRITICAL: For 500 errors, ALWAYS show FULL response text (PHP errors!)
                        if (response.status === 500) {
                            console.error('========================================');
                            console.error('=== HTTP 500 ERROR - FULL PHP RESPONSE ===');
                            console.error('========================================');
                            console.error(fullResponseText);
                            console.error('========================================');
                            console.error('=== END PHP RESPONSE ===');
                            console.error('========================================');
                            console.error('Response length:', fullResponseText.length, 'characters');
                            
                            // Also try to extract line number if it's a PHP error
                            const lineMatch = fullResponseText.match(/on line (\d+)/i);
                            if (lineMatch) {
                                console.error('PHP Error on line:', lineMatch[1]);
                            }
                            
                            const fileMatch = fullResponseText.match(/in (.+\.php)/i);
                            if (fileMatch) {
                                console.error('PHP Error in file:', fileMatch[1]);
                            }
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
                            
                            // For 500 errors, use full response text
                            if (response.status === 500 && fullResponseText.length > 0) {
                                // Show first 500 characters in error message, but full text is already logged above
                                errorMessage = `Server error (500): ${fullResponseText.substring(0, 500)}${fullResponseText.length > 500 ? '...' : ''}`;
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
                    apiError.responseText = fullResponseText; // Store full response text for later logging
                    apiError.status = response.status;
                    apiError.statusText = response.statusText;
                    throw apiError;
                }
                
                // Read response as text first (so we can use it for error messages)
                let responseText = await response.text();
                
                // Strip any HTML notices/warnings that might be output before JSON
                // Look for JSON object/array at the start or after HTML
                const jsonMatch = responseText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                if (jsonMatch) {
                    // Use only the JSON part
                    responseText = jsonMatch[1];
                } else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
                    // Already starts with JSON, but might have leading whitespace
                    responseText = responseText.trim();
                }
                
                // Try to parse as JSON
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (jsonError) {
                    // Log FULL response text for debugging - CRITICAL for finding PHP errors
                    console.error('========================================');
                    console.error('[API Client] JSON parse error - FULL RESPONSE TEXT:');
                    console.error('========================================');
                    console.error('COMPLETE RESPONSE:', responseText);
                    console.error('========================================');
                    console.error('Response length:', responseText.length);
                    console.error('Response status:', response.status);
                    console.error('Response statusText:', response.statusText);
                    console.error('First 500 chars:', responseText.substring(0, 500));
                    console.error('Last 500 chars:', responseText.substring(Math.max(0, responseText.length - 500)));
                    console.error('========================================');
                    
                    // Extract PHP error message - try multiple patterns
                    let errorMsg = jsonError.message;
                    let phpError = null;
                    let phpFile = null;
                    let phpLine = null;
                    
                    // Pattern 1: Fatal error: message in file.php on line X
                    const fatalPattern1 = /(Fatal error|Parse error|Warning|Notice|Deprecated):\s*(.+?)\s+in\s+(.+?\.php)\s+on\s+line\s+(\d+)/i;
                    const match1 = responseText.match(fatalPattern1);
                    if (match1) {
                        phpError = match1[2].trim();
                        phpFile = match1[3].trim();
                        phpLine = match1[4].trim();
                        errorMsg = `PHP ${match1[1]}: ${phpError} in ${phpFile} on line ${phpLine}`;
                    } else {
                        // Pattern 2: Fatal error: message in /path/to/file.php:X
                        const fatalPattern2 = /(Fatal error|Parse error|Warning|Notice|Deprecated):\s*(.+?)\s+in\s+(.+?\.php):(\d+)/i;
                        const match2 = responseText.match(fatalPattern2);
                        if (match2) {
                            phpError = match2[2].trim();
                            phpFile = match2[3].trim();
                            phpLine = match2[4].trim();
                            errorMsg = `PHP ${match2[1]}: ${phpError} in ${phpFile}:${phpLine}`;
                        } else {
                            // Pattern 3: <b>Fatal error</b>: message in file.php on line X
                            const fatalPattern3 = /<b>(Fatal error|Parse error|Warning|Notice|Deprecated)<\/b>:\s*(.+?)\s+in\s+(.+?\.php)\s+on\s+line\s+(\d+)/i;
                            const match3 = responseText.match(fatalPattern3);
                            if (match3) {
                                phpError = match3[2].trim();
                                phpFile = match3[3].trim();
                                phpLine = match3[4].trim();
                                errorMsg = `PHP ${match3[1]}: ${phpError} in ${phpFile} on line ${phpLine}`;
                            }
                        }
                    }
                    
                    // Log extracted PHP error details
                    if (phpError) {
                        console.error('========================================');
                        console.error('EXTRACTED PHP ERROR DETAILS:');
                        console.error('Error Type:', phpError ? 'Found' : 'Not found');
                        console.error('Error Message:', phpError);
                        console.error('File:', phpFile);
                        console.error('Line:', phpLine);
                        console.error('========================================');
                    }
                    
                    throw new Error(`Invalid JSON response: ${errorMsg}. Response starts with: ${responseText.substring(0, 200)}`);
                }
                
                // Extract and update CSRF token from response if present
                if (result.csrf_token) {
                    if (window.becmiApp && window.becmiApp.state) {
                        window.becmiApp.state.csrfToken = result.csrf_token;
                        console.log('[API Client] Updated CSRF token from response');
                    }
                } else if (result.data && result.data.csrf_token) {
                    if (window.becmiApp && window.becmiApp.state) {
                        window.becmiApp.state.csrfToken = result.data.csrf_token;
                        console.log('[API Client] Updated CSRF token from response data');
                    }
                }
                
                // Check if the response indicates an authentication error
                if (result.status === 'error' && result.code === 'UNAUTHORIZED') {
                    // Handle authentication error - might need to redirect to login
                    console.warn('[API Client] Authentication required - session may have expired');
                    console.warn('[API Client] Response structure:', JSON.stringify(result, null, 2));
                    // Don't throw here, let the calling code handle it
                }
                
                // Log successful response with details
                console.log(`[API] ${method} ${url} - success`);
                if (result.status === 'error') {
                    console.error('[API Client] WARNING: Response marked as success but status is "error"!');
                    console.error('[API Client] Full response:', JSON.stringify(result, null, 2));
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`[API] ${method} ${url} - attempt ${attempt} failed:`, error.message);
                
                // Don't retry on authentication errors or server errors
                if (error.message.includes('401') || error.message.includes('403') || 
                    (error.response && error.response.code === 'UNAUTHORIZED')) {
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
        
        // Log the full response text to see the actual PHP error (especially for 500 errors)
        if (lastError.responseText) {
            console.error('========================================');
            console.error('=== FINAL ERROR - FULL RESPONSE TEXT ===');
            console.error('========================================');
            console.error(lastError.responseText);
            console.error('========================================');
            console.error('Response length:', lastError.responseText.length, 'characters');
            console.error('========================================');
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
            console.log('[API Client] Sending CSRF token in request header:', csrfToken.substring(0, 16) + '...');
        } else {
            console.warn('[API Client] No CSRF token available - request may fail authentication');
            console.warn('[API Client] window.becmiApp exists:', !!window.becmiApp);
            console.warn('[API Client] window.becmiApp.state exists:', !!(window.becmiApp && window.becmiApp.state));
            if (window.becmiApp && window.becmiApp.state) {
                console.warn('[API Client] window.becmiApp.state.csrfToken:', window.becmiApp.state.csrfToken);
            }
        }
        
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
