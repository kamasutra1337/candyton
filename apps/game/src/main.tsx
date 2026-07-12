import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { App } from './ui/App';
import { initTelegram } from './web3/telegram';
import './styles.css';

initTelegram();

const manifestUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : '/tonconnect-manifest.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
);
