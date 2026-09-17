import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { CollectionProvider } from './store/CollectionContext';
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(CollectionProvider, { children: _jsx(HashRouter, { children: _jsx(App, {}) }) }) }));
