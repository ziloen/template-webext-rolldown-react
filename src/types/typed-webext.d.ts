import 'typed-webext'

declare module 'typed-webext' {
  interface MessageProtocol<T = unknown> {
    example: [never, never]
    open_sidebar: [options: { windowId?: number } | undefined, never]
    toggle_sidebar: [options: { windowId?: number } | undefined, never]
    to_sidepanel_close_sidepanel: [never, never]
  }

  interface StreamProtocol {}

  interface StorageLocalProtocol {
    // Pop-up Notification System: One-Click Restore All Notifications
    tipsRecords: Record<
      string,
      {
        viewed: number
        timestamp: number
        priority: number
      }
    >
    suppressedTips: string[]
  }
}
