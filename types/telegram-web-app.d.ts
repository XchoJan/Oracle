declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        version: string;
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
      };
    };
  }
}

export {};
