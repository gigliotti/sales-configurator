# Testing Infrastructure (TEST_INFRA.md)

This document describes the testing infrastructure configured for the `sales-configurator` package.

## 1. Core Framework and Packages
The testing framework is built on **Vitest** for blazing-fast testing with ESM support and standard Jest-compatible assertions.
- **Vitest (`vitest`)**: Test runner and assertion library.
- **cross-env (`cross-env`)**: Multi-platform environment variable configuration.
- **jsdom**: Browser simulation environment for DOM/React rendering compatibility (when needed).

## 2. Configuration (`vitest.config.ts`)
Vitest is configured at `sales-configurator/vitest.config.ts` with the following key attributes:
- **Environment**: Node environment with mocking enabled.
- **Setup Files**: Uses `src/__tests__/setup.ts` to automatically set up mock databases, mock environment variables, and reset state between tests.
- **Isolate**: Standard execution isolation to prevent leakages across tests.

## 3. Mocking Strategy (`src/lib/__mocks__/supabaseClient.ts`)
Since the application relies heavily on Supabase for data persistence and authentication, a high-fidelity mock client was created to simulate Postgres queries and authentication state:
- **Mock DB State**: Real standard catalog components (e.g. V-STACK 535, conveyor accessories, sheet dispensers), client profiles (admin and seller roles), and projects list are seeded in-memory.
- **Transaction Simulator**: Emulates Supabase query chains (`from().select().eq().single()`), returning deep clones of records to prevent tests from modifying global templates.
- **GoTrue Auth Simulation**: Tracks active profiles and dynamically returns correct headers.

## 4. Test Suite Architecture (Tiers 1 - 4)
The test suite is structured into 4 layers of testing rigor, encompassing 93 tests:
- **Tier 1: Feature Coverage (R1 - R8)**: Verifies the core correctness of every single feature requirement, including role-based authentication, proximity snapping, catalog loading, multi-line support, currency calculations, and PDF export logic.
- **Tier 2: Boundary & Corner Cases**: Focuses on edge conditions such as empty database payloads, extreme dimensions validation, boundary weight limits, consecutive saves, and cascade deletions.
- **Tier 3: Cross-Feature Combinations**: Tests the interfaces between different modules, such as Auth Role restriction preventing catalog modification, and i18n localization translation lookups of database items.
- **Tier 4: Real-World Scenarios**: Simulates full end-to-end user workflows (e.g. multi-line packaging plant quote setups, public/anonymous share-link read-only views, and network error resilience/timeouts).

## 5. Store State Verification (`storeProxy`)
To solve the issue of stale closures and snapshot references in Zustand state assertions:
- **`storeProxy`**: A global Proxy object wrapping `useConfiguratorStore.getState()`. Every reference to `store` automatically fetches the latest, reactive state, ensuring tests assert on the actual state transition instead of stale variable cache values.

## 6. Last Verification
- **Last Verified**: 2026-06-05
- **Status**: 93/93 tests passing successfully
