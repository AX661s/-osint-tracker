import "./ignoreExtensionErrors";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// 过滤 React DevTools 的错误覆盖层
if (typeof window !== 'undefined') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  const originalCallback = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = function(...args) {
    try {
      if (originalCallback) {
        return originalCallback.apply(this, args);
      }
    } catch (err) {
      // 忽略扩展相关错误
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);

