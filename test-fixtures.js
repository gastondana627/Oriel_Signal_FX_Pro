/**
 * Test Fixtures
 * Comprehensive test data for all testing scenarios
 */

const TestFixtures = {
    /**
     * User test data
     */
    users: {
        // Valid user for successful registration/login
        validUser: {
            email: 'test.user@example.com',
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
            confirmPassword: 'TestPassword123!'
        },
        
        // Admin user for administrative testing
        adminUser: {
            email: 'admin.test@example.com',
            password: 'AdminPassword123!',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            confirmPassword: 'AdminPassword123!'
        },
        
        // Premium user for subscription testing
        premiumUser: {
            email: 'premium.user@example.com',
            password: 'PremiumPassword123!',
            firstName: 'Premium',
            lastName: 'User',
            subscription: 'premium',
            confirmPassword: 'PremiumPassword123!'
        },
        
        // User with invalid email format
        invalidEmailUser: {
            email: 'invalid-email-format',
            password: 'ValidPassword123!',
            firstName: 'Invalid',
            lastName: 'Email',
            confirmPassword: 'ValidPassword123!'
        },
        
        // User with weak password
        weakPasswordUser: {
            email: 'weak.password@example.com',
            password: '123',
            firstName: 'Weak',
            lastName: 'Password',
            confirmPassword: '123'
        },
        
        // User with mismatched password confirmation
        mismatchedPasswordUser: {
            email: 'mismatched@example.com',
            password: 'Password123!',
            firstName: 'Mismatched',
            lastName: 'Password',
            confirmPassword: 'DifferentPassword123!'
        },
        
        // User for duplicate email testing
        duplicateEmailUser: {
            email: 'duplicate@example.com',
            password: 'DuplicatePassword123!',
            firstName: 'Duplicate',
            lastName: 'User',
            confirmPassword: 'DuplicatePassword123!'
        },
        
        // User with missing required fields
        incompleteUser: {
            email: 'incomplete@example.com',
            password: '',
            firstName: '',
            lastName: 'User'
        }
    },

    /**
     * Authentication credentials
     */
    auth: {
        // Valid login credentials
        validCredentials: {
            email: 'test.user@example.com',
            password: 'TestPassword123!'
        },
        
        // Admin login credentials
        adminCredentials: {
            email: 'admin.test@example.com',
            password: 'AdminPassword123!'
        },
        
        // Invalid email credentials
        invalidEmailCredentials: {
            email: 'nonexistent@example.com',
            password: 'TestPassword123!'
        },
        
        // Invalid password credentials
        invalidPasswordCredentials: {
            email: 'test.user@example.com',
            password: 'WrongPassword123!'
        },
        
        // Malformed credentials
        malformedCredentials: {
            email: 'not-an-email',
            password: ''
        },
        
        // Empty credentials
        emptyCredentials: {
            email: '',
            password: ''
        }
    },

    /**
     * Download test data
     */
    downloads: {
        // Test audio file metadata
        testAudioFile: {
            name: 'test-audio.wav',
            duration: 30,
            sampleRate: 44100,
            channels: 2,
            size: 5242880, // 5MB
            format: 'wav'
        },
        
        // Available download formats
        formats: ['mp3', 'mp4', 'mov', 'gif'],
        
        // Quality settings for each format
        qualitySettings: {
            mp3: {
                low: { bitrate: 128, quality: 'standard' },
                medium: { bitrate: 192, quality: 'high' },
                high: { bitrate: 320, quality: 'premium' }
            },
            mp4: {
                low: { bitrate: 1000, resolution: '720p', codec: 'h264' },
                medium: { bitrate: 2500, resolution: '1080p', codec: 'h264' },
                high: { bitrate: 5000, resolution: '1440p', codec: 'h264' }
            },
            mov: {
                low: { bitrate: 2000, resolution: '720p', codec: 'prores' },
                medium: { bitrate: 5000, resolution: '1080p', codec: 'prores' },
                high: { bitrate: 10000, resolution: '1440p', codec: 'prores' }
            },
            gif: {
                low: { fps: 10, resolution: '480p', colors: 256 },
                medium: { fps: 15, resolution: '720p', colors: 256 },
                high: { fps: 24, resolution: '1080p', colors: 256 }
            }
        },
        
        // Expected file sizes (approximate, in bytes)
        expectedFileSizes: {
            mp3: { low: 960000, medium: 1440000, high: 2400000 },
            mp4: { low: 3750000, medium: 9375000, high: 18750000 },
            mov: { low: 7500000, medium: 18750000, high: 37500000 },
            gif: { low: 2500000, medium: 5000000, high: 10000000 }
        },
        
        // Download progress milestones
        progressMilestones: [0, 25, 50, 75, 100],
        
        // Expected generation times (in seconds)
        expectedGenerationTimes: {
            mp3: { low: 5, medium: 8, high: 12 },
            mp4: { low: 15, medium: 25, high: 40 },
            mov: { low: 20, medium: 35, high: 60 },
            gif: { low: 10, medium: 18, high: 30 }
        }
    },

    /**
     * Server configuration and endpoints
     */
    server: {
        // API endpoints
        endpoints: {
            health: '/health',
            healthDb: '/health/db',
            auth: '/auth',
            register: '/auth/register',
            login: '/auth/login',
            logout: '/auth/logout',
            users: '/users',
            downloads: '/downloads',
            jobs: '/jobs',
            admin: '/admin',
            resetTestDb: '/admin/reset-test-db'
        },
        
        // Expected response structures
        expectedResponses: {
            health: {
                status: 'ok',
                timestamp: 'string',
                uptime: 'number'
            },
            auth: {
                token: 'string',
                user: {
                    id: 'number',
                    email: 'string',
                    firstName: 'string',
                    lastName: 'string'
                }
            },
            download: {
                jobId: 'string',
                status: 'string',
                progress: 'number',
                downloadUrl: 'string'
            }
        },
        
        // Server ports and URLs
        ports: {
            frontend: 3000,
            backend: 8000
        },
        
        urls: {
            frontend: 'http://localhost:3000',
            backend: 'http://localhost:8000'
        },
        
        // Health check timeouts
        timeouts: {
            startup: 60000,    // 60 seconds
            health: 5000,      // 5 seconds
            request: 30000     // 30 seconds
        }
    },

    /**
     * Error scenarios and messages
     */
    errors: {
        // Authentication errors
        auth: {
            invalidCredentials: {
                code: 401,
                message: 'Invalid email or password'
            },
            userNotFound: {
                code: 404,
                message: 'User not found'
            },
            duplicateEmail: {
                code: 409,
                message: 'Email already exists'
            },
            weakPassword: {
                code: 400,
                message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
            },
            invalidEmail: {
                code: 400,
                message: 'Please enter a valid email address'
            }
        },
        
        // Download errors
        download: {
            fileNotFound: {
                code: 404,
                message: 'Audio file not found'
            },
            generationFailed: {
                code: 500,
                message: 'File generation failed'
            },
            unsupportedFormat: {
                code: 400,
                message: 'Unsupported file format'
            },
            fileTooLarge: {
                code: 413,
                message: 'File size exceeds maximum limit'
            }
        },
        
        // Server errors
        server: {
            internalError: {
                code: 500,
                message: 'Internal server error'
            },
            serviceUnavailable: {
                code: 503,
                message: 'Service temporarily unavailable'
            },
            timeout: {
                code: 408,
                message: 'Request timeout'
            }
        }
    },

    /**
     * UI element selectors
     */
    selectors: {
        // Authentication form selectors
        auth: {
            registerModal: '#registerModal',
            loginModal: '#loginModal',
            emailInput: '#email',
            passwordInput: '#password',
            confirmPasswordInput: '#confirmPassword',
            firstNameInput: '#firstName',
            lastNameInput: '#lastName',
            registerButton: '#registerButton',
            loginButton: '#loginButton',
            logoutButton: '#logoutButton',
            errorMessage: '.error-message',
            successMessage: '.success-message'
        },
        
        // Download modal selectors
        download: {
            downloadButton: '#downloadButton',
            downloadModal: '#downloadModal',
            formatButtons: '.format-button',
            mp3Button: '#mp3Button',
            mp4Button: '#mp4Button',
            movButton: '#movButton',
            gifButton: '#gifButton',
            progressBar: '.progress-bar',
            progressText: '.progress-text',
            cancelButton: '#cancelButton',
            closeButton: '#closeButton'
        },
        
        // Dashboard selectors
        dashboard: {
            userMenu: '#userMenu',
            projectList: '#projectList',
            createProject: '#createProject',
            settingsButton: '#settingsButton',
            helpButton: '#helpButton'
        },
        
        // Test runner selectors
        testRunner: {
            testSuiteSelect: '#testSuiteSelect',
            runTestsButton: '#runTestsButton',
            testResults: '#testResults',
            testProgress: '#testProgress',
            testLog: '#testLog'
        }
    },

    /**
     * Test scenarios and workflows
     */
    scenarios: {
        // Registration flow scenarios
        registration: [
            {
                name: 'successful_registration_with_valid_data',
                userData: 'validUser',
                expectedResult: 'success',
                expectedRedirect: '/dashboard'
            },
            {
                name: 'registration_with_duplicate_email',
                userData: 'duplicateEmailUser',
                expectedResult: 'error',
                expectedError: 'duplicateEmail'
            },
            {
                name: 'registration_with_invalid_email_format',
                userData: 'invalidEmailUser',
                expectedResult: 'error',
                expectedError: 'invalidEmail'
            },
            {
                name: 'registration_with_weak_password',
                userData: 'weakPasswordUser',
                expectedResult: 'error',
                expectedError: 'weakPassword'
            },
            {
                name: 'registration_with_mismatched_passwords',
                userData: 'mismatchedPasswordUser',
                expectedResult: 'error',
                expectedError: 'passwordMismatch'
            }
        ],
        
        // Login flow scenarios
        login: [
            {
                name: 'successful_login_with_valid_credentials',
                credentials: 'validCredentials',
                expectedResult: 'success',
                expectedRedirect: '/dashboard'
            },
            {
                name: 'login_with_invalid_email',
                credentials: 'invalidEmailCredentials',
                expectedResult: 'error',
                expectedError: 'invalidCredentials'
            },
            {
                name: 'login_with_invalid_password',
                credentials: 'invalidPasswordCredentials',
                expectedResult: 'error',
                expectedError: 'invalidCredentials'
            },
            {
                name: 'login_with_malformed_credentials',
                credentials: 'malformedCredentials',
                expectedResult: 'error',
                expectedError: 'invalidEmail'
            }
        ],
        
        // Download flow scenarios
        download: [
            {
                name: 'download_modal_interception',
                format: null,
                expectedResult: 'modal_displayed'
            },
            {
                name: 'mp4_download_generation',
                format: 'mp4',
                quality: 'medium',
                expectedResult: 'success'
            },
            {
                name: 'mov_download_generation',
                format: 'mov',
                quality: 'high',
                expectedResult: 'success'
            },
            {
                name: 'gif_download_generation',
                format: 'gif',
                quality: 'low',
                expectedResult: 'success'
            },
            {
                name: 'download_progress_indication',
                format: 'mp4',
                quality: 'medium',
                expectedResult: 'progress_shown'
            }
        ]
    },

    /**
     * Performance benchmarks
     */
    performance: {
        // Page load times (in milliseconds)
        pageLoad: {
            acceptable: 3000,
            good: 1500,
            excellent: 800
        },
        
        // API response times (in milliseconds)
        apiResponse: {
            acceptable: 2000,
            good: 1000,
            excellent: 500
        },
        
        // File generation times (in seconds)
        fileGeneration: {
            mp3: { acceptable: 15, good: 10, excellent: 5 },
            mp4: { acceptable: 60, good: 40, excellent: 25 },
            mov: { acceptable: 90, good: 60, excellent: 35 },
            gif: { acceptable: 45, good: 30, excellent: 18 }
        }
    },

    /**
     * Browser compatibility data
     */
    browsers: {
        supported: [
            { name: 'Chrome', minVersion: 90 },
            { name: 'Firefox', minVersion: 88 },
            { name: 'Safari', minVersion: 14 },
            { name: 'Edge', minVersion: 90 }
        ],
        
        features: {
            webAudio: ['Chrome', 'Firefox', 'Safari', 'Edge'],
            canvas: ['Chrome', 'Firefox', 'Safari', 'Edge'],
            webGL: ['Chrome', 'Firefox', 'Safari', 'Edge'],
            fileAPI: ['Chrome', 'Firefox', 'Safari', 'Edge']
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestFixtures;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
    window.TestFixtures = TestFixtures;
}