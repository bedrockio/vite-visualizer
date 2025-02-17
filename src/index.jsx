import { createRoot } from 'react-dom/client';

import { getRings } from './utils.js';

import App from './App.jsx';

if (!window.__GRAPH__) {
  throw new Error('Could not find graph data.');
}

const rings = getRings(window.__GRAPH__);

createRoot(document.getElementById('root')).render(<App rings={rings} />);
