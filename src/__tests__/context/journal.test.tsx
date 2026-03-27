import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { JournalProvider, useJournal } from '@/context/JournalContext';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <JournalProvider>{children}</JournalProvider>
);

describe('JournalContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    it('starts with an empty entries array', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });
        expect(result.current.entries).toEqual([]);
    });

    it('adding an entry creates a proper id and date', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });

        act(() => {
            result.current.addEntry({
                emotion: 'happy',
                intensity: 'medium',
                message: 'Feeling great today!',
            });
        });

        expect(result.current.entries).toHaveLength(1);

        const entry = result.current.entries[0];
        expect(entry.id).toBeDefined();
        expect(entry.id).toMatch(/^entry-\d+$/);
        expect(entry.date).toBeDefined();
        // Verify it is a valid ISO date string
        expect(new Date(entry.date).toISOString()).toBe(entry.date);
        expect(entry.emotion).toBe('happy');
        expect(entry.intensity).toBe('medium');
        expect(entry.message).toBe('Feeling great today!');
    });

    it('adding multiple entries prepends newest first', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });

        act(() => {
            result.current.addEntry({
                emotion: 'happy',
                intensity: 'medium',
                message: 'First entry',
            });
        });

        act(() => {
            result.current.addEntry({
                emotion: 'sad',
                intensity: 'high',
                message: 'Second entry',
            });
        });

        expect(result.current.entries).toHaveLength(2);
        // Newest is first
        expect(result.current.entries[0].emotion).toBe('sad');
        expect(result.current.entries[1].emotion).toBe('happy');
    });

    it('updating an entry works', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });

        act(() => {
            result.current.addEntry({
                emotion: 'tired',
                intensity: 'low',
                message: 'Just tired',
            });
        });

        const entryId = result.current.entries[0].id;

        act(() => {
            result.current.updateEntry(entryId, {
                reflectionNote: 'Feeling better after a nap',
                reflectionEmotion: 'calm',
                reflectionIntensity: 'low',
            });
        });

        const updated = result.current.entries[0];
        expect(updated.reflectionNote).toBe('Feeling better after a nap');
        expect(updated.reflectionEmotion).toBe('calm');
        expect(updated.reflectionIntensity).toBe('low');
        // Original fields preserved
        expect(updated.emotion).toBe('tired');
        expect(updated.message).toBe('Just tired');
    });

    it('updating a non-existent entry does not change anything', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });

        act(() => {
            result.current.addEntry({
                emotion: 'happy',
                intensity: 'medium',
                message: 'Test',
            });
        });

        const entriesBefore = [...result.current.entries];

        act(() => {
            result.current.updateEntry('non-existent-id', { emotion: 'sad' });
        });

        expect(result.current.entries).toEqual(entriesBefore);
    });

    it('clearing entries empties the list', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });

        act(() => {
            result.current.addEntry({
                emotion: 'happy',
                intensity: 'medium',
                message: 'Entry 1',
            });
        });

        act(() => {
            result.current.addEntry({
                emotion: 'sad',
                intensity: 'high',
                message: 'Entry 2',
            });
        });

        expect(result.current.entries).toHaveLength(2);

        act(() => {
            result.current.clearEntries();
        });

        expect(result.current.entries).toEqual([]);
    });

    it('getEntry retrieves an entry by id', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });

        act(() => {
            result.current.addEntry({
                emotion: 'focused',
                intensity: 'high',
                message: 'Studying hard',
            });
        });

        const entryId = result.current.entries[0].id;
        const found = result.current.getEntry(entryId);
        expect(found).toBeDefined();
        expect(found!.emotion).toBe('focused');
    });

    it('getEntry returns undefined for unknown id', () => {
        const { result } = renderHook(() => useJournal(), { wrapper });
        const found = result.current.getEntry('does-not-exist');
        expect(found).toBeUndefined();
    });

    it('throws when useJournal is used outside JournalProvider', () => {
        // Suppress console.error for this test
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => {
            renderHook(() => useJournal());
        }).toThrow('useJournal must be used inside JournalProvider');
        spy.mockRestore();
    });
});
