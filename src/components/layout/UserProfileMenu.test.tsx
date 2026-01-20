/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { UserProfileMenu } from './UserProfileMenu';
import { useNavfitStore } from '@/store/useNavfitStore';
import { MOCK_USERS } from '@/domain/auth/mockUsers';
import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';

// Polyfill ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('UserProfileMenu', () => {
    beforeEach(() => {
        // Reset store
        useNavfitStore.setState({
            currentUser: MOCK_USERS[0],
            isAuthenticated: true,
            availableUsers: MOCK_USERS
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    test('renders current user info when authenticated', () => {
        render(<UserProfileMenu collapsed={false} />);
        expect(screen.getByText('CDR M. Clark')).toBeTruthy();
        expect(screen.getByText('Commanding Officer')).toBeTruthy();
        expect(screen.getByText('MC')).toBeTruthy();
    });

    test('renders menu items when clicked', async () => {
        render(<UserProfileMenu collapsed={false} />);

        // Open menu
        const trigger = screen.getByRole('button');
        fireEvent.click(trigger);

        // Wait for menu transition
        await waitFor(() => {
            // Check for Actions
            expect(screen.getByText('Settings')).toBeTruthy();
        });

        expect(screen.getByText('Log out')).toBeTruthy();
    });

    test('logging out clears user', async () => {
        render(<UserProfileMenu collapsed={false} />);

        // Open menu
        fireEvent.click(screen.getByRole('button'));

        // Click Logout
        await waitFor(() => {
            expect(screen.getByText('Log out')).toBeTruthy();
        });

        const logoutText = screen.getByText('Log out');
        const logoutBtn = logoutText.closest('button');
        fireEvent.click(logoutBtn!);

        const state = useNavfitStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.currentUser).toBeNull();
    });

    test('shows Login button when logged out', () => {
        useNavfitStore.setState({
            currentUser: null,
            isAuthenticated: false
        });

        render(<UserProfileMenu collapsed={false} />);

        // There might be multiple "Log In" texts (e.g. icon title vs text).
        // In my component:
        // 1. Menu Button Icon might not have text "Log In" visible, but...
        // 2. The side text "Log In" <button>Log In</button>
        // Let's use getByRole for the text button.

        // Actually, looking at code:
        // <Menu.Button ...><LogIn size={20} /></Menu.Button> -> No text
        // <button ...>Log In</button> -> Text "Log In"

        // So getByText('Log In') should be unique unless the Icon from lucide has title?
        // Let's safe guard with getAllByText just in case.
        expect(screen.getAllByText('Log In').length).toBeGreaterThan(0);
    });
});
