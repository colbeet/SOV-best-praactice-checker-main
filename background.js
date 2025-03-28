// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  // Initialize any extension data if needed
  chrome.storage.sync.get(['wistiaApiKey'], function(result) {
    if (!result.wistiaApiKey) {
      // Set default values if needed
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'analyzeVideo') {
    // Handle any background processing if needed
    sendResponse({ success: true });
  }
  return true;
}); 