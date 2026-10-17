/** /editor entry (level-editor.md §5.2): a separate Vite input, so React and React Flow never reach the game bundle. */
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './editor.css';

createRoot(document.getElementById('editor')!).render(<App />);
