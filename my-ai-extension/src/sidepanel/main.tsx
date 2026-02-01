import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('XARE: main.tsx loaded');

const rootElement = document.getElementById('root');
console.log('XARE: root element', rootElement);

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('XARE: App rendered successfully');
  } catch (error) {
    console.error('XARE: Render error', error);
    rootElement.innerHTML = `<div style="color: white; padding: 20px;">Error: ${error}</div>`;
  }
} else {
  console.error('XARE: Root element not found!');
}
