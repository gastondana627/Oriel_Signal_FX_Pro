# Synchronization Tests Documentation

## Overview

This document describes the comprehensive test suite for the synchronization functionality in the Oriel FX audio visualizer SaaS integration. The tests cover sync manager operations, offline functionality, conflict resolution, and integration scenarios.

## Test Files

### Core Test Files
- **`sync-tests.js`** - Main test suite with all test cases
- **`sync-test-runner.html`** - Browser-based test runner with UI
- **`verify-sync-tests.js`** - Test verification and coverage analysis
- **`sync-tests-documentation.md`** - This documentation file

### Dependencies
- **`sync-manager.js`** - SyncManager class implementation
- **`offline-manager.js`** - OfflineManager class implementation

## Test Suites

### 1. SyncManager Tests

Tests the core synchronization functionality including connectivity detection, queue management, and sync processing.

#### Connectivity Detection Tests
- **Online Status Detection**: Verifies correct detection of online status through backend ping
- **Offline Status Detection**: Tests offline detection when backend is unreachable
- **Event Handling**: Tests online/offline event handlers and status changes
- **Status Change Events**: Verifies custom events are dispatched for UI updates

#### Sync Queue Management Tests
- **Queue Operations**: Tests adding items to sync queue with different priorities
- **Priority Handling**: Verifies high-priority items are processed first
- **Persistence**: Tests saving/loading sync queue from localStorage
- **Error Handling**: Tests graceful handling of localStorage errors

#### Sync Processing Tests
- **Authentication Requirements**: Tests that sync only works when authenticated
- **Online Requirements**: Tests that sync only works when online
- **Retry Logic**: Tests retry mechanism for failed sync operations
- **Action Handling**: Tests different sync actions (preferences, downloads, presets, etc.)
- **Completion Events**: Tests sync completion event dispatching

#### Force Sync Tests
- **Successful Force Sync**: Tests manual sync trigger when conditions are met
- **Error Conditions**: Tests error handling for offline/unauthenticated force sync

#### Status and Cleanup Tests
- **Status Reporting**: Tests sync status information accuracy
- **Event Cleanup**: Tests proper event listener removal on destroy
- **Queue Management**: Tests sync queue clearing functionality

### 2. OfflineManager Tests

Tests offline mode functionality, data storage, and queue management.

#### Offline Mode Detection Tests
- **Status Detection**: Tests offline mode detection from sync status changes
- **Mode Transitions**: Tests enabling/disabling offline mode
- **UI Updates**: Tests offline mode UI indicators and notifications

#### Offline Data Storage Tests
- **Data Persistence**: Tests storing and retrieving data in offline mode
- **Error Handling**: Tests graceful handling of localStorage errors
- **User Data Fallback**: Tests offline user data structure and defaults

#### Offline Queue Management Tests
- **Action Queuing**: Tests queuing actions for later sync
- **Priority Handling**: Tests priority-based queue ordering
- **Queue Processing**: Tests processing offline queue when connection returns
- **Error Recovery**: Tests handling of processing errors

#### Download Tracking Tests
- **Offline Downloads**: Tests download tracking in offline mode
- **Limit Enforcement**: Tests download limit enforcement
- **Usage Calculation**: Tests usage statistics in offline mode

#### User Data Management Tests
- **Data Updates**: Tests updating user data in offline mode
- **Sync Queuing**: Tests automatic queuing of data changes for sync

### 3. Conflict Resolution Tests

Tests handling of data conflicts and resolution strategies.

#### Timestamp-Based Resolution Tests
- **Conflict Detection**: Tests detection of data conflicts
- **Resolution Logic**: Tests timestamp-based conflict resolution
- **Data Integrity**: Tests preservation of data integrity during conflicts

#### Retry Logic Tests
- **Conflict Retry**: Tests retry mechanism for conflict resolution
- **Success After Retry**: Tests successful sync after conflict resolution
- **Data Preservation**: Tests that original data is preserved during retries

### 4. Integration Tests

Tests complete workflows and interaction between sync and offline managers.

#### Complete Workflow Tests
- **Offline to Online**: Tests complete transition from offline to online mode
- **Data Synchronization**: Tests end-to-end data synchronization
- **Notification Flow**: Tests user notifications during sync processes

#### Data Consistency Tests
- **Cross-Manager Consistency**: Tests data consistency between managers
- **State Synchronization**: Tests state synchronization across components

#### Mixed Scenario Tests
- **Intermittent Connectivity**: Tests handling of intermittent network conditions
- **Partial Sync**: Tests handling of partial sync scenarios
- **Recovery Scenarios**: Tests recovery from various error conditions

## Test Coverage

### Requirements Coverage

The tests cover all requirements from the specification:

- **7.1 - Data Synchronization**: Tests cross-device data sync functionality
- **7.2 - Preferences Synchronization**: Tests user preferences sync
- **7.3 - Offline Mode**: Tests offline functionality with local storage fallback
- **7.4 - Connectivity Detection**: Tests network status detection and handling
- **7.5 - Conflict Resolution**: Tests sync conflict resolution mechanisms

### Scenario Coverage

- ✅ Online/offline connectivity changes
- ✅ Sync queue management and processing
- ✅ Offline data storage and retrieval
- ✅ Conflict resolution with retry logic
- ✅ Cross-device data synchronization
- ✅ Error handling and graceful degradation
- ✅ Authentication state changes
- ✅ Network simulation scenarios
- ✅ Data persistence and recovery
- ✅ UI state management

