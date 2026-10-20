"""
Builds an interactive, responsive offline HTML dashboard for the 200 Viva Questions.
Features:
- Search filter (real-time by question, answer, topic)
- Category filter pills
- Flip card flashcard mode + List view mode
- Bookmarking / Mastered progress tracking (saved in localStorage)
- Dark modern glassmorphism UI styled like LinkStream
"""
import json
import re
from pathlib import Path

SOURCE_FILE = Path(r"C:\Users\bobba\.gemini\antigravity\brain\1de4301c-8872-4455-a1f3-4cd160f61e52\viva_prep_and_project_explanation.md")
DEST_HTML = Path("viva_interview_dashboard.html")

def categorize_question(q_num: int, q_text: str) -> str:
    q_lower = q_text.lower()
    if any(k in q_lower for k in ["kafka", "producer", "consumer", "topic", "partition", "dlq", "offset"]):
        return "Kafka Pipeline"
    elif any(k in q_lower for k in ["redis", "cache", "stampede", "penetration", "avalanche", "ttl"]):
        return "Redis & Caching"
    elif any(k in q_lower for k in ["postgres", "index", "b-tree", "migration", "acid", "composite", "rollup", "retention"]):
        return "Database & Analytics"
    elif any(k in q_lower for k in ["rate limit", "sliding window", "security", "jwt", "csrf", "secret", "auth", "token"]):
        return "Security & Rate Limiting"
    elif any(k in q_lower for k in ["base62", "short code", "alias", "redirect", "302", "301", "collision"]):
        return "Core URL Engine"
    elif any(k in q_lower for k in ["prometheus", "grafana", "metrics", "alert", "docker", "gunicorn", "deploy"]):
        return "Monitoring & DevOps"
    elif any(k in q_lower for k in ["latency", "qps", "throughput", "capacity", "scale", "concurrency", "p95", "p99"]):
        return "System Design & Scale"
    else:
        return "General Architecture"

def build_data():
    text = SOURCE_FILE.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\*\*Q(\d+):\s*(.*?)\*\*\s*\n\s*\*\*Answer:\*\*\s*(.*?)(?=\n\s*\*\*Q\d+:|\Z)",
        re.DOTALL
    )
    items = []
    for match in pattern.finditer(text):
        q_num = int(match.group(1))
        question = match.group(2).strip()
        answer = match.group(3).strip()
        
        answer = re.sub(r"\n+---+\s*", "\n", answer)
        answer = re.sub(r"\*\*Follow-up Cross-Questioning.*?\*\*", "", answer, flags=re.IGNORECASE).strip()
        
        formatted_a = answer
        formatted_a = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", formatted_a)
        formatted_a = re.sub(r"`(.*?)`", r"<code>\1</code>", formatted_a)
        formatted_a = re.sub(r"\n\s*[-*]\s+", "<br>&bull; ", formatted_a)
        formatted_a = re.sub(r"\n\s*(\d+)\.\s+", r"<br>\1. ", formatted_a)
        formatted_a = formatted_a.replace("\n\n", "<br><br>")
        formatted_a = formatted_a.replace("\n", "<br>")
        
        category = categorize_question(q_num, question)
        items.append({
            "id": q_num,
            "question": question,
            "answer": formatted_a,
            "category": category
        })
    return items

