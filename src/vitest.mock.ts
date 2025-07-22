import { app } from "electron";
import { beforeAll, vi } from "vitest";

// Mock electron bindings and global window object for tests first
Object.defineProperty(global, 'window', {
  value: {
    __electronCall: vi.fn(),
  },
  writable: true
});

// Mock the specific file that's causing issues
vi.mock("@electron/remote/dist/src/common/get-electron-binding", () => ({
  getElectronBinding: vi.fn(() => ({
    getHiddenValue: vi.fn(() => 'test-context-id')
  }))
}));

// Mock the entire @electron/remote module
vi.mock("@electron/remote", () => ({
  exec: vi.fn(),
  process: vi.fn(),
  app: { getAppPath: () => "" },
  getElectronBinding: vi.fn(() => ({
    getHiddenValue: vi.fn(() => 'test-context-id')
  }))
})); //See commit msg for info
//
//   getTestEnvironment: () => ({
//     E2E: false,
//     E2E_USER_SETTINGS_STORE_NAME: "",
//     E2ERoot: ""
//   })
// }));

// Various things are causing react to load during non-ui unit tests,
// even though they are not actually run.
// I think this slows things down and you can see the message
// "Download the React DevTools for a better development experience..."
// ButterToast is one of them. I despair at finding them all.
// vi.mock("butter-toast", () => ({
//   default: { raise: vi.fn() },
//   Cinnamon: vi.fn()
// }));

// mock out all @emotion/react methods
// vi.mock("@emotion/react", () => ({
//   default: () => console.log("emotion default"),
//   css: () => console.log("emotion css"),
//   jsx: () => console.log("emotion jsx"),
//   keyframes: vi.fn(),
//   Global: vi.fn(),
//   ThemeProvider: () => console.log("emotion t"),
//   CacheProvider: vi.fn(),
//   ClassNames: vi.fn(),
//   useTheme: () => console.log("emotion ut"),
//   withEmotionCache: vi.fn()
// }));

// mock out all react methods
// vi.mock("react", () => ({
//   displayName: "React",
//   //...vi.re.requireActual("react"),
//   useInsertionEffect: vi.fn(),
//   createContext: () => {
//     console.log("createContext");
//     throw new Error();
//   },
//   useState: vi.fn(),
//   useEffect: vi.fn(),
//   useContext: vi.fn(),
//   useReducer: vi.fn(),
//   useRef: vi.fn(),
//   useLayoutEffect: vi.fn(),
//   useCallback: vi.fn(),
//   useMemo: vi.fn(),
//   useImperativeHandle: vi.fn(),
//   useDebugValue: vi.fn(),
//   forwardRef: vi.fn(),
//   memo: vi.fn(),
//   createRef: vi.fn(),
//   isValidElement: vi.fn(),
//   Children: {
//     map: vi.fn(),
//     forEach: vi.fn(),
//     count: vi.fn(),
//     toArray: vi.fn(),
//     only: vi.fn()
//   }
// }));