## Running the Tests

### Browser-Based Testing

1. **Open Test Runner**: Open `sync-test-runner.html` in a web browser
2. **Run All Tests**: Click "Run All Tests" to execute the complete test suite
3. **Individual Suites**: Use specific buttons to run individual test suites
4. **Network Simulation**: Use connectivity simulation buttons to test different network scenarios

### Test Controls

- **Run All Tests**: Executes all test suites sequentially
- **Sync Manager Tests**: Runs only SyncManager test suite
- **Offline Manager Tests**: Runs only OfflineManager test suite
- **Conflict Resolution Tests**: Runs only conflict resolution tests
- **Integration Tests**: Runs only integration test suite
- **Clear Results**: Clears all test results and resets UI

### Network Simulation

The test runner includes network simulation capabilities:

- **Online**: Normal network connectivity
- **Offline**: Simulates complete network failure
- **Intermittent**: Simulates unreliable network with random failures
- **Slow Network**: Simulates slow network with delays

### Test Verification

Run `verify-sync-tests.js` to validate test coverage and implementation:

```javascript
// In browser console or Node.js
verifySynchronizationTests();
```

## Mock Framework

The tests use a custom Jest-like mock framework for browser compatibility:

### Mock Functions
```javascript
const mockFn = jest.fn();
mockFn.mockResolvedValue(value);
mockFn.mockRejectedValue(error);
expect(mockFn).toHaveBeenCalledWith(args);
```

### Assertions
```javascript
expect(actual).toBe(expected);
expect(actual).toEqual(expected);
expect(array).toHaveLength(length);
expect(object).toMatchObject(partial);
expect(fn).toThrow(message);
```

### Async Testing
```javascript
test('async test', async () => {
    await expect(promise).rejects.toThrow('error message');
    const result = await asyncFunction();
    expect(result).toBe('expected');
});
```

## Test Data and Scenarios

### Mock Data Structures

#### User Preferences
```javascript
const mockPreferences = {
    theme: 'dark',
    language: 'en',
    volume: 0.8,
    autoPlay: true,
    customSettings: {
        visualizerType: 'bars',
        colorScheme: 'rainbow'
    }
};
```

#### Download Data
```javascript
const mockDownloadData = {
    type: 'gif',
    duration: 30,
    quality: 'high',
    timestamp: Date.now()
};
```

#### Usage Data
```javascript
const mockUsageData = {
    downloadsUsed: 2,
    downloadsLimit: 3,
    lastReset: Date.now(),
    plan: 'free'
};
```

### Test Scenarios

#### Connectivity Scenarios
- Normal online operation
- Complete network failure
- Intermittent connectivity
- Slow network conditions
- Backend server unavailable
- Authentication token expiry

#### Data Scenarios
- Empty sync queue
- Large sync queue
- High-priority items
- Failed sync items
- Conflicting data updates
- Corrupted localStorage data

#### User Scenarios
- Anonymous user
- Authenticated user
- User logout during sync
- User switching devices
- Multiple browser tabs
- Concurrent sync operations

## Error Handling

### Expected Error Types

1. **Network Errors**: Connection failures, timeouts
2. **Authentication Errors**: Invalid tokens, expired sessions
3. **Storage Errors**: localStorage quota exceeded, corruption
4. **Conflict Errors**: Data conflicts, version mismatches
5. **Validation Errors**: Invalid data formats, missing fields

### Error Recovery Testing

- Automatic retry mechanisms
- Graceful degradation to offline mode
- User notification of error states
- Data preservation during errors
- Recovery after error resolution

## Performance Considerations

### Test Performance
- Tests run efficiently in browser environment
- Mock network delays simulate real-world conditions
- Async operations properly awaited
- Memory cleanup after test completion

### Monitoring Points
- Sync queue processing time
- Offline data storage performance
- Network request frequency
- Memory usage during sync operations

## Maintenance

### Adding New Tests

1. **Identify Test Category**: Determine which test suite the new test belongs to
2. **Write Test Case**: Follow existing patterns for test structure
3. **Update Coverage**: Add test to verification script
4. **Document Changes**: Update this documentation

### Updating Mock Data

1. **Maintain Consistency**: Keep mock data consistent with real API responses
2. **Version Compatibility**: Ensure mocks work with current backend version
3. **Edge Cases**: Include edge cases and error conditions

### Test Environment

- **Browser Compatibility**: Tests work in modern browsers
- **No External Dependencies**: All dependencies included in test files
- **Offline Capable**: Tests can run without internet connection
- **Responsive UI**: Test runner works on different screen sizes

## Troubleshooting

### Common Issues

1. **Tests Not Loading**: Check file paths and script loading order
2. **Mock Failures**: Verify mock implementations match real APIs
3. **Async Issues**: Ensure proper async/await usage
4. **Storage Errors**: Clear localStorage if tests fail unexpectedly

### Debug Mode

Enable debug logging by setting:
```javascript
window.DEBUG_SYNC_TESTS = true;
```

This will provide detailed logging of test execution and mock interactions.

## Conclusion

The synchronization test suite provides comprehensive coverage of all sync-related functionality, ensuring reliable operation across various network conditions and user scenarios. The tests validate both individual component behavior and integrated system functionality, providing confidence in the synchronization implementation.