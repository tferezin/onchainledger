// OnChainLedger - Interactive Landing Page

const API_BASE = window.location.origin;

// DOM Elements
const tokenInput = document.getElementById('tokenInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const demoResult = document.getElementById('demoResult');
const demoError = document.getElementById('demoError');
const tokenChips = document.querySelectorAll('.token-chip');
const copyBtns = document.querySelectorAll('.copy-btn');

// Analyze Token - Uses FREE /score endpoint (teaser)
async function analyzeToken(tokenAddress) {
  // Show loading
  analyzeBtn.classList.add('loading');
  demoResult.classList.add('hidden');
  demoError.classList.add('hidden');

  try {
    // Use free /score endpoint (teaser mode)
    const response = await fetch(`${API_BASE}/score/${tokenAddress}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || data.error);
    }

    // Transform teaser response to display format
    showTeaserResult(data);

  } catch (error) {
    showError(error.message || 'Failed to analyze token');
  } finally {
    analyzeBtn.classList.remove('loading');
  }
}

// Show Teaser Result (from /score endpoint)
function showTeaserResult(data) {
  const { token, preview, teaser, upgrade } = data;

  // Token info
  document.getElementById('tokenSymbol').textContent = token?.symbol || 'Unknown';
  document.getElementById('tokenName').textContent = token?.name || 'Unknown Token';

  // Trust Score - TEASER MODE (hide exact score)
  const scoreEl = document.querySelector('.score-value');
  const gradeEl = document.getElementById('scoreGrade');

  scoreEl.textContent = '??'; // Hidden score
  gradeEl.textContent = preview?.grade || '-';

  // Remove old grade classes
  gradeEl.className = 'score-grade';

  // Add grade color class
  const grade = (preview?.grade || '').charAt(0).toUpperCase();
  if (grade === 'A') gradeEl.classList.add('grade-a');
  else if (grade === 'B') gradeEl.classList.add('grade-b');
  else if (grade === 'C') gradeEl.classList.add('grade-c');
  else gradeEl.classList.add('grade-d');

  // Verdict based on risk level
  const riskLevel = preview?.riskLevel || 'UNKNOWN';
  const verdict = riskLevel === 'LOW' ? 'APPEARS SAFE' :
                  riskLevel === 'MEDIUM' ? 'MODERATE RISK' :
                  riskLevel === 'HIGH' ? 'HIGH RISK' : 'CRITICAL RISK';
  document.getElementById('resultVerdict').textContent = verdict;

  // Breakdown - TEASER (show placeholder)
  const breakdownEl = document.getElementById('resultBreakdown');
  breakdownEl.innerHTML = '';

  const teaserItems = [
    { name: 'Grade', value: preview?.grade || '-' },
    { name: 'Risk Level', value: riskLevel },
    { name: 'Tradeable', value: preview?.tradeable ? 'Yes' : 'No' },
    { name: 'Flags', value: preview?.flagsDetected > 0 ? `${preview.flagsDetected} detected` : 'None' },
    { name: 'Score Range', value: teaser?.scoreRange || '??-??' }
  ];

  teaserItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'breakdown-item';
    div.innerHTML = `
      <div class="breakdown-name">${item.name}</div>
      <div class="breakdown-score">${item.value}</div>
    `;
    breakdownEl.appendChild(div);
  });

  // Teaser message and upgrade CTA
  const risksEl = document.getElementById('resultRisks');
  risksEl.innerHTML = '';

  // Add teaser message
  if (teaser?.message) {
    const div = document.createElement('div');
    div.className = 'risk-item';
    div.innerHTML = `<span>ℹ️</span> ${teaser.message}`;
    risksEl.appendChild(div);
  }

  // Add upgrade CTA
  const ctaDiv = document.createElement('div');
  ctaDiv.className = 'risk-item positive-item';
  ctaDiv.innerHTML = `<span>🔓</span> <strong>Unlock full analysis:</strong> ${teaser?.unlock || 'Get exact score and detailed breakdown'}`;
  risksEl.appendChild(ctaDiv);

  // Add price info
  const priceDiv = document.createElement('div');
  priceDiv.className = 'risk-item positive-item';
  priceDiv.innerHTML = `<span>💰</span> Price: <strong>${upgrade?.price || '$0.01'}</strong> via x402 micropayment`;
  risksEl.appendChild(priceDiv);

  demoResult.classList.remove('hidden');
}

// Show Full Result (from paid /analyze endpoint)
function showResult(data) {
  const { token, trustScore, breakdown, riskFactors, positiveFactors } = data;

  // Token info
  document.getElementById('tokenSymbol').textContent = token?.symbol || 'Unknown';
  document.getElementById('tokenName').textContent = token?.name || 'Unknown Token';

  // Trust Score
  const scoreEl = document.querySelector('.score-value');
  const gradeEl = document.getElementById('scoreGrade');

  scoreEl.textContent = trustScore?.score ?? '--';
  gradeEl.textContent = trustScore?.grade || '-';

  // Remove old grade classes
  gradeEl.className = 'score-grade';

  // Add grade color class
  const grade = (trustScore?.grade || '').charAt(0).toUpperCase();
  if (grade === 'A') gradeEl.classList.add('grade-a');
  else if (grade === 'B') gradeEl.classList.add('grade-b');
  else if (grade === 'C') gradeEl.classList.add('grade-c');
  else gradeEl.classList.add('grade-d');

  // Verdict
  document.getElementById('resultVerdict').textContent = trustScore?.verdict || '-';

  // Breakdown
  const breakdownEl = document.getElementById('resultBreakdown');
  breakdownEl.innerHTML = '';

  if (breakdown) {
    const analyzers = ['authority', 'holders', 'liquidity', 'honeypot', 'token2022', 'lpLock', 'insider', 'walletCluster', 'priceHistory', 'age'];

    analyzers.forEach(name => {
      const item = breakdown[name];
      if (item) {
        const div = document.createElement('div');
        div.className = 'breakdown-item';
        div.innerHTML = `
          <div class="breakdown-name">${formatName(name)}</div>
          <div class="breakdown-score" style="color: ${getScoreColor(item.score)}">${item.score}</div>
        `;
        breakdownEl.appendChild(div);
      }
    });
  }

  // Risks & Positives
  const risksEl = document.getElementById('resultRisks');
  risksEl.innerHTML = '';

  if (positiveFactors && positiveFactors.length > 0) {
    positiveFactors.forEach(factor => {
      const div = document.createElement('div');
      div.className = 'risk-item positive-item';
      div.innerHTML = `<span>✓</span> ${factor}`;
      risksEl.appendChild(div);
    });
  }

  if (riskFactors && riskFactors.length > 0) {
    riskFactors.forEach(risk => {
      const div = document.createElement('div');
      div.className = 'risk-item';
      div.innerHTML = `<span>!</span> ${risk}`;
      risksEl.appendChild(div);
    });
  }

  demoResult.classList.remove('hidden');
}

// Show Error
function showError(message) {
  demoError.querySelector('.error-text').textContent = message;
  demoError.classList.remove('hidden');
}

// Helper Functions
function formatName(name) {
  const names = {
    authority: 'Authority',
    holders: 'Holders',
    liquidity: 'Liquidity',
    honeypot: 'Honeypot',
    token2022: 'Token-2022',
    lpLock: 'LP Lock',
    insider: 'Insider',
    walletCluster: 'Clusters',
    priceHistory: 'Price',
    age: 'Age'
  };
  return names[name] || name;
}

function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

// Copy to Clipboard
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.color = '#10b981';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.color = '';
    }, 2000);
  });
}

// Event Listeners
analyzeBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (token) {
    analyzeToken(token);
  }
});

tokenInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const token = tokenInput.value.trim();
    if (token) {
      analyzeToken(token);
    }
  }
});

tokenChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const token = chip.dataset.token;
    tokenInput.value = token;
    analyzeToken(token);
  });
});

copyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.copy;
    let text = '';

    if (target === 'request') {
      text = document.getElementById('requestCode').textContent;
    } else if (target === 'response') {
      text = document.getElementById('responseCode').textContent;
    }

    copyToClipboard(text, btn);
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Initialize with animation
document.addEventListener('DOMContentLoaded', () => {
  // Add fade-in effect to sections
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
  });
});
