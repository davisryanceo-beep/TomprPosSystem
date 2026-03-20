import { vi } from 'vitest';

// Define globals
(global as any).__DEV__ = true;

// Mock react-native
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: vi.fn((objs) => objs.web || objs.default),
  },
  StyleSheet: {
    create: vi.fn((s) => s),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  // Add other RN components as needed
}));

// Mock Expo components
vi.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

vi.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: vi.fn(() => [{ granted: true }, vi.fn()]),
}));

// Mock Contexts
vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#666',
      card: '#eee',
      border: '#ccc',
      primary: '#0070f3',
      primaryGradient: ['#0070f3', '#0070f3'],
      accentGradient: ['#f81ce5', '#f81ce5'],
      danger: '#ff0000',
      success: '#00cc00',
    },
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock AnnouncementsSection
vi.mock('../components/AnnouncementsSection', () => ({
    default: 'AnnouncementsSection'
}));

// Mock Expo Constants
vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      hostUri: 'localhost:8081',
    },
  },
}));

// Mock SecureStore
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