def generate_html():
    items = build_data()
    items_json = json.dumps(items)
    categories = sorted(list(set(x["category"] for x in items)))
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkStream — 200 Viva & System Design Interview Master Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #090d16;
      --card-bg: rgba(18, 24, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.14);
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.25);
      --accent: #10b981;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --pill-bg: rgba(255, 255, 255, 0.05);
      --pill-border: rgba(255, 255, 255, 0.1);
      --code-bg: rgba(0, 0, 0, 0.4);
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.12), transparent 45%),
                  radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.08), transparent 45%),
                  var(--bg);
      background-attachment: fixed;
      color: var(--text);
      min-height: 100vh;
      padding-bottom: 80px;
    }}
    header {{
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(16px);
      background: rgba(9, 13, 22, 0.85);
      border-bottom: 1px solid var(--card-border);
      padding: 18px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .brand-logo {{
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      color: #fff;
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.4);
    }}
    .brand h1 {{
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }}
    .brand p {{
      font-size: 0.8rem;
      color: var(--text-muted);
    }}
    .stats-bar {{
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255, 255, 255, 0.04);
      padding: 8px 16px;
      border-radius: 100px;
      border: 1px solid var(--card-border);
      font-size: 0.85rem;
    }}
    .stat-badge {{
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .stat-badge strong {{
      color: #60a5fa;
    }}
    .container {{
      max-width: 1300px;
      margin: 0 auto;
      padding: 32px 24px;
    }}
    .controls {{
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 28px;
    }}
    .search-row {{
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .search-input-wrapper {{
      position: relative;
      flex: 1;
      min-width: 280px;
    }}
    .search-input-wrapper input {{
      width: 100%;
      background: rgba(18, 24, 38, 0.9);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 18px 14px 44px;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s ease;
    }}
    .search-input-wrapper input:focus {{
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }}
    .search-icon {{
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }}
    .view-toggle {{
      display: flex;
      background: rgba(18, 24, 38, 0.9);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 4px;
    }}
    .view-btn {{
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .view-btn.active {{
      background: #2563eb;
      color: #fff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }}
    .category-pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .pill {{
      background: var(--pill-bg);
      border: 1px solid var(--pill-border);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }}
    .pill:hover {{
      border-color: rgba(255, 255, 255, 0.25);
      color: #fff;
    }}
    .pill.active {{
      background: #3b82f6;
      border-color: #60a5fa;
      color: #fff;
      box-shadow: 0 2px 10px rgba(59, 130, 246, 0.3);
    }}
    
    /* List View Cards */
    .qa-grid {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }}
    .qa-card {{
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 22px 26px;
      transition: all 0.2s ease;
      position: relative;
    }}
    .qa-card:hover {{
      border-color: var(--card-hover);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }}
    .qa-card.mastered {{
      border-left: 4px solid var(--accent);
      background: rgba(16, 185, 129, 0.05);
    }}
    .card-top {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      gap: 12px;
    }}
    .card-badge {{
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .card-actions {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .action-btn {{
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }}
    .action-btn:hover {{
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }}
    .action-btn.active {{
      color: #10b981;
    }}
    .qa-question {{
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.45;
      color: #ffffff;
      margin-bottom: 14px;
    }}
    .qa-question .q-num {{
      color: #60a5fa;
      margin-right: 8px;
      font-weight: 700;
    }}
    .qa-answer {{
      font-size: 0.95rem;
      line-height: 1.65;
      color: #d1d5db;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }}
    .qa-answer code {{
      font-family: 'JetBrains Mono', monospace;
      background: var(--code-bg);
      color: #93c5fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88em;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }}
    .qa-answer strong {{
      color: #f9fafb;
    }}

    /* Flashcard Mode */
    .flashcard-container {{
      display: none;
      max-width: 800px;
      margin: 40px auto;
      text-align: center;
    }}
    .fc-card {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 48px 36px;
      min-height: 380px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: transform 0.3s ease, border-color 0.3s ease;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      position: relative;
    }}
    .fc-card:hover {{
      border-color: #3b82f6;
      transform: translateY(-2px);
    }}
    .fc-hint {{
      position: absolute;
      bottom: 20px;
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .fc-content {{
      font-size: 1.25rem;
      line-height: 1.6;
    }}
    .fc-nav {{
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
    }}
    .fc-btn {{
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .fc-btn:hover {{
      background: #2563eb;
      border-color: #3b82f6;
    }}
    .fc-counter {{
      font-size: 0.9rem;
      color: var(--text-muted);
      min-width: 90px;
    }}

    .empty-state {{
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }}
    .empty-state h3 {{
      font-size: 1.2rem;
      color: #fff;
      margin-bottom: 8px;
    }}

    @media (max-width: 768px) {{
      header {{ padding: 14px 18px; }}
      .container {{ padding: 20px 14px; }}
      .brand h1 {{ font-size: 1.05rem; }}
      .stats-bar {{ display: none; }}
      .qa-card {{ padding: 18px; }}
      .qa-question {{ font-size: 0.98rem; }}
    }}
  </style>
</head>
<body>

<header>
  <div class="brand">
    <div class="brand-logo">LS</div>
    <div>
      <h1>LinkStream Interview Viva Prep</h1>
      <p>Interactive Study Dashboard &amp; 200 Questions Master Hub</p>
    </div>
  </div>

  <div class="stats-bar">
    <div class="stat-badge">
      <span>Total Questions:</span>
      <strong id="stat-total">200</strong>
    </div>
    <div class="stat-badge">
      <span>Showing:</span>
      <strong id="stat-showing">200</strong>
    </div>
    <div class="stat-badge">
      <span>Mastered:</span>
      <strong id="stat-mastered" style="color: #34d399;">0</strong>
    </div>
  </div>
</header>

<div class="container">
  <div class="controls">
    <div class="search-row">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Search questions, keywords (e.g. 'Kafka', 'Redis', '302', 'Cache Stampede')...">
      </div>
      <div class="view-toggle">
        <button class="view-btn active" id="btn-list-view" onclick="setViewMode('list')">📋 List View</button>
        <button class="view-btn" id="btn-card-view" onclick="setViewMode('card')">🎴 Flashcard Mode</button>
      </div>
    </div>

    <div class="category-pills" id="category-pills">
      <button class="pill active" onclick="setCategory('all')">All (200)</button>
      {' '.join([f'<button class="pill" onclick="setCategory(\'{c}\')">{c}</button>' for c in categories])}
    </div>
  </div>

  <!-- List View -->
  <div class="qa-grid" id="qa-grid"></div>

  <!-- Flashcard Mode View -->
  <div class="flashcard-container" id="flashcard-container">
    <div class="fc-card" id="fc-card" onclick="flipCard()">
      <div class="card-badge" id="fc-badge" style="position: absolute; top: 20px; left: 24px;">Category</div>
      <div class="fc-content" id="fc-content">Question goes here</div>
      <div class="fc-hint" id="fc-hint">Click card to reveal answer</div>
    </div>
    <div class="fc-nav">
      <button class="fc-btn" onclick="prevCard()">← Previous</button>
      <span class="fc-counter" id="fc-counter">1 / 200</span>
      <button class="fc-btn" onclick="nextCard()">Next →</button>
    </div>
  </div>

  <div class="empty-state" id="empty-state" style="display: none;">
    <h3>No matching interview questions found</h3>
    <p>Try searching for a different keyword or resetting your category filter.</p>
  </div>
</div>

<script>
  const ALL_QUESTIONS = {items_json};
  let currentCategory = 'all';
  let searchQuery = '';
  let currentView = 'list';
  let filteredItems = [...ALL_QUESTIONS];
  let flashcardIndex = 0;
  let flashcardFlipped = false;
  
  // LocalStorage mastered set
  let masteredSet = new Set(JSON.parse(localStorage.getItem('linkstream_mastered_qa') || '[]'));

  function updateMasteredUI() {{
    document.getElementById('stat-mastered').textContent = `${{masteredSet.size}} / 200`;
  }}

  function toggleMastered(id, event) {{
    if (event) event.stopPropagation();
    if (masteredSet.has(id)) {{
      masteredSet.delete(id);
    }} else {{
      masteredSet.add(id);
    }}
    localStorage.setItem('linkstream_mastered_qa', JSON.stringify([...masteredSet]));
    updateMasteredUI();
    renderList();
  }}

  function filterData() {{
    filteredItems = ALL_QUESTIONS.filter(item => {{
      const matchesCategory = currentCategory === 'all' || item.category === currentCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (`q${{item.id}}`).includes(q);
      return matchesCategory && matchesSearch;
    }});

    document.getElementById('stat-showing').textContent = filteredItems.length;

    if (currentView === 'list') {{
      renderList();
    }} else {{
      flashcardIndex = 0;
      renderFlashcard();
    }}
  }}

  function renderList() {{
    const grid = document.getElementById('qa-grid');
    const empty = document.getElementById('empty-state');
    
    if (filteredItems.length === 0) {{
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }}
    empty.style.display = 'none';

    grid.innerHTML = filteredItems.map(item => {{
      const isMastered = masteredSet.has(item.id);
      return `
        <div class="qa-card ${{isMastered ? 'mastered' : ''}}" id="card-${{item.id}}">
          <div class="card-top">
            <span class="card-badge">${{item.category}}</span>
            <div class="card-actions">
              <button class="action-btn ${{isMastered ? 'active' : ''}}" 
                      title="${{isMastered ? 'Mark as reviewing' : 'Mark as mastered'}}" 
                      onclick="toggleMastered(${{item.id}}, event)">
                ${{isMastered ? '✓ Mastered' : '○ Master'}}
              </button>
            </div>
          </div>
          <div class="qa-question">
            <span class="q-num">Q${{item.id}}:</span>${{item.question}}
          </div>
          <div class="qa-answer">
            ${{item.answer}}
          </div>
        </div>
      `;
    }}).join('');
  }}

  function setCategory(cat) {{
    currentCategory = cat;
    document.querySelectorAll('.pill').forEach(btn => {{
      btn.classList.toggle('active', btn.textContent.startsWith(cat) || (cat === 'all' && btn.textContent.startsWith('All')));
    }});
    filterData();
  }}

  function setViewMode(mode) {{
    currentView = mode;
    document.getElementById('btn-list-view').classList.toggle('active', mode === 'list');
    document.getElementById('btn-card-view').classList.toggle('active', mode === 'card');

    if (mode === 'list') {{
      document.getElementById('qa-grid').style.display = 'grid';
      document.getElementById('flashcard-container').style.display = 'none';
      renderList();
    }} else {{
      document.getElementById('qa-grid').style.display = 'none';
      document.getElementById('flashcard-container').style.display = 'block';
      flashcardIndex = 0;
      renderFlashcard();
    }}
  }}

  function renderFlashcard() {{
    if (filteredItems.length === 0) {{
      document.getElementById('fc-content').innerHTML = "<em>No questions match this filter</em>";
      document.getElementById('fc-counter').textContent = "0 / 0";
      return;
    }}
    const item = filteredItems[flashcardIndex];
    document.getElementById('fc-badge').textContent = `${{item.category}} (Q${{item.id}})`;
    document.getElementById('fc-counter').textContent = `${{flashcardIndex + 1}} / ${{filteredItems.length}}`;
    
    flashcardFlipped = false;
    document.getElementById('fc-content').innerHTML = `<strong>${{item.question}}</strong>`;
    document.getElementById('fc-hint').textContent = "Click card or press Space to reveal answer";
    document.getElementById('fc-card').style.borderColor = "var(--card-border)";
  }}

  function flipCard() {{
    if (filteredItems.length === 0) return;
    const item = filteredItems[flashcardIndex];
    flashcardFlipped = !flashcardFlipped;
    if (flashcardFlipped) {{
      document.getElementById('fc-content').innerHTML = `<div style="text-align: left; font-size: 1.05rem;">${{item.answer}}</div>`;
      document.getElementById('fc-hint').textContent = "Click card to see question";
      document.getElementById('fc-card').style.borderColor = "#10b981";
    }} else {{
      document.getElementById('fc-content').innerHTML = `<strong>${{item.question}}</strong>`;
      document.getElementById('fc-hint').textContent = "Click card to reveal answer";
      document.getElementById('fc-card').style.borderColor = "var(--card-border)";
    }}
  }}

  function nextCard() {{
    if (flashcardIndex < filteredItems.length - 1) {{
      flashcardIndex++;
      renderFlashcard();
    }}
  }}

  function prevCard() {{
    if (flashcardIndex > 0) {{
      flashcardIndex--;
      renderFlashcard();
    }}
  }}

  // Keyboard navigation for flashcards
  document.addEventListener('keydown', (e) => {{
    if (currentView === 'card') {{
      if (e.code === 'Space') {{
        e.preventDefault();
        flipCard();
      }} else if (e.code === 'ArrowRight') {{
        nextCard();
      }} else if (e.code === 'ArrowLeft') {{
        prevCard();
      }}
    }}
  }});

  document.getElementById('search-input').addEventListener('input', (e) => {{
    searchQuery = e.target.value;
    filterData();
  }});

  // Initial load
  updateMasteredUI();
  filterData();
</script>

</body>
</html>
"""
    DEST_HTML.write_text(html_content, encoding="utf-8")
    print(f"Generated standalone Viva Dashboard at: {DEST_HTML.resolve()}")

if __name__ == "__main__":
    generate_html()
