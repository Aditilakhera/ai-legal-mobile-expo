/**
 * AI Legal Mobile - Custom Hooks Layer
 * Consolidated entry point for custom hooks (Auth, Chat, Cases, Workspace, Media, Keyboard, Network, Platform).
 */

export { useAuth } from './use-auth';
export { useChat } from './use-chat';
export { useCases } from './use-cases';
export { useWorkspace } from './use-workspace';
export { useStreaming } from './use-streaming';
export { useUpload } from './use-upload';
export { useKeyboard } from './use-keyboard';
export { useNetwork } from './use-network';
export { usePermissions } from './use-permissions';
export { useNotificationsManager } from './use-notifications-manager';

// Re-export existing hooks
export { useColorScheme } from './use-color-scheme';
export { useTheme } from './use-theme';
