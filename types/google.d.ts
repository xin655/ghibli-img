declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { code: string }) => void;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

export {}; 