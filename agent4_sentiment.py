"""
VaultMind 2.0 - agent4_sentiment.py
===================================================================
Agent 4: SentimentWatch - NLP Text Analyzer (Cloud LLM + Circuit Breaker)
Analyzes unstructured transaction text using Google Gemini.
Falls back to high-speed local Regex matching if the API is offline.
===================================================================
"""

import os
import re
import warnings

# We use google.generativeai for the Gemini API
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    warnings.warn("google.generativeai not installed. Defaulting to local fallback.")

class SentimentWatch:
    def __init__(self):
        # Local Circuit Breaker Config
        self.fallback_keywords = [
            r"\bstolen\b", r"\bbribe\b", r"\bhacked\b", 
            r"\bextortion\b", r"\bunauthorized\b", r"\billegal\b", r"\bthreat\b"
        ]
        
        # Initialize Gemini API if available and key is set
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.use_llm = HAS_GENAI and bool(self.api_key)
        
        if self.use_llm:
            genai.configure(api_key=self.api_key)
            # gemini-1.5-flash is ideal for fast text classification
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            
    def analyze_text(self, text: str) -> tuple:
        """
        Analyzes the text for fraud risk.
        Returns a tuple: (score (int), source (str))
        """
        # Ensure we ONLY process text. Data Privacy Guard active.
        # No Employee IDs or Transaction Amounts are passed.
        if not text or not isinstance(text, str) or text.strip() == "":
            return (0, "NO_TEXT")
            
        clean_text = text.strip()

        # ── PLAN A: Cloud LLM Mode ──
        if self.use_llm:
            prompt = (
                "Act as a Banking Fraud Control Unit (FCU) analyst. "
                "Analyze the following text associated with a transaction. "
                "Look for signs of insider fraud, privilege abuse, extortion, or unauthorized access. "
                "Return ONLY an integer score between 0 and 100 representing the risk severity. "
                f"Text: {clean_text}"
            )
            try:
                # Execute API Call with strict timeout to prevent bottlenecking
                response = self.model.generate_content(
                    prompt, 
                    request_options={"timeout": 5.0} # Strict 5-second timeout limit
                )
                
                # Parse integer from response
                score_str = response.text.strip()
                # Extract first integer found using regex 
                match = re.search(r'\d+', score_str)
                if match:
                    score = int(match.group())
                    score = max(0, min(100, score)) # Clamp between 0 and 100
                    return (score, "LLM_ANALYSIS")
                else:
                    raise ValueError("No integer score found in LLM response.")
                    
            except Exception as e:
                # Catch timeout, quota limits, parsing errors, or network issues
                print(f"[WARNING] Agent 4 LLM API Offline or Failed ({type(e).__name__}). Engaging Local Regex Fallback...")
                # Fall through to PLAN B

        # ── PLAN B: Circuit Breaker / Local Regex Fallback ──
        text_lower = clean_text.lower()
        for pattern in self.fallback_keywords:
            if re.search(pattern, text_lower):
                return (80, "LOCAL_REGEX_FALLBACK")
                
        return (0, "LOCAL_REGEX_FALLBACK")

# ==========================================================================
# TEST HARNESS
# ==========================================================================
if __name__ == "__main__":
    print("="*60)
    print("VaultMind 2.0 - Agent 4 (SentimentWatch) Initialized")
    print("="*60)
    
    agent = SentimentWatch()
    
    test_cases = [
        "Routine internal ledger balancing.",
        "Customer reported unauthorized debit and extortion threat.",
        "System maintenance window approved by manager."
    ]
    
    for i, text in enumerate(test_cases, 1):
        print(f"\n[Test Case {i}]")
        print(f"Text  : \"{text}\"")
        score, source = agent.analyze_text(text)
        print(f"Score : {score}/100")
        print(f"Source: {source}")
