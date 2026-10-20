"""
Script to extract the 200 Viva Questions and Answers from the markdown artifact
and export them into an Anki-compatible CSV and TSV file.
"""
import re
import csv
from pathlib import Path

SOURCE_FILE = Path(r"C:\Users\bobba\.gemini\antigravity\brain\1de4301c-8872-4455-a1f3-4cd160f61e52\viva_prep_and_project_explanation.md")
DEST_TSV = Path("LinkStream_Viva_Anki_Deck.txt")
DEST_CSV = Path("LinkStream_Viva_Anki_Deck.csv")

def categorize_question(q_num: int, q_text: str) -> str:
    q_lower = q_text.lower()
    if any(k in q_lower for k in ["kafka", "producer", "consumer", "topic", "partition", "dlq", "offset"]):
        return "LinkStream::Kafka-Pipeline"
    elif any(k in q_lower for k in ["redis", "cache", "stampede", "penetration", "avalanche", "ttl"]):
        return "LinkStream::Redis-Caching"
    elif any(k in q_lower for k in ["postgres", "index", "b-tree", "migration", "acid", "composite", "rollup", "retention"]):
        return "LinkStream::Postgres-Analytics"
    elif any(k in q_lower for k in ["rate limit", "sliding window", "security", "jwt", "csrf", "secret", "auth", "token"]):
        return "LinkStream::Security-RateLimiting"
    elif any(k in q_lower for k in ["base62", "short code", "alias", "redirect", "302", "301", "collision"]):
        return "LinkStream::Core-URL-Engine"
    elif any(k in q_lower for k in ["prometheus", "grafana", "metrics", "alert", "docker", "gunicorn", "deploy"]):
        return "LinkStream::Observability-DevOps"
    elif any(k in q_lower for k in ["latency", "qps", "throughput", "capacity", "scale", "concurrency", "p95", "p99"]):
        return "LinkStream::SystemDesign-Capacity"
    else:
        return "LinkStream::General-Viva"

def extract_qa_pairs():
    text = SOURCE_FILE.read_text(encoding="utf-8")
    
    pattern = re.compile(
        r"\*\*Q(\d+):\s*(.*?)\*\*\s*\n\s*\*\*Answer:\*\*\s*(.*?)(?=\n\s*\*\*Q\d+:|\Z)",
        re.DOTALL
    )
    
    pairs = []
    for match in pattern.finditer(text):
        q_num = int(match.group(1))
        question = match.group(2).strip()
        answer = match.group(3).strip()
        
        # Clean follow-up headers, horizontal rules, and extra spaces
        answer = re.sub(r"\n+---+\s*", "\n", answer)
        answer = re.sub(r"\*\*Follow-up Cross-Questioning.*?\*\*", "", answer, flags=re.IGNORECASE)
        answer = answer.strip()
        
        formatted_q = f"<b>Q{q_num}: {question}</b>"
        
        # Clean HTML conversion for Anki
        formatted_a = answer
        formatted_a = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", formatted_a)
        formatted_a = re.sub(r"`(.*?)`", r"<code>\1</code>", formatted_a)
        
        # Replace list markers cleanly
        formatted_a = re.sub(r"\n\s*[-*]\s+", "<br>&bull; ", formatted_a)
        formatted_a = re.sub(r"\n\s*(\d+)\.\s+", r"<br>\1. ", formatted_a)
        formatted_a = formatted_a.replace("\n\n", "<br><br>")
        formatted_a = formatted_a.replace("\n", "<br>")
        
        tag = categorize_question(q_num, question)
        pairs.append((q_num, formatted_q, formatted_a, tag))
        
    return pairs

def export_anki():
    pairs = extract_qa_pairs()
    print(f"Extracted {len(pairs)} questions.")
    
    # 1. Export TSV (Standard Anki format with header)
    with open(DEST_TSV, "w", encoding="utf-8", newline="") as f:
        f.write("#separator:tab\n")
        f.write("#html:true\n")
        f.write("#tags column:3\n")
        writer = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL)
        for _, q, a, tag in pairs:
            writer.writerow([q, a, tag])
            
    print(f"Saved Anki TSV deck to: {DEST_TSV.resolve()}")

    # 2. Export standard CSV
    with open(DEST_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Question", "Answer", "Tags"])
        for _, q, a, tag in pairs:
            writer.writerow([q, a, tag])
            
    print(f"Saved Anki CSV deck to: {DEST_CSV.resolve()}")

if __name__ == "__main__":
    export_anki()
