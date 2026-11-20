import axios from 'axios';

// Detect whether running on GitHub Pages (static hosting with no backend)
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── In-Browser Demo Store for GitHub Pages ──────────────────────────────────
const initDemoData = () => {
  if (!localStorage.getItem('demo_links')) {
    const initialLinks = [
      {
        id: 'link-demo-1',
        short_code: 'gh-repo',
        short_url: 'https://koushikbobba.github.io/scalable-url-shortener-analytics/#/gh-repo',
        original_url: 'https://github.com/koushikbobba/scalable-url-shortener-analytics',
        custom_alias: 'gh-repo',
        title: 'Project GitHub Repository',
        is_active: true,
        expires_at: null,
        click_count: 142,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'link-demo-2',
        short_code: 'docs-viva',
        short_url: 'https://koushikbobba.github.io/scalable-url-shortener-analytics/#/docs-viva',
        original_url: 'https://koushikbobba.github.io/scalable-url-shortener-analytics/viva.html',
        custom_alias: 'docs-viva',
        title: 'System Architecture & Viva Guide',
        is_active: true,
        expires_at: null,
        click_count: 89,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('demo_links', JSON.stringify(initialLinks));
  }
};

const handleMockRequest = (config) => {
  initDemoData();
  const { url, method, data } = config;
  const parsedData = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {});
  const cleanUrl = url.replace(/^\/api/, '');

  // 1. Auth: Register
  if (cleanUrl.includes('/auth/register/')) {
    const user = {
      id: 'demo-user-id',
      email: parsedData.email || 'user@linkstream.io',
      full_name: parsedData.full_name || parsedData.fullName || 'Koushik Bobba',
      fullName: parsedData.full_name || parsedData.fullName || 'Koushik Bobba',
      firstName: (parsedData.full_name || 'Koushik').split(' ')[0],
      lastName: (parsedData.full_name || 'Bobba').split(' ')[1] || '',
      is_active: true,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('demo_user', JSON.stringify(user));
    const token = 'demo_jwt_access_token_' + Date.now();
    return Promise.resolve({
      data: {
        access: token,
        refresh: 'demo_jwt_refresh_token',
        tokens: { access: token, refresh: 'demo_jwt_refresh_token' },
        user,
      },
      status: 201,
    });
  }

  // 2. Auth: Login
  if (cleanUrl.includes('/auth/login/')) {
    let user = JSON.parse(localStorage.getItem('demo_user') || 'null');
    if (!user) {
      user = {
        id: 'demo-user-id',
        email: parsedData.email || 'koushik@linkstream.io',
        full_name: 'Koushik Bobba',
        fullName: 'Koushik Bobba',
        firstName: 'Koushik',
        lastName: 'Bobba',
        is_active: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('demo_user', JSON.stringify(user));
    }
    const token = 'demo_jwt_access_token_' + Date.now();
    return Promise.resolve({
      data: {
        access: token,
        refresh: 'demo_jwt_refresh_token',
        tokens: { access: token, refresh: 'demo_jwt_refresh_token' },
        user,
      },
      status: 200,
    });
  }

  // 3. Auth: Profile (Me)
  if (cleanUrl.includes('/auth/me/')) {
    const user = JSON.parse(localStorage.getItem('demo_user') || 'null') || {
      id: 'demo-user-id',
      email: 'koushik@linkstream.io',
      full_name: 'Koushik Bobba',
      fullName: 'Koushik Bobba',
      firstName: 'Koushik',
      lastName: 'Bobba',
      is_active: true,
    };
    return Promise.resolve({ data: user, status: 200 });
  }

  // 4. Links: List
  if (cleanUrl === '/links/' && method.toLowerCase() === 'get') {
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    return Promise.resolve({
      data: { count: links.length, results: links },
      status: 200,
    });
  }

  // 5. Links: Create
  if (cleanUrl === '/links/' && method.toLowerCase() === 'post') {
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const shortCode = parsedData.custom_alias || Math.random().toString(36).substring(2, 8);
    const newLink = {
      id: 'link-' + Date.now(),
      short_code: shortCode,
      short_url: `${window.location.origin}${window.location.pathname}#/${shortCode}`,
      original_url: parsedData.original_url,
      custom_alias: parsedData.custom_alias || null,
      title: parsedData.title || null,
      is_active: true,
      expires_at: parsedData.expires_at || null,
      click_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    links.unshift(newLink);
    localStorage.setItem('demo_links', JSON.stringify(links));
    return Promise.resolve({ data: newLink, status: 201 });
  }

  // 5b. Links: Update (PATCH - Enable/Disable toggle)
  if (cleanUrl.startsWith('/links/') && method.toLowerCase() === 'patch') {
    const linkId = cleanUrl.replace('/links/', '').replace('/', '');
    let links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    let updatedLink = null;
    links = links.map((l) => {
      if (l.id === linkId) {
        updatedLink = {
          ...l,
          ...parsedData,
          is_active: parsedData.is_active !== undefined ? parsedData.is_active : l.is_active,
          updated_at: new Date().toISOString(),
        };
        return updatedLink;
      }
      return l;
    });
    localStorage.setItem('demo_links', JSON.stringify(links));
    return Promise.resolve({ data: updatedLink, status: 200 });
  }

  // 6. Links: Delete
  if (cleanUrl.startsWith('/links/') && method.toLowerCase() === 'delete') {
    const linkId = cleanUrl.replace('/links/', '').replace('/', '');
    let links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    links = links.filter((l) => l.id !== linkId);
    localStorage.setItem('demo_links', JSON.stringify(links));
    return Promise.resolve({ data: null, status: 204 });
  }

  // 7. Analytics: Overview
  if (cleanUrl.includes('/analytics/overview/')) {
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0);
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dates.push({ date: d, clicks: Math.floor(Math.random() * 25) + 5 });
    }
    return Promise.resolve({
      data: {
        total_links: links.length,
        active_links: links.filter((l) => l.is_active).length,
        total_clicks: totalClicks || 231,
        period_days: 7,
        time_series: dates,
        top_links: links.slice(0, 5).map((l) => ({
          link_id: l.id,
          short_code: l.short_code,
          original_url: l.original_url,
          clicks: l.click_count || 10,
        })),
      },
      status: 200,
    });
  }

  // 8. Analytics: Link Detail
  if (cleanUrl.includes('/analytics/')) {
    const linkId = cleanUrl.replace('/analytics/', '').replace('/', '');
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const targetLink = links.find((l) => l.id === linkId) || links[0] || {};
    const totalClicks = targetLink.click_count || 142;
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const dayClicks = Math.max(1, Math.round(totalClicks / 7 + (Math.random() * 4 - 2)));
      dates.push({
        date: d,
        timestamp: d,
        clicks: dayClicks,
        unique_visitors: Math.max(1, Math.round(dayClicks * 0.8)),
      });
    }
    return Promise.resolve({
      data: {
        short_code: targetLink.short_code || 'link',
        original_url: targetLink.original_url || 'https://example.com',
        link: targetLink,
        period_days: 7,
        total_clicks: totalClicks,
        unique_visitors: Math.max(1, Math.round(totalClicks * 0.82)),
        clicks_today: Math.round(totalClicks * 0.35),
        clicks_this_week: totalClicks,
        clicks_over_time: dates,
        time_series: dates,
        top_browsers: [
          { name: 'Chrome', label: 'Chrome', count: Math.round(totalClicks * 0.55), percentage: 55 },
          { name: 'Mobile Safari', label: 'Mobile Safari', count: Math.round(totalClicks * 0.25), percentage: 25 },
          { name: 'Firefox', label: 'Firefox', count: Math.round(totalClicks * 0.12), percentage: 12 },
          { name: 'Edge', label: 'Edge', count: Math.round(totalClicks * 0.08), percentage: 8 },
        ],
        top_devices: [
          { name: 'Desktop', label: 'Desktop', count: Math.round(totalClicks * 0.60), percentage: 60 },
          { name: 'Mobile', label: 'Mobile', count: Math.round(totalClicks * 0.35), percentage: 35 },
          { name: 'Tablet', label: 'Tablet', count: Math.round(totalClicks * 0.05), percentage: 5 },
        ],
        top_countries: [
          { name: 'United States', label: 'United States', count: Math.round(totalClicks * 0.45), percentage: 45 },
          { name: 'India', label: 'India', count: Math.round(totalClicks * 0.30), percentage: 30 },
          { name: 'United Kingdom', label: 'United Kingdom', count: Math.round(totalClicks * 0.15), percentage: 15 },
          { name: 'Germany', label: 'Germany', count: Math.round(totalClicks * 0.10), percentage: 10 },
        ],
        top_referrers: [
          { name: 'Direct / None', label: 'Direct / None', count: Math.round(totalClicks * 0.50), percentage: 50 },
          { name: 'Google Search', label: 'Google Search', count: Math.round(totalClicks * 0.30), percentage: 30 },
          { name: 'Twitter / X', label: 'Twitter / X', count: Math.round(totalClicks * 0.15), percentage: 15 },
          { name: 'LinkedIn', label: 'LinkedIn', count: Math.round(totalClicks * 0.05), percentage: 5 },
        ],
      },
      status: 200,
    });
  }

  return Promise.reject(new Error('Endpoint not implemented in mock mode'));
};

// Response interceptor with graceful GitHub Pages fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // If running on GitHub Pages OR server returned 405 (Static host limitation)
    if (isGitHubPages || error.response?.status === 405 || !error.response) {
      try {
        const mockRes = await handleMockRequest(config);
        return mockRes;
      } catch {
        // fall through to error rejection
      }
    }

    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/token/refresh/', { refresh: refreshToken });
          const newAccess = res.data.access;
          localStorage.setItem('access_token', newAccess);
          config.headers.Authorization = `Bearer ${newAccess}`;
          return api(config);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '#/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// If on GitHub Pages, use mock handler directly for zero network latency
if (isGitHubPages) {
  api.interceptors.request.use(async (config) => {
    // Return mock response as a canceled token with mock data
    config.adapter = async (cfg) => {
      const res = await handleMockRequest(cfg);
      return {
        data: res.data,
        status: res.status,
        statusText: 'OK',
        headers: {},
        config: cfg,
        request: {},
      };
    };
    return config;
  });
}

export default api;
