import { useState, useEffect } from 'react';

/**
 * Custom hook for browser push notifications
 * @param {string} username - Current username
 * @returns {Object} { permission, requestPermission, showNotification }
 */
export function useNotifications(username) {
    const [permission, setPermission] = useState('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if ('Notification' in window) {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            return perm;
        }
        return 'denied';
    };

    const showNotification = (title, options = {}) => {
        if (permission === 'granted' && 'Notification' in window) {
            // Only show if window is not focused
            if (!document.hasFocus()) {
                const notification = new Notification(title, {
                    icon: '/icon.png',
                    badge: '/badge.png',
                    tag: 'chat-notification',
                    renotify: true,
                    ...options
                });

                // Auto-close after 5 seconds
                setTimeout(() => notification.close(), 5000);

                // Focus window on click
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                return notification;
            }
        }
        return null;
    };

    return { permission, requestPermission, showNotification };
}
