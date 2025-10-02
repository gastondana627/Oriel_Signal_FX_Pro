# User Experience Testing Troubleshooting Guide

## Quick Reference

### Emergency Fixes
| Issue | Quick Fix | Details |
|-------|-----------|---------|
| Tests won't start | Clear browser cache, reload page | [Section 1.1](#tests-wont-start) |
| Modal not appearing | Check CSS z-index and display properties | [Section 2.1](#modal-issues) |
| Authentication failing | Clear localStorage and session data | [Section 3.1](#auth-issues) |
| Server connectivity | Verify ports 3000 and 8000 are accessible | [Section 4.1](#server-issues) |
| Performance slow | Reduce test parallelization | [Section 5.1](#performance-issues) |

## 1. Test Execution Issues

### 1.1 Tests Won't Start {#tests-wont-start}

**Symptoms:**
- Dashboard loads but "Run Tests" button is disabled
- Error: "Please select a test suite first"
- Console errors about missing dependencies

**Diagnosis Steps:**
```javascript
// Check if dashboard is properly initialized
console.log('Dashboard status:', window.dashboard ? 'Loaded' : 'Not loaded');

// Verify test suite availability
if (window.dashboard) {
  console.log('Available suites:', Object.keys(window.dashboard.testSuites));
}

// Check for JavaScript errors
console.log('Check console for errors above this line');
```

**Solutions:**

1. **Reload and Clear Cache**
   ```javascript
   // Force reload without cache
   location.reload(true);
   
   // Or clear specific items
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Verify File Loading**
   ```html
   <!-- Ensure all required scripts are loaded -->
   <script src="user-testing-dashboard.js"></script>
   <script src="authentication-testing-module.js"></script>
   <script src="download-modal-interception-tests.js"></script>
   ```

3. **Check Network Connectivity**
   ```javascript
   // Test basic connectivity
   fetch('/api/health')
     .then(response => console.log('API accessible:', response.ok))
     .catch(error => console.error('API error:', error));
   ```

### 1.2 Tests Stop Unexpectedly

**Symptoms:**
- Tests start but halt partway through
- "Execution stopped" message appears
- Incomplete test results

**Diagnosis Steps:**
```javascript
// Check for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

// Monitor test execution state
setInterval(() => {
  if (window.dashboard) {
    console.log('Test state:', {
      isRunning: window.dashboard.isRunning,
      currentTest: window.dashboard.currentTest,
      queueLength: window.dashboard.testQueue.length
    });
  }
}, 5000);
```

**Solutions:**

1. **Increase Timeout Values**
   ```javascript
   // In test configuration
   const TEST_TIMEOUT = 10000; // Increase from 5000ms
   
   await this.waitForCondition(condition, TEST_TIMEOUT, description);
   ```

2. **Add Error Recovery**
   ```javascript
   try {
     await this.executeTest(testName);
   } catch (error) {
     console.error(`Test ${testName} failed:`, error);
     // Continue with next test instead of stopping
     this.addTestResult(testName, 'FAILED', error.message);
   }
   ```

3. **Check Resource Limits**
   ```javascript
   // Monitor memory usage
   if (performance.memory) {
     console.log('Memory usage:', {
       used: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
       total: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB'
     });
   }
   ```

## 2. Modal and UI Issues

### 2.1 Modal Not Appearing {#modal-issues}

**Symptoms:**
- Download button clicked but modal doesn't show
- Modal appears but is not visible (behind other elements)
- Modal appears but is not interactive

**Diagnosis Steps:**
```javascript
// Check if modal element exists
const modal = document.getElementById('download-modal');
console.log('Modal element:', modal);

// Check modal styles
if (modal) {
  const styles = window.getComputedStyle(modal);
  console.log('Modal styles:', {
    display: styles.display,
    visibility: styles.visibility,
    zIndex: styles.zIndex,
    position: styles.position
  });
}

// Check for CSS conflicts
const allModals = document.querySelectorAll('[id*="modal"], [class*="modal"]');
console.log('All modal elements:', allModals.length);
```

**Solutions:**

1. **Fix CSS Display Issues**
   ```css
   /* Ensure modal has proper z-index */
   #download-modal {
     display: none; /* Initially hidden */
     position: fixed;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     z-index: 9999; /* High z-index */
     background-color: rgba(0, 0, 0, 0.5);
   }
   
   #download-modal.show {
     display: flex !important;
   }
   ```

2. **Verify Modal Show/Hide Functions**
   ```javascript
   // Test modal functions directly
   if (window.downloadModal) {
     console.log('Modal object exists');
     
     // Test show function
     window.downloadModal.show();
     
     // Check if modal is visible after 1 second
     setTimeout(() => {
       const modal = document.getElementById('download-modal');
       console.log('Modal visible:', modal.style.display === 'flex');
     }, 1000);
   }
   ```

3. **Check Event Listener Attachment**
   ```javascript
   // Verify download button has click handler
   const downloadBtn = document.getElementById('download-button');
   if (downloadBtn) {
     // Remove existing listeners and add new one
     downloadBtn.replaceWith(downloadBtn.cloneNode(true));
     const newBtn = document.getElementById('download-button');
     
     newBtn.addEventListener('click', (e) => {
       e.preventDefault();
       console.log('Download button clicked');
       if (window.downloadModal) {
         window.downloadModal.show();
       }
     });
   }
   ```

### 2.2 Format Selection Not Working

**Symptoms:**
- Format options don't respond to clicks
- Multiple formats selected simultaneously
- Confirm button doesn't update

**Diagnosis Steps:**
```javascript
// Check format option elements
const formatOptions = document.querySelectorAll('.download-format-option');
console.log('Format options found:', formatOptions.length);

// Test click handlers
formatOptions.forEach((option, index) => {
  console.log(`Option ${index}:`, {
    dataset: option.dataset,
    hasClickListener: option.onclick !== null,
    classes: option.className
  });
});
```

**Solutions:**

1. **Fix Event Delegation**
   ```javascript
   // Use event delegation for format selection
   document.addEventListener('click', (event) => {
     if (event.target.closest('.download-format-option')) {
       const option = event.target.closest('.download-format-option');
       
       // Clear other selections
       document.querySelectorAll('.download-format-option.selected')
         .forEach(el => el.classList.remove('selected'));
       
       // Select clicked option
       option.classList.add('selected');
       
       // Update confirm button
       updateConfirmButton(option.dataset.format);
     }
   });
   ```

2. **Verify CSS Classes**
   ```css
   .download-format-option {
     cursor: pointer;
     transition: all 0.2s ease;
   }
   
   .download-format-option:hover {
     background-color: #f0f0f0;
   }
   
   .download-format-option.selected {
     background-color: #007bff;
     color: white;
   }
   ```

## 3. Authentication Issues

### 3.1 Authentication Tests Failing {#auth-issues}

**Symptoms:**
- Registration form not submitting
- Login credentials not accepted
- Session not persisting

**Diagnosis Steps:**
```javascript
// Check authentication state
console.log('Auth state:', {
  isAuthenticated: window.authManager ? window.authManager.isAuthenticated() : 'AuthManager not loaded',
  token: localStorage.getItem('oriel_jwt_token'),
  userData: localStorage.getItem('oriel_user_data')
});

// Test form elements
const regForm = document.getElementById('registration-form');
const loginForm = document.getElementById('login-form');
console.log('Forms available:', {
  registration: !!regForm,
  login: !!loginForm
});
```

**Solutions:**

1. **Clear Authentication State**
   ```javascript
   // Complete auth state reset
   const clearAuthState = () => {
     // Clear localStorage
     localStorage.removeItem('oriel_jwt_token');
     localStorage.removeItem('oriel_user_data');
     localStorage.removeItem('oriel_refresh_token');
     
     // Clear sessionStorage
     sessionStorage.clear();
     
     // Clear cookies
     document.cookie.split(";").forEach(cookie => {
       const eqPos = cookie.indexOf("=");
       const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
       document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
     });
     
     // Reset auth manager state
     if (window.authManager) {
       window.authManager._isAuthenticated = false;
       window.authManager.user = null;
       window.authManager.token = null;
     }
   };
   
   clearAuthState();
   ```

2. **Mock Authentication for Testing**
   ```javascript
   // Create mock authentication functions
   const mockAuthManager = {
     async register(email, password) {
       // Simulate registration
       await new Promise(resolve => setTimeout(resolve, 1000));
       
       if (email && password && password.length >= 8) {
         return { success: true, message: 'Registration successful' };
       } else {
         throw new Error('Invalid registration data');
       }
     },
     
     async login(email, password) {
       // Simulate login
       await new Promise(resolve => setTimeout(resolve, 500));
       
       if (email === 'test@example.com' && password === 'password123') {
         const mockUser = { id: 1, email: email, plan: 'free' };
         const mockToken = 'mock.jwt.token';
         
         localStorage.setItem('oriel_jwt_token', mockToken);
         localStorage.setItem('oriel_user_data', JSON.stringify(mockUser));
         
         this._isAuthenticated = true;
         this.user = mockUser;
         this.token = mockToken;
         
         return { success: true, user: mockUser };
       } else {
         throw new Error('Invalid credentials');
       }
     },
     
     isAuthenticated() {
       return this._isAuthenticated || !!localStorage.getItem('oriel_jwt_token');
     }
   };
   
   // Replace auth manager for testing
   window.authManager = mockAuthManager;
   ```

3. **Fix Form Validation Issues**
   ```javascript
   // Ensure form validation works correctly
   const validateRegistrationForm = (formData) => {
     const errors = [];
     
     if (!formData.email || !formData.email.includes('@')) {
       errors.push('Valid email required');
     }
     
     if (!formData.password || formData.password.length < 8) {
       errors.push('Password must be at least 8 characters');
     }
     
     if (formData.password !== formData.confirmPassword) {
       errors.push('Passwords do not match');
     }
     
     return errors;
   };
   ```

### 3.2 Session Management Issues

**Symptoms:**
- User logged out unexpectedly
- Session not restored after page refresh
- Multiple login attempts required

**Solutions:**

1. **Implement Robust Session Restoration**
   ```javascript
   // Enhanced session restoration
   const restoreSession = () => {
     try {
       const token = localStorage.getItem('oriel_jwt_token');
       const userData = localStorage.getItem('oriel_user_data');
       
       if (token && userData) {
         // Verify token is not expired
         const tokenData = parseJWT(token);
         if (tokenData.exp * 1000 > Date.now()) {
           window.authManager.token = token;
           window.authManager.user = JSON.parse(userData);
           window.authManager._isAuthenticated = true;
           return true;
         } else {
           // Token expired, clear storage
           localStorage.removeItem('oriel_jwt_token');
           localStorage.removeItem('oriel_user_data');
         }
       }
     } catch (error) {
       console.error('Session restoration failed:', error);
     }
     
     return false;
   };
   
   const parseJWT = (token) => {
     try {
       return JSON.parse(atob(token.split('.')[1]));
     } catch (error) {
       return {};
     }
   };
   ```

## 4. Server and Connectivity Issues

### 4.1 Server Connection Problems {#server-issues}

**Symptoms:**
- API calls returning 404 or 500 errors
- CORS errors in console
- Timeout errors

**Diagnosis Steps:**
```javascript
// Test server connectivity
const testConnectivity = async () => {
  const endpoints = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:3000/api/health',
    'http://localhost:8000/api/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { 
        method: 'GET',
        mode: 'cors'
      });
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error(`${endpoint}: ${error.message}`);
    }
  }
};

