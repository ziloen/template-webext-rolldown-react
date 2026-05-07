declare module 'react' {
  // fix react forwardRef, https://stackoverflow.com/questions/58469229/react-with-typescript-generics-while-using-react-forwardref
  function forwardRef<T, P = {}>(
    render: (props: P, ref: ForwardedRef<T>) => ReactElement | null,
  ): (props: P & RefAttributes<T>) => ReactElement | null

  // allow style to use css custom properties
  interface CSSProperties {
    [CSSCutomProperties: `--${string}`]: string | number | undefined
  }

  // allow destructor return value
  function useEffect(
    effect: () => void | (() => void),
    deps?: DependencyList,
  ): void
  function useInsertionEffect(
    effect: () => void | (() => void),
    deps?: DependencyList,
  ): void
  function useLayoutEffect(
    effect: () => void | (() => void),
    deps?: DependencyList,
  ): void
}

declare module 'webextension-polyfill' {
  const sidePanel: typeof chrome.sidePanel | undefined

  namespace Manifest {
    interface WebExtensionManifestWebAccessibleResourcesC2ItemType {
      /**
       * Optional. Defaults to `false`.
       *
       * Whether resources to be accessible through the dynamic ID. The dynamic ID is generated per session and regenerated on browser restart or extension reload.
       */
      use_dynamic_url?: boolean
    }
  }
}

export {}
