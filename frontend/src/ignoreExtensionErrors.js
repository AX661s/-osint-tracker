// Helper to detect extension errors
const isExtensionError = (error) => {
  if (!error) return false;
  
  // Handle various error shapes
  const errorStr = typeof error === 'string' ? error : 
                   error.message ? error.message : 
                   error.toString ? error.toString() : '';
                   
  const stack = error.stack || '';
  
  // Keywords to filter
  const keywords = [
    'MetaMask',
    'nkbihfbeogaeaoehlefnkodbefgpgknn', // MetaMask extension ID
    'chrome-extension://',
    'Failed to connect',
    'Extension context invalidated',
    'message port closed',
    'The message port closed before a response was received',
    'Disconnected from MetaMask background',
    'runtime.lastError',
    'A listener indicated an asynchronous response by returning true'
  ];
  
  return keywords.some(keyword => 
    errorStr.includes(keyword) || stack.includes(keyword)
  );
};

// Prevent default error handling for extension errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (isExtensionError(event.error) || isExtensionError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isExtensionError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  }, true);

  // Patch console.error to hide these errors from console
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args.some(arg => isExtensionError(arg))) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}