testConnectivity();
```

**Solutions:**

1. **Fix CORS Configuration**
   ```javascript
   // Backend CORS setup (Express.js example)
   const cors = require('cors');
   
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'http://127.0.0.1:3000',
       'http://localhost:8080'
     ],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

2. **Implement Request Retry Logic**
   ```javascript
   const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch(url, {
           ...options,
           timeout: 10000 // 10 second timeout
         });
         
         if (response.ok) {
           return response;
         }
         
         if (response.status >= 500 && i < maxRetries - 1) {
           // Retry on server errors
           await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
           continue;
         }
         
         return response;
       } catch (error) {
         if (i === maxRetries - 1) {
           throw error;
         }
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

3. **Mock API Responses for Testing**
   ```javascript
   // Create mock API for offline testing
   const mockAPI = {
     '/api/health': { status: 'ok', timestamp: Date.now() },
     '/api/auth/login': { success: true, token: 'mock-token' },
     '/api/auth/register': { success: true, message: 'User created' }
   };
   
   // Intercept fetch requests
   const originalFetch = window.fetch;
   window.fetch = async (url, options) => {
     // Check if URL should be mocked
     const mockResponse = mockAPI[url.replace(/^https?:\/\/[^\/]+/, '')];
     
     if (mockResponse) {
       return new Response(JSON.stringify(mockResponse), {
         status: 200,
         headers: { 'Content-Type': 'application/json' }
       });
     }
     
     // Use original fetch for non-mocked requests
     return originalFetch(url, options);
   };
   ```

## 5. Performance Issues

### 5.1 Slow Test Execution {#performance-issues}

**Symptoms:**
- Tests taking much longer than expected
- Browser becoming unresponsive
- Memory usage increasing continuously

**Diagnosis Steps:**
```javascript
// Monitor performance during tests
const performanceMonitor = {
  start() {
    this.startTime = performance.now();
    this.startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  },
  
  checkpoint(label) {
    const currentTime = performance.now();
    const currentMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    console.log(`${label}:`, {
      time: `${(currentTime - this.startTime).toFixed(2)}ms`,
      memory: `${((currentMemory - this.startMemory) / 1048576).toFixed(2)}MB`
    });
  }
};

// Use in tests
performanceMonitor.start();
await runTest();
performanceMonitor.checkpoint('Test completed');
```

**Solutions:**

1. **Optimize Test Execution**
   ```javascript
   // Reduce parallel test execution
   const runTestsSequentially = async (tests) => {
     const results = [];
     
     for (const test of tests) {
       try {
         const result = await test.run();
         results.push(result);
         
         // Small delay between tests to prevent overwhelming
         await new Promise(resolve => setTimeout(resolve, 100));
       } catch (error) {
         results.push({ error: error.message });
       }
     }
     
     return results;
   };
   ```

2. **Implement Memory Management**
   ```javascript
   // Clean up after each test
   const cleanupAfterTest = () => {
     // Remove event listeners
     const elementsWithListeners = document.querySelectorAll('[data-test-listener]');
     elementsWithListeners.forEach(el => {
       el.removeAttribute('data-test-listener');
       // Clone element to remove all listeners
       const newEl = el.cloneNode(true);
       el.parentNode.replaceChild(newEl, el);
     });
     
     // Clear intervals and timeouts
     const highestTimeoutId = setTimeout(() => {}, 0);
     for (let i = 0; i < highestTimeoutId; i++) {
       clearTimeout(i);
     }
     
     // Force garbage collection if available
     if (window.gc) {
       window.gc();
     }
   };
   ```

3. **Use Efficient DOM Queries**
   ```javascript
   // Cache DOM queries
   const domCache = new Map();
   
   const getCachedElement = (selector) => {
     if (!domCache.has(selector)) {
       domCache.set(selector, document.querySelector(selector));
     }
     return domCache.get(selector);
   };
   
   // Clear cache when DOM changes
   const clearDOMCache = () => {
     domCache.clear();
   };
   ```

## 6. Browser-Specific Issues

### 6.1 Chrome/Chromium Issues

**Common Problems:**
- Local storage quota exceeded
- CORS preflight cache issues
- Memory leaks in long-running tests

**Solutions:**
```javascript
// Handle storage quota
const manageStorageQuota = () => {
  try {
    // Check available storage
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const used = estimate.usage;
        const quota = estimate.quota;
        const percentUsed = (used / quota) * 100;
        
        if (percentUsed > 80) {
          console.warn('Storage quota nearly full, clearing test data');
          clearTestData();
        }
      });
    }
  } catch (error) {
    console.error('Storage management error:', error);
  }
};
```

### 6.2 Firefox Issues

**Common Problems:**
- Module loading restrictions
- Different CORS behavior
- Performance differences

**Solutions:**
```javascript
// Firefox-specific CORS handling
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

