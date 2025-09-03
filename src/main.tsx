import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';

import App from './App.tsx';
import { ThemeProvider } from "./components/theme-provider";
import { store } from './app/store';
import { setDispatch } from './utils/setStore';
import './index.css';

setDispatch(store.dispatch, store.getState);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Fatal Error: Root element with ID 'root' not found.");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" reverseOrder={false} />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>
);