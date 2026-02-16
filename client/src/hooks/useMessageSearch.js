import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for searching messages
 * @param {Array} messages - All messages
 * @returns {Object} { searchQuery, setSearchQuery, filteredMessages, highlightedIndices }
 */
export function useMessageSearch(messages) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;

        const query = searchQuery.toLowerCase();
        return messages.filter(msg =>
            msg.text?.toLowerCase().includes(query) ||
            msg.username?.toLowerCase().includes(query)
        );
    }, [messages, searchQuery]);

    const highlightedIndices = useMemo(() => {
        if (!searchQuery.trim()) return new Set();

        const indices = new Set();
        const query = searchQuery.toLowerCase();

        messages.forEach((msg, index) => {
            if (
                msg.text?.toLowerCase().includes(query) ||
                msg.username?.toLowerCase().includes(query)
            ) {
                indices.add(index);
            }
        });

        return indices;
    }, [messages, searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    return {
        searchQuery,
        setSearchQuery,
        filteredMessages,
        highlightedIndices,
        clearSearch,
        hasResults: filteredMessages.length > 0,
        resultCount: filteredMessages.length,
    };
}