if (isFirefox) {
  // Use different CORS configuration
  const corsOptions = {
    mode: 'cors',
    credentials: 'same-origin' // Instead of 'include'
  };
}
```

### 6.3 Safari Issues

**Common Problems:**
- ES6 module restrictions
- Different localStorage behavior
- Webkit-specific CSS issues

**Solutions:**
```javascript
// Safari compatibility
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  // Use polyfills for missing features
  if (!window.fetch) {
    // Load fetch polyfill
    loadScript('https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js');
  }
}
```

## 7. Emergency Recovery Procedures

### 7.1 Complete System Reset

When all else fails, use this complete reset procedure:

```javascript
const emergencyReset = () => {
  console.log('🚨 Performing emergency reset...');
  
  // 1. Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // 2. Clear all cookies
  document.cookie.split(";").forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  
  // 3. Reset global variables
  if (window.dashboard) {
    window.dashboard.isRunning = false;
    window.dashboard.testResults = [];
    window.dashboard.testQueue = [];
  }
  
  // 4. Close all modals
  document.querySelectorAll('[id*="modal"]').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // 5. Remove all test-related event listeners
  document.querySelectorAll('[data-test-listener]').forEach(el => {
    const newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
  });
  
  // 6. Force page reload
  setTimeout(() => {
    location.reload(true);
  }, 1000);
  
  console.log('✅ Emergency reset completed, reloading page...');
};

// Make available globally for emergency use
window.emergencyReset = emergencyReset;
```

### 7.2 Diagnostic Information Collection

```javascript
const collectDiagnosticInfo = () => {
  const info = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: location.href,
    
    // Browser info
    browser: {
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language
    },
    
    // Performance info
    performance: {
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB'
      } : 'Not available',
      timing: performance.timing
    },
    
    // Storage info
    storage: {
      localStorage: Object.keys(localStorage).length,
      sessionStorage: Object.keys(sessionStorage).length
    },
    
    // DOM info
    dom: {
      elements: document.querySelectorAll('*').length,
      scripts: document.querySelectorAll('script').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
    },
    
    // Test framework info
    testFramework: {
      dashboardLoaded: !!window.dashboard,
      authModuleLoaded: !!window.AuthenticationTestingModule,
      downloadTesterLoaded: !!window.DownloadModalInterceptionTester
    },
    
    // Console errors (last 10)
    consoleErrors: window.testConsoleErrors || []
  };
  
  console.log('📊 Diagnostic Information:', info);
  return info;
};

// Capture console errors
window.testConsoleErrors = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  window.testConsoleErrors.push({
    timestamp: new Date().toISOString(),
    message: args.join(' ')
  });
  
  // Keep only last 10 errors
  if (window.testConsoleErrors.length > 10) {
    window.testConsoleErrors.shift();
  }
  
  originalConsoleError(...args);
};
```

## 8. Advanced Troubleshooting Procedures

### 8.1 Network and Connectivity Issues

**Problem**: Intermittent network failures during testing
```javascript
// Network resilience testing
const testNetworkResilience = async () => {
  const endpoints = [
    '/api/health',
    '/api/auth/status',
    '/api/projects'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    results[endpoint] = await testEndpointResilience(endpoint);
  }
  
  return results;
};

const testEndpointResilience = async (endpoint, retries = 3) => {
  const results = [];
  
  for (let i = 0; i < retries; i++) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(endpoint, {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const endTime = performance.now();
      
      results.push({
        attempt: i + 1,
        success: response.ok,
        status: response.status,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      results.push({
        attempt: i + 1,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Wait between attempts
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};
```

### 8.2 Database and State Issues

**Problem**: Test database in inconsistent state
```javascript
// Database state validation and recovery
const validateDatabaseState = async () => {
  const validations = [
    {
      name: 'User Table Integrity',
      check: async () => {
        const response = await fetch('/api/test/validate/users');
        return response.ok;
      }
    },
    {
      name: 'Project Table Integrity', 
      check: async () => {
        const response = await fetch('/api/test/validate/projects');
        return response.ok;
      }
    },
    {
      name: 'Session Table Cleanup',
      check: async () => {
        const response = await fetch('/api/test/validate/sessions');
        return response.ok;
      }
    }
  ];
  
  const results = [];
  
  for (const validation of validations) {
    try {
      const isValid = await validation.check();
      results.push({
        name: validation.name,
        status: isValid ? 'PASS' : 'FAIL'
      });
    } catch (error) {
      results.push({
        name: validation.name,
        status: 'ERROR',
        error: error.message
      });
    }
  }
  
  return results;
};

const resetDatabaseToCleanState = async () => {
  console.log('🔄 Resetting database to clean state...');
  
  try {
    // Remove all test data
    await fetch('/api/test/cleanup/all', { method: 'DELETE' });
    
    // Reset sequences and counters
    await fetch('/api/test/reset/sequences', { method: 'POST' });
    
    // Verify clean state
    const validation = await validateDatabaseState();
    const failures = validation.filter(v => v.status !== 'PASS');
    
    if (failures.length > 0) {
      throw new Error(`Database reset incomplete: ${failures.map(f => f.name).join(', ')}`);
    }
    
    console.log('✅ Database reset completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
};
```

### 8.3 Test Framework Issues

**Problem**: Test framework components not loading properly
```javascript
// Framework component validation
const validateFrameworkComponents = () => {
  const requiredComponents = {
    'Dashboard': window.dashboard,
    'Auth Module': window.AuthenticationTestingModule,
    'Download Tester': window.DownloadModalInterceptionTester,
    'Server Tester': window.ServerStartupTester,
    'Performance Monitor': window.testPerformanceMonitor,
    'Data Manager': window.testDataManager
  };
  
  const results = {};
  let allLoaded = true;
  
  for (const [name, component] of Object.entries(requiredComponents)) {
    const isLoaded = !!component;
    results[name] = {
      loaded: isLoaded,
      type: typeof component,
      methods: isLoaded ? Object.getOwnPropertyNames(component.constructor.prototype) : []
    };
    
    if (!isLoaded) {
      allLoaded = false;
    }
  }
  
  return {
    allLoaded,
    components: results,
    summary: `${Object.values(results).filter(r => r.loaded).length}/${Object.keys(results).length} components loaded`
  };
};

const reloadFrameworkComponents = async () => {
  console.log('🔄 Reloading framework components...');
  
  // Clear existing components
  delete window.dashboard;
  delete window.AuthenticationTestingModule;
  delete window.DownloadModalInterceptionTester;
  
  // Reload scripts
  const scripts = [
    'user-testing-dashboard.js',
    'authentication-testing-module.js',
    'download-modal-interception-tests.js',
    'server-startup-tests.js'
  ];
  
  for (const script of scripts) {
    await loadScript(script);
  }
  
  // Validate reload
  const validation = validateFrameworkComponents();
  if (!validation.allLoaded) {
    throw new Error(`Component reload failed: ${validation.summary}`);
  }
  
  console.log('✅ Framework components reloaded successfully');
};

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
```

## 9. Preventive Measures

### 9.1 Pre-Test Environment Validation

```javascript
// Comprehensive pre-test validation
const preTestValidation = async () => {
  console.log('🔍 Running pre-test validation...');
  
  const validations = [
    {
      name: 'Server Connectivity',
      test: async () => {
        const frontend = await fetch('http://localhost:3000/health');
        const backend = await fetch('http://localhost:8000/health');
        return frontend.ok && backend.ok;
      }
    },
    {
      name: 'Framework Components',
      test: async () => {
        const validation = validateFrameworkComponents();
        return validation.allLoaded;
      }
    },
    {
      name: 'Database State',
      test: async () => {
        const validation = await validateDatabaseState();
        return validation.every(v => v.status === 'PASS');
      }
    },
    {
      name: 'Browser Compatibility',
      test: async () => {
        return checkBrowserCompatibility();
      }
    },
    {
      name: 'Memory Available',
      test: async () => {
        if (performance.memory) {
          const used = performance.memory.usedJSHeapSize;
          const limit = performance.memory.jsHeapSizeLimit;
          return (used / limit) < 0.8; // Less than 80% used
        }
        return true; // Assume OK if memory API not available
      }
    }
  ];
  
  const results = [];
  let allPassed = true;
  
  for (const validation of validations) {
    try {
      const passed = await validation.test();
      results.push({
        name: validation.name,
        status: passed ? 'PASS' : 'FAIL'
      });
      
      if (!passed) {
        allPassed = false;
      }
    } catch (error) {
      results.push({
        name: validation.name,
        status: 'ERROR',
        error: error.message
      });
      allPassed = false;
    }
  }
  
  if (!allPassed) {
    console.warn('⚠️ Pre-test validation failed:', results.filter(r => r.status !== 'PASS'));
  } else {
    console.log('✅ Pre-test validation passed');
  }
  
  return { passed: allPassed, results };
};

const checkBrowserCompatibility = () => {
  const requiredFeatures = [
    'fetch',
    'Promise',
    'localStorage',
    'sessionStorage',
    'addEventListener',
    'querySelector'
  ];
  
  for (const feature of requiredFeatures) {
    if (!(feature in window)) {
      console.error(`Missing required feature: ${feature}`);
      return false;
    }
  }
  
  return true;
};
```

### 9.2 Automated Health Monitoring

```javascript
// Continuous health monitoring during tests
class TestHealthMonitor {
  constructor() {
    this.isMonitoring = false;
    this.healthChecks = [];
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      memoryUsage: 0.8 // 80%
    };
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
    
    console.log('🔍 Health monitoring started');
  }
  
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    clearInterval(this.monitoringInterval);
    
    console.log('🔍 Health monitoring stopped');
  }
  
  async performHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    // Check server response times
    healthCheck.checks.serverResponse = await this.checkServerResponse();
    
    // Check memory usage
    healthCheck.checks.memoryUsage = this.checkMemoryUsage();
    
    // Check error rates
    healthCheck.checks.errorRate = this.checkErrorRate();
    
    // Check DOM health
    healthCheck.checks.domHealth = this.checkDOMHealth();
    
    this.healthChecks.push(healthCheck);
    
    // Keep only last 20 checks
    if (this.healthChecks.length > 20) {
      this.healthChecks.shift();
    }
    
    // Check for alerts
    this.checkAlerts(healthCheck);
  }
  
  async checkServerResponse() {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/health');
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: responseTime,
        httpStatus: response.status
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  checkMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      const usage = used / limit;
      
      return {
        status: usage < this.alertThresholds.memoryUsage ? 'healthy' : 'warning',
        usage: usage,
        usedMB: Math.round(used / 1024 / 1024),
        limitMB: Math.round(limit / 1024 / 1024)
      };
    }
    
    return { status: 'unknown', message: 'Memory API not available' };
  }
  
  checkErrorRate() {
    // Check console errors in last 5 minutes
    const fiveMinutesAgo = Date.now() - 300000;
    const recentErrors = (window.testConsoleErrors || [])
      .filter(error => new Date(error.timestamp).getTime() > fiveMinutesAgo);
    
    const errorRate = recentErrors.length / 300; // Errors per second
    
    return {
      status: errorRate < this.alertThresholds.errorRate ? 'healthy' : 'warning',
      errorRate: errorRate,
      recentErrors: recentErrors.length
    };
  }
  
  checkDOMHealth() {
    const elementCount = document.querySelectorAll('*').length;
    const testElements = document.querySelectorAll('[data-test-element]').length;
    
    return {
      status: elementCount < 10000 ? 'healthy' : 'warning', // Arbitrary threshold
      totalElements: elementCount,
      testElements: testElements
    };
  }
  
  checkAlerts(healthCheck) {
    const alerts = [];
    
    // Server response time alert
    if (healthCheck.checks.serverResponse.responseTime > this.alertThresholds.responseTime) {
      alerts.push({
        type: 'performance',
        message: `Server response time high: ${healthCheck.checks.serverResponse.responseTime}ms`
      });
    }
    
    // Memory usage alert
    if (healthCheck.checks.memoryUsage.status === 'warning') {
      alerts.push({
        type: 'memory',
        message: `Memory usage high: ${Math.round(healthCheck.checks.memoryUsage.usage * 100)}%`
      });
    }
    
    // Error rate alert
    if (healthCheck.checks.errorRate.status === 'warning') {
      alerts.push({
        type: 'errors',
        message: `Error rate high: ${healthCheck.checks.errorRate.recentErrors} errors in last 5 minutes`
      });
    }
    
    if (alerts.length > 0) {
      console.warn('🚨 Health alerts:', alerts);
      this.handleAlerts(alerts);
    }
  }
  
  handleAlerts(alerts) {
    // Could send alerts to monitoring system or take corrective action
    alerts.forEach(alert => {
      switch (alert.type) {
        case 'memory':
          // Trigger memory cleanup
          if (window.testMemoryManager) {
            window.testMemoryManager.performMemoryCleanup();
          }
          break;
          
        case 'performance':
          // Reduce test concurrency
          console.log('Reducing test concurrency due to performance issues');
          break;
          
        case 'errors':
          // Log detailed error information
          console.log('High error rate detected, collecting diagnostic info');
          collectDiagnosticInfo();
          break;
      }
    });
  }
  
  getHealthSummary() {
    if (this.healthChecks.length === 0) {
      return { status: 'no_data', message: 'No health checks performed yet' };
    }
    
    const latest = this.healthChecks[this.healthChecks.length - 1];
    const overallStatus = Object.values(latest.checks).every(check => 
      check.status === 'healthy'
    ) ? 'healthy' : 'warning';
    
    return {
      status: overallStatus,
      lastCheck: latest.timestamp,
      checks: latest.checks,
      history: this.healthChecks.length
    };
  }
}

// Global health monitor
window.testHealthMonitor = new TestHealthMonitor();
```

## 10. Recovery Procedures

### 10.1 Automated Recovery Actions

```javascript
// Automated recovery system
class TestRecoverySystem {
  constructor() {
    this.recoveryActions = new Map();
    this.setupRecoveryActions();
  }
  
  setupRecoveryActions() {
    // Server connectivity recovery
    this.recoveryActions.set('server_connectivity', async () => {
      console.log('🔄 Attempting server connectivity recovery...');
      
      // Wait for servers to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test connectivity
      const isHealthy = await this.testServerConnectivity();
      if (!isHealthy) {
        throw new Error('Server connectivity could not be restored');
      }
      
      return 'Server connectivity restored';
    });
    
    // Memory recovery
    this.recoveryActions.set('memory_exhaustion', async () => {
      console.log('🔄 Attempting memory recovery...');
      
      // Aggressive cleanup
      if (window.testMemoryManager) {
        window.testMemoryManager.performMemoryCleanup();
      }
      
      // Clear test data
      if (window.testDataManager) {
        await window.testDataManager.cleanupAllTestData();
      }
      
      // Force garbage collection
      if (window.gc) {
        window.gc();
      }
      
      return 'Memory recovery completed';
    });
    
    // Framework recovery
    this.recoveryActions.set('framework_failure', async () => {
      console.log('🔄 Attempting framework recovery...');
      
      // Reload framework components
      await reloadFrameworkComponents();
      
      // Reinitialize dashboard
      if (window.dashboard) {
        await window.dashboard.initialize();
      }
      
      return 'Framework recovery completed';
    });
    
    // Database recovery
    this.recoveryActions.set('database_corruption', async () => {
      console.log('🔄 Attempting database recovery...');
      
      // Reset database to clean state
      await resetDatabaseToCleanState();
      
      // Verify recovery
      const validation = await validateDatabaseState();
      const failures = validation.filter(v => v.status !== 'PASS');
      
      if (failures.length > 0) {
        throw new Error(`Database recovery incomplete: ${failures.map(f => f.name).join(', ')}`);
      }
      
      return 'Database recovery completed';
    });
  }
  
  async attemptRecovery(issueType, context = {}) {
    console.log(`🚨 Attempting recovery for: ${issueType}`);
    
    const recoveryAction = this.recoveryActions.get(issueType);
    if (!recoveryAction) {
      throw new Error(`No recovery action defined for: ${issueType}`);
    }
    
    try {
      const result = await recoveryAction(context);
      console.log(`✅ Recovery successful: ${result}`);
      return { success: true, message: result };
    } catch (error) {
      console.error(`❌ Recovery failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  async testServerConnectivity() {
    try {
      const [frontend, backend] = await Promise.all([
        fetch('http://localhost:3000/health'),
        fetch('http://localhost:8000/health')
      ]);
      
      return frontend.ok && backend.ok;
    } catch (error) {
      return false;
    }
  }
}

// Global recovery system
window.testRecoverySystem = new TestRecoverySystem();
```

## Contact and Support

### Escalation Procedures

For issues not covered in this guide, follow this escalation path:

#### Level 1: Self-Service Troubleshooting
1. **Check Console Logs**: Always check browser console for error messages
2. **Run Diagnostic Tools**: Execute `collectDiagnosticInfo()` and review output
3. **Try Emergency Reset**: Run `emergencyReset()` if other methods fail
4. **Check Health Status**: Run `window.testHealthMonitor.getHealthSummary()`

#### Level 2: Automated Recovery
1. **Identify Issue Type**: Determine if it's server, memory, framework, or database related
2. **Attempt Automated Recovery**: Use `window.testRecoverySystem.attemptRecovery(issueType)`
3. **Validate Recovery**: Run appropriate validation functions
4. **Document Results**: Record what worked or didn't work

#### Level 3: Manual Investigation
1. **Collect Comprehensive Data**:
   ```javascript
   const troubleshootingData = {
     diagnostics: collectDiagnosticInfo(),
     healthStatus: window.testHealthMonitor.getHealthSummary(),
     frameworkValidation: validateFrameworkComponents(),
     networkTest: await testNetworkResilience(),
     browserInfo: {
       userAgent: navigator.userAgent,
       viewport: { width: window.innerWidth, height: window.innerHeight },
       cookies: document.cookie.length,
       localStorage: Object.keys(localStorage).length
     }
   };
   
   console.log('Troubleshooting Data:', troubleshootingData);
   ```

2. **Document Reproduction Steps**: Record exact steps that led to the issue
3. **Test Environment Details**: Note browser, OS, server configuration, and network conditions
4. **Error Patterns**: Look for patterns in error messages or timing

#### Level 4: Team Support
1. **Prepare Support Request**:
   - Include all troubleshooting data from Level 3
   - Provide clear description of expected vs actual behavior
   - Include screenshots or screen recordings if applicable
   - List all attempted solutions and their results

2. **Contact Development Team**: Reach out with prepared information
3. **Follow Up**: Provide additional information as requested

### Emergency Contacts

- **Critical Issues**: Use emergency reset procedure first, then contact team immediately
- **Security Issues**: Follow security incident response procedures
- **Data Loss**: Stop all testing immediately and contact team

### Knowledge Base

Maintain a local knowledge base of solutions:

```javascript
// Local knowledge base for common solutions
const troubleshootingKnowledgeBase = {
  'modal_not_appearing': {
    symptoms: ['Download button clicked but modal doesn\'t show', 'Modal behind other elements'],
    solutions: ['Check z-index values', 'Verify modal show/hide functions', 'Clear CSS conflicts'],
    code: 'window.downloadModal.show(); // Test modal directly'
  },
  
  'tests_hanging': {
    symptoms: ['Tests start but never complete', 'Browser becomes unresponsive'],
    solutions: ['Reduce test parallelization', 'Check for infinite loops', 'Monitor memory usage'],
    code: 'window.testMemoryManager.performMemoryCleanup();'
  },
  
  'authentication_failing': {
    symptoms: ['Login tests fail consistently', 'Session not persisting'],
    solutions: ['Clear localStorage', 'Check token expiration', 'Verify API endpoints'],
    code: 'localStorage.clear(); sessionStorage.clear();'
  }
};

// Search knowledge base
const searchKnowledgeBase = (query) => {
  const results = [];
  const searchTerm = query.toLowerCase();
  
  for (const [issue, info] of Object.entries(troubleshootingKnowledgeBase)) {
    const searchText = `${issue} ${info.symptoms.join(' ')} ${info.solutions.join(' ')}`.toLowerCase();
    
    if (searchText.includes(searchTerm)) {
      results.push({ issue, ...info });
    }
  }
  
  return results;
};

// Make available globally
window.searchKnowledgeBase = searchKnowledgeBase;
```

Remember: **When in doubt, try the emergency reset procedure first!** Most issues can be resolved by clearing state and restarting the testing environment.