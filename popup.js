document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const mediaIdInput = document.getElementById('urlInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const resultsDiv = document.getElementById('results');
  const videoDetailsDiv = document.getElementById('videoDetails');
  const engagementMetricsDiv = document.getElementById('engagementMetrics');
  const benchmarkComparisonDiv = document.getElementById('benchmarkComparison');

  // Benchmark data from State of Video 2023
  const BENCHMARKS = {
    videoTypes: {
      'original-series': { conversion: 0.30, name: 'Original Series' },
      'webinar': { conversion: 0.25, name: 'Webinar' },
      'sales': { conversion: 0.20, name: 'Sales' },
      'customer-testimonial': { conversion: 0.17, name: 'Customer Testimonial' },
      'product': { conversion: 0.17, name: 'Product' },
      'educational': { conversion: 0.16, name: 'Educational' },
      'promotional': { conversion: 0.12, name: 'Promotional' },
      'company-culture': { conversion: 0.08, name: 'Company Culture' },
      'social-media': { conversion: 0.04, name: 'Social Media' }
    },
    pageTypes: {
      'blog': { videoPresence: 0.16, playRate: 0.11, engagementRate: 0.44, avgLength: 5 },
      'case-study': { videoPresence: 0.05, playRate: 0.08, engagementRate: 0.47, avgLength: 4 },
      'course': { videoPresence: 0.02, playRate: 0.35, engagementRate: 0.50, avgLength: 21 },
      'contact': { videoPresence: 0.03, playRate: 0.32, engagementRate: 0.51, avgLength: 2 },
      'event': { videoPresence: 0.04, playRate: 0.17, engagementRate: 0.33, avgLength: 26 },
      'home': { videoPresence: 0.36, playRate: 0.17, engagementRate: 0.50, avgLength: 6 },
      'landing': { videoPresence: 0.03, playRate: 0.13, engagementRate: 0.42, avgLength: 6 },
      'video-gallery': { videoPresence: 0.11, playRate: 0.33, engagementRate: 0.45, avgLength: 15 },
      'product': { videoPresence: 0.20, playRate: 0.12, engagementRate: 0.57, avgLength: 3 },
      'thank-you': { videoPresence: 0.02, playRate: 0.16, engagementRate: 0.55, avgLength: 10 }
    },
    lengthBenchmarks: {
      'under-1': { maxSeconds: 60, conversion: 0.02 },
      '1-3': { maxSeconds: 180, conversion: 0.02 },
      '3-5': { maxSeconds: 300, conversion: 0.05 },
      '5-30': { maxSeconds: 1800, conversion: 0.10 },
      '30-60': { maxSeconds: 3600, conversion: 0.17 }
    }
  };

  // Load saved values and check current tab
  chrome.storage.sync.get(['wistiaApiKey', 'wistiaMediaId', 'videoType', 'pageType'], function(result) {
    if (result.wistiaApiKey) {
      apiKeyInput.value = result.wistiaApiKey;
    }
    if (result.wistiaMediaId) {
      mediaIdInput.value = result.wistiaMediaId;
    }
    
    // Check current tab for Wistia URL
    checkCurrentTab();
  });

  // Function to extract media ID from Wistia URL
  function extractMediaId(url) {
    const mediaPattern = /(?:wistia\.com\/medias|wistia\.net\/embed)\/([a-zA-Z0-9]+)/;
    const match = url.match(mediaPattern);
    return match ? match[1] : null;
  }

  // Function to check current tab for Wistia URL
  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const mediaId = extractMediaId(tabs[0].url);
        if (mediaId) {
          mediaIdInput.value = mediaId;
          chrome.storage.sync.set({ wistiaMediaId: mediaId });
        }
      }
    });
  }

  // Listen for tab updates
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      const mediaId = extractMediaId(changeInfo.url);
      if (mediaId) {
        mediaIdInput.value = mediaId;
        chrome.storage.sync.set({ wistiaMediaId: mediaId });
      }
    }
  });

  // Event listeners for input fields
  apiKeyInput.addEventListener('input', function() {
    chrome.storage.sync.set({ wistiaApiKey: apiKeyInput.value });
  });

  mediaIdInput.addEventListener('input', function() {
    chrome.storage.sync.set({ wistiaMediaId: mediaIdInput.value });
  });

  analyzeBtn.addEventListener('click', async function() {
    const apiKey = apiKeyInput.value.trim();
    const mediaId = mediaIdInput.value.trim();

    if (!apiKey || !mediaId) {
      showError('Please enter both API key and Media ID');
      return;
    }

    try {
      showLoading();
      const videoData = await fetchVideoData(mediaId, apiKey);
      const stats = await fetchVideoStats(mediaId, apiKey);
      
      displayResults(videoData, stats);
    } catch (error) {
      showError(error.message);
    }
  });

  async function fetchVideoData(mediaId, apiKey) {
    const response = await fetch(`https://api.wistia.com/v1/medias/${mediaId}.json`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch video data');
    }

    return await response.json();
  }

  async function fetchVideoStats(mediaId, apiKey) {
    const response = await fetch(`https://api.wistia.com/v1/stats/medias/${mediaId}.json`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch video stats');
    }

    return await response.json();
  }

  function getLengthCategory(duration) {
    for (const [category, data] of Object.entries(BENCHMARKS.lengthBenchmarks)) {
      if (duration <= data.maxSeconds) {
        return { category, data };
      }
    }
    return { category: '30-60', data: BENCHMARKS.lengthBenchmarks['30-60'] };
  }

  function displayResults(videoData, stats) {
    const duration = videoData.duration;
    const lengthCategory = getLengthCategory(duration);
    const engagement = stats.engagement || 0;
    const playRate = (stats.play_count / stats.visitor_count) || 0;
    
    // Get selected video and page types
    const videoType = document.getElementById('videoType').value;
    const pageType = document.getElementById('pageType').value;

    // Display video details
    videoDetailsDiv.innerHTML = `
      <h3>Video Details</h3>
      <p>Title: ${videoData.name}</p>
      <p>Duration: ${formatDuration(duration)}</p>
      <p>Length Category: ${lengthCategory.category} minutes</p>
    `;

    // Display engagement metrics
    engagementMetricsDiv.innerHTML = `
      <h3>Performance Metrics</h3>
      <p>Engagement Rate: ${(engagement * 100).toFixed(1)}%</p>
      <p>Play Rate: ${(playRate * 100).toFixed(1)}%</p>
      <p>Total Views: ${stats.play_count}</p>
      <p>Unique Visitors: ${stats.visitor_count}</p>
    `;

    // Display benchmark comparisons
    let benchmarkHtml = '<h3>Benchmark Comparisons</h3>';

    // Add length-based metrics
    const lengthConversion = lengthCategory.data.conversion;
    const lengthDiff = engagement - lengthConversion;
    const lengthColor = getPerformanceColor(lengthDiff);
    
    benchmarkHtml += `
      <div class="benchmark-section">
        <h4>Length-Based Metrics</h4>
        <p style="color: ${lengthColor}">
          Expected Conversion Rate: ${(lengthConversion * 100).toFixed(1)}%
          (You: ${(engagement * 100).toFixed(1)}% - 
          ${getPerformanceText(lengthDiff)})
        </p>
      </div>
    `;

    // Add video type specific benchmark if selected
    if (videoType) {
      const videoTypeData = BENCHMARKS.videoTypes[videoType];
      const videoTypeDiff = engagement - videoTypeData.conversion;
      const videoTypeColor = getPerformanceColor(videoTypeDiff);
      
      benchmarkHtml += `
        <div class="benchmark-section">
          <h4>${videoTypeData.name} Video Benchmark</h4>
          <p style="color: ${videoTypeColor}">
            Expected Conversion Rate: ${(videoTypeData.conversion * 100).toFixed(1)}%
            (You: ${(engagement * 100).toFixed(1)}% - 
            ${getPerformanceText(videoTypeDiff)})
          </p>
        </div>
      `;
    }

    // Add page type specific benchmark if selected
    if (pageType) {
      const pageTypeData = BENCHMARKS.pageTypes[pageType];
      const pageTypeDiff = engagement - pageTypeData.engagementRate;
      const pageTypeColor = getPerformanceColor(pageTypeDiff);
      
      benchmarkHtml += `
        <div class="benchmark-section">
          <h4>${pageType.replace('-', ' ').toUpperCase()} Page Benchmark</h4>
          <p style="color: ${pageTypeColor}">
            Expected Engagement: ${(pageTypeData.engagementRate * 100).toFixed(1)}%
            (You: ${(engagement * 100).toFixed(1)}% - 
            ${getPerformanceText(pageTypeDiff)})
          </p>
          <p>Typical Play Rate: ${(pageTypeData.playRate * 100).toFixed(1)}%</p>
          <p>Average Video Length: ${pageTypeData.avgLength} minutes</p>
        </div>
      `;
    }

    benchmarkComparisonDiv.innerHTML = benchmarkHtml;
    showResults();
  }

  function getPerformanceColor(difference) {
    if (difference >= 0) return '#2ecc71'; // Green for at or above benchmark
    if (difference >= -0.1) return '#f1c40f'; // Yellow for within 10% below
    return '#e74c3c'; // Red for more than 10% below
  }

  function getPerformanceText(difference) {
    if (difference >= 0) return 'At or Above Benchmark';
    if (difference >= -0.1) return 'Slightly Below Benchmark';
    return 'Significantly Below Benchmark';
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function showLoading() {
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
  }

  function showError(message) {
    loadingDiv.classList.add('hidden');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
  }

  function showResults() {
    loadingDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
  }
}); 