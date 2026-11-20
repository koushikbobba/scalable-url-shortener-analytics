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
  // Purge any legacy fake dummy links
  const existing = JSON.parse(localStorage.getItem('demo_links') || '[]');
  const cleaned = existing.filter((l) => l.id !== 'link-demo-1' && l.id !== 'link-demo-2');
  if (cleaned.length !== existing.length) {
    localStorage.setItem('demo_links', JSON.stringify(cleaned));
  }
};

const handleMockRequest = (config) => {
  initDemoData();
  const { url, method, data } = config;
  const parsedData = typeof data === 'string' ? JSON.parse(data || '{}') : (data || {});
  const cleanUrl = url.replace(/^\/api/, '');
  const urlPath = cleanUrl.split('?')[0];
  const queryStr = cleanUrl.includes('?') ? cleanUrl.split('?')[1] : '';
  const urlParams = new URLSearchParams(queryStr);

  // 1. Auth: Register
  if (urlPath.includes('/auth/register/')) {
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
  if (urlPath.includes('/auth/login/')) {
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
  if (urlPath.includes('/auth/me/')) {
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

  // 4. Links: List (Supports search, filter, sort)
  if (urlPath === '/links/' && method.toLowerCase() === 'get') {
    let links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const search = urlParams.get('search');
    const isActive = urlParams.get('is_active');
    const ordering = urlParams.get('ordering');

    if (search) {
      const q = search.toLowerCase();
      links = links.filter((l) =>
        (l.short_code && l.short_code.toLowerCase().includes(q)) ||
        (l.custom_alias && l.custom_alias.toLowerCase().includes(q)) ||
        (l.original_url && l.original_url.toLowerCase().includes(q)) ||
        (l.title && l.title.toLowerCase().includes(q))
      );
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      const activeBool = isActive === 'true';
      links = links.filter((l) => l.is_active === activeBool);
    }

    if (ordering === 'created_at') {
      links.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (ordering === '-click_count') {
      links.sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
    } else {
      links.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return Promise.resolve({
      data: { count: links.length, results: links },
      status: 200,
    });
  }

  // 4b. Links: Single Detail GET
  if (urlPath.startsWith('/links/') && method.toLowerCase() === 'get' && urlPath !== '/links/') {
    const linkId = urlPath.replace('/links/', '').replace(/\/$/, '');
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const link = links.find((l) => l.id === linkId || l.short_code === linkId || l.custom_alias === linkId);
    if (link) {
      return Promise.resolve({ data: link, status: 200 });
    }
  }

  // 5. Links: Create
  if (urlPath === '/links/' && method.toLowerCase() === 'post') {
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const shortCode = parsedData.custom_alias || Math.random().toString(36).substring(2, 8);
    const basePath = typeof window !== 'undefined' && window.location.pathname.endsWith('/') 
      ? window.location.pathname 
      : `${(typeof window !== 'undefined' ? window.location.pathname : '')}/`;
    const newLink = {
      id: 'link-' + Date.now(),
      short_code: shortCode,
      short_url: `${window.location.origin}${basePath}#/${shortCode}`,
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
  if (urlPath.startsWith('/links/') && method.toLowerCase() === 'patch') {
    const linkId = urlPath.replace('/links/', '').replace(/\/$/, '');
    let links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    let updatedLink = null;
    links = links.map((l) => {
      if (l.id === linkId || l.short_code === linkId) {
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
  if (urlPath.startsWith('/links/') && method.toLowerCase() === 'delete') {
    const linkId = urlPath.replace('/links/', '').replace(/\/$/, '');
    let links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    links = links.filter((l) => l.id !== linkId && l.short_code !== linkId);
    localStorage.setItem('demo_links', JSON.stringify(links));
    return Promise.resolve({ data: null, status: 204 });
  }

  // 7. Analytics: Overview
  if (urlPath.includes('/analytics/overview/')) {
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    const allEvents = JSON.parse(localStorage.getItem('demo_click_events') || '[]');
    const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0);
    
    const now = Date.now();
    const todayEvents = allEvents.filter((e) => now - new Date(e.timestamp).getTime() <= 24 * 3600 * 1000);
    const clicksToday = todayEvents.length > 0 ? todayEvents.length : totalClicks;
    const visitorSet = new Set(allEvents.map((e) => e.visitorId).filter(Boolean));
    const uniqueVisitors = totalClicks > 0 ? Math.max(1, visitorSet.size) : 0;

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const dayEvts = allEvents.filter((e) => e.timestamp && e.timestamp.slice(0, 10) === d);
      const dayUV = new Set(dayEvts.map((e) => e.visitorId).filter(Boolean)).size;
      dates.push({
        date: d,
        timestamp: d,
        clicks: dayEvts.length,
        unique_visitors: dayUV,
      });
    }

    // If there were recorded clicks but no individual day events, allocate to today
    const sumDayClicks = dates.reduce((s, d) => s + d.clicks, 0);
    if (totalClicks > sumDayClicks) {
      dates[dates.length - 1].clicks += (totalClicks - sumDayClicks);
      dates[dates.length - 1].unique_visitors = uniqueVisitors;
    }

    return Promise.resolve({
      data: {
        total_links: links.length,
        active_links: links.filter((l) => l.is_active).length,
        total_clicks: totalClicks,
        unique_visitors: uniqueVisitors,
        clicks_today: clicksToday,
        period_days: 7,
        time_series: dates,
        top_links: [...links]
          .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
          .slice(0, 5)
          .map((l) => ({
            link_id: l.id,
            short_code: l.short_code,
            original_url: l.original_url,
            clicks: l.click_count || 0,
          })),
      },
      status: 200,
    });
  }

  // 8. Analytics: Link Detail
  if (urlPath.includes('/analytics/')) {
    const linkId = urlPath.replace('/analytics/', '').replace(/\/$/, '');
    const links = JSON.parse(localStorage.getItem('demo_links') || '[]');
    let targetLink = links.find((l) => l.id === linkId || l.short_code === linkId || l.custom_alias === linkId);
    if (!targetLink && links.length > 0) {
      targetLink = links[0];
    }
    if (!targetLink) {
      targetLink = {
        id: linkId,
        short_code: linkId,
        original_url: '',
        click_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }

    let allEvents = JSON.parse(localStorage.getItem('demo_click_events') || '[]');
    let linkEvents = allEvents.filter((e) => e.linkId === targetLink.id || e.shortCode === targetLink.short_code);

    let totalClicks = Math.max(targetLink.click_count || 0, linkEvents.length);
    targetLink.click_count = totalClicks;

    // KEY FIX: If totalClicks > linkEvents.length, backfill all missing events so breakdown counts MATCH totalClicks!
    if (totalClicks > linkEvents.length) {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      let browser = 'Chrome';
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edg')) browser = 'Edge';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

      let device = 'Desktop';
      if (/mobile|android|iphone/i.test(ua)) device = 'Mobile';
      else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

      const visitorId = localStorage.getItem('ls_visitor_id') || 'vis_owner';
      const missingCount = totalClicks - linkEvents.length;
      for (let k = 0; k < missingCount; k++) {
        const backfilledEvent = {
          linkId: targetLink.id,
          shortCode: targetLink.short_code,
          timestamp: targetLink.created_at || new Date().toISOString(),
          browser,
          device,
          country: 'India',
          referrer: 'Direct / None',
          visitorId,
        };
        linkEvents.push(backfilledEvent);
        allEvents.push(backfilledEvent);
      }
      localStorage.setItem('demo_click_events', JSON.stringify(allEvents));
    }

    const visitorSet = new Set(linkEvents.map((e) => e.visitorId).filter(Boolean));
    const uniqueVisitors = totalClicks > 0 ? Math.max(1, visitorSet.size) : 0;

    const now = Date.now();
    const todayEvents = linkEvents.filter((e) => now - new Date(e.timestamp).getTime() <= 24 * 3600 * 1000);
    const clicksToday = todayEvents.length > 0 ? todayEvents.length : totalClicks;

    const weekEvents = linkEvents.filter((e) => now - new Date(e.timestamp).getTime() <= 7 * 24 * 3600 * 1000);
    const clicksThisWeek = weekEvents.length > 0 ? weekEvents.length : totalClicks;

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const dayEvts = linkEvents.filter((e) => e.timestamp && e.timestamp.slice(0, 10) === d);
      const dayUV = new Set(dayEvts.map((e) => e.visitorId).filter(Boolean)).size;
      dates.push({
        date: d,
        timestamp: d,
        clicks: dayEvts.length,
        unique_visitors: dayUV,
      });
    }

    const sumDayClicks = dates.reduce((s, d) => s + d.clicks, 0);
    if (totalClicks > sumDayClicks) {
      dates[dates.length - 1].clicks += (totalClicks - sumDayClicks);
      dates[dates.length - 1].unique_visitors = uniqueVisitors;
    }

    const computeDimension = (field) => {
      if (linkEvents.length === 0) return [];
      const counts = {};
      linkEvents.forEach((e) => {
        const val = e[field] || 'Unknown';
        counts[val] = (counts[val] || 0) + 1;
      });
      const total = linkEvents.length;
      return Object.entries(counts)
        .map(([name, count]) => ({
          name,
          label: name,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    };

    return Promise.resolve({
      data: {
        short_code: targetLink.short_code || 'link',
        original_url: targetLink.original_url || '',
        link: targetLink,
        period_days: 7,
        total_clicks: totalClicks,
        unique_visitors: uniqueVisitors,
        clicks_today: clicksToday,
        clicks_this_week: clicksThisWeek,
        clicks_over_time: dates,
        time_series: dates,
        top_browsers: computeDimension('browser'),
        top_devices: computeDimension('device'),
        top_countries: computeDimension('country'),
        top_referrers: computeDimension('referrer'),
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
