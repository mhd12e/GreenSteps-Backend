import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Console Security Warning
console.log(
  "%cSTOP!",
  "color: #ef4444; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0px rgba(0,0,0,0.1);"
);
console.log(
  "%cThis is a browser feature intended for developers. If someone told you to copy and paste something here to 'hack' an account or 'unlock' a hidden feature, it is a SCAM and will give them access to your GreenSteps account.%c\n\nSee https://en.wikipedia.org/wiki/Self-XSS for more information.",
  "color: white; font-size: 18px; font-weight: 500; line-height: 1.4;",
  "color: #9ca3af; font-size: 14px;"
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)