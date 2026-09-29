import './styles/main.css';
import { startApp } from './app.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app mount point');
startApp(root);
