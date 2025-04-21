import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from "./components/theme-provider"
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { setDispatch } from './utils/setStore';
import { Toaster } from 'react-hot-toast';


setDispatch(store.dispatch, store.getState);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <BrowserRouter>
    <Provider store={store}>
    <App />
    <Toaster position="top-right"  reverseOrder={false} />
    </Provider>
    </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
