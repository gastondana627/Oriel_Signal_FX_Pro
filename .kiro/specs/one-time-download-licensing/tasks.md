# One-Time Download Licensing Implementation Plan

- [x] 1. Create purchase and licensing data models
  - Create Purchase model with Stripe integration fields and download tracking
  - Create FreeDownloadUsage model for tracking free tier limits
  - Add database migrations for new purchase and licensing tables
  - _Requirements: 1.1, 4.1, 4.2, 5.1, 5.2, 6.1_

- [x] 2. Implement pricing tiers and purchase flow
  - Create PRICING_TIERS configuration with personal/commercial/premium options
  - Implement PurchaseManager class with Stripe checkout session creation
  - Add purchase flow API endpoints for session creation and payment verification
  - Create frontend purchase modal with tier selection and pricing display
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Build licensing service and email integration
  - Create LicensingService class for generating license terms and emails
  - Implement licensing email templates with purchase details and legal terms
  - Add automatic licensing email sending after successful payment
  - Integrate with development email service for testing
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Implement secure download management
  - Create DownloadManager class with secure token-based download links
  - Add download link expiration handling (48 hours) and attempt limits (5 max)
  - Implement download tracking and analytics logging
  - Create re-send functionality for expired download links
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Build free tier integration and limits
  - Implement free download tracking for anonymous and registered users
  - Add usage limit enforcement (3 for anonymous, 5 for registered)
  - Create upgrade prompts when free downloads are exhausted
  - Add watermark functionality for free downloads
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Create purchase history and user dashboard
  - Build purchase history API endpoints and database queries
  - Create user dashboard section for viewing purchases and downloads
  - Add receipt and licensing information display
  - Implement download link re-access for valid purchases
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Integrate with existing download system
  - Update existing download modal to show pricing options
  - Connect purchase flow with current file generation system
  - Add purchase verification to download endpoints
  - Update usage tracker to work with new purchase system
  - _Requirements: 1.1, 1.5, 2.1, 4.4_

- [x] 8. Wri te comprehensive tests for purchase system
  - Create unit tests for PurchaseManager and LicensingService
  - Add integration tests for Stripe webhook handling
  - Test download link security and expiration logic
  - Create end-to-end tests for complete purchase flow
  - _Requirements: 1.1, 3.1, 4.1, 6.1_

- [x] 9. Add error handling and user experience polish
  - Implement graceful error handling for payment failures
  - Add user-friendly error messages and retry options
  - Create loading states and success confirmations for purchase flow
  - Add customer support integration for purchase issues
  - _Requirements: 1.5, 3.5, 4.3, 6.5_