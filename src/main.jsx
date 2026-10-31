import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<h2 style="color:red;padding:40px">错误: 找不到 #root 元素</h2>';
} else {
  ReactDOM.createRoot(rootEl).render(<App />);
}
