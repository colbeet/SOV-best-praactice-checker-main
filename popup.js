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

  // Load saved API key and media ID if they exist
  chrome.storage.sync.get(['wistiaApiKey', 'wistiaMediaId'], function(result) {
    if (result.wistiaApiKey) {
      apiKeyInput.value = result.wistiaApiKey;
    }
    if (result.wistiaMediaId) {
      mediaIdInput.value = result.wistiaMediaId;
    }
  });

  // Save API key and media ID as they're typed
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

  function displayResults(videoData, stats) {
    const duration = videoData.duration;
    const benchmark = getBenchmark(duration);
    
    // Display video details
    videoDetailsDiv.innerHTML = `
      <h3>Video Details</h3>
      <p>Title: ${videoData.name}</p>
      <p>Duration: ${formatDuration(duration)}</p>
    `;

    // Calculate engagement metrics
    const engagement = calculateEngagement(stats);
    
    // Display engagement metrics
    engagementMetricsDiv.innerHTML = `
      <h3>Engagement Metrics</h3>
      <p>Average Engagement: ${(engagement * 100).toFixed(1)}%</p>
      <p>Total Views: ${stats.total_plays}</p>
    `;

    // Display benchmark comparison
    const comparison = compareToBenchmark(engagement, benchmark);
    benchmarkComparisonDiv.innerHTML = `
      <h3>Benchmark Comparison</h3>
      <p>Industry Benchmark: ${(benchmark * 100).toFixed(1)}%</p>
      <p>${comparison}</p>
    `;

    showResults();
  }

  function getBenchmark(duration) {
    // Wistia's engagement benchmarks by video length
    if (duration <= 60) return 0.50; // 50% for videos under 60 seconds
    if (duration <= 180) return 0.46; // 47% for videos 1-3 minutes
    if (duration <= 300) return 0.45; // 45% for videos 3-5 minutes
    if (duration <= 1800) return 0.38; // 38% for videos 5-30 minutes
    if (duration <= 3600) return 0.25; // 25% for videos 30-60 minutes
    return 0.17; // 17% for videos over 60 minutes
  }

  function calculateEngagement(stats) {
    // Use the engagement metric directly from the API response
    return stats.engagement || 0;
  }

  function compareToBenchmark(engagement, benchmark) {
    const difference = engagement - benchmark;
    const percentage = Math.abs(difference * 100).toFixed(1);

    if (difference > 0) {
      return `Your video is performing ${percentage}% above the industry benchmark!`;
    } else if (difference < 0) {
      return `Your video is performing ${percentage}% below the industry benchmark.`;
    } else {
      return 'Your video is performing exactly at the industry benchmark.';
    }
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