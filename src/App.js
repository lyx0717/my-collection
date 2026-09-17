import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
export default function App() {
    return (_jsxs("div", { className: "flex min-h-dvh flex-col", children: [_jsx(Header, {}), _jsx("main", { className: "mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-10", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminPage, {}) }), _jsx(Route, { path: "*", element: _jsx(HomePage, {}) })] }) }), _jsx(Footer, {})] }));
}
