# RAG Customer Support Experiment

A comprehensive experiment for testing Retrieval-Augmented Generation (RAG) in customer support scenarios using local Ollama models and hybrid evaluation.

## 🎯 Overview

This experiment evaluates RAG performance for customer support by:
- **Retrieving relevant chunks** from a knowledge base using semantic search
- **Generating responses** using retrieved context with a local LLM
- **Evaluating results** with both concrete chunk matching and LLM-as-Judge

## 🏗️ Architecture

```
Customer Query → Embed → Search → Retrieve → Generate → Evaluate
     ↓            ↓        ↓         ↓         ↓         ↓
  "Password    Vector   Similarity  Chunks   Mistral   Hybrid
   reset?"   (nomic)    Search      1,2,3     22B      Judge
```

### Key Components

1. **Knowledge Base**: 18 customer support documents across 6 categories
2. **Embeddings**: Local Ollama `nomic-embed-text:latest` 
3. **LLM**: Local Ollama `mistral-small:22b-instruct-2409-q6_K`
4. **Evaluation**: Hybrid approach combining concrete chunk matching + LLM judge

## 📊 Test Scenarios

### Knowledge Base Categories
- **Password & Security** (3 chunks): Reset procedures, requirements, best practices
- **Billing & Payments** (3 chunks): Invoices, payment methods, refunds
- **Technical Support** (3 chunks): Installation, troubleshooting, system requirements
- **Account Management** (3 chunks): Settings, profile, privacy controls
- **Product Information** (3 chunks): Features, plans, API documentation
- **Contact & Support** (3 chunks): Contact info, hours, resources

### Test Cases (22 total)
- **Easy queries**: Direct questions matching single chunks
- **Medium queries**: Questions requiring multiple chunks
- **Hard queries**: Complex multi-category requests

## 🔬 Evaluation Methodology

### Hybrid Evaluation System

#### 1. Concrete Chunk Retrieval (40% weight)
- **Precision**: Correct chunks / Retrieved chunks
- **Recall**: Correct chunks / Expected chunks  
- **F1 Score**: Harmonic mean of precision and recall
- **Exact Match**: All expected chunks retrieved, no extras

#### 2. LLM Judge Response Quality (60% weight)
- **Accuracy**: Factual correctness based on reference docs
- **Helpfulness**: How well it addresses customer needs
- **Completeness**: Coverage of all query aspects
- **Clarity**: Readability and understanding
- **Groundedness**: Adherence to provided context

### Scoring
- **Combined Score**: `(Chunk F1 × 0.4) + (Response Quality × 0.6)`
- **Pass Threshold**: 0.7 combined score
- **Pass Rate**: Percentage of test cases passing

## 🚀 Usage

### Prerequisites
```bash
# Start Ollama server
ollama serve

# Pull required models
ollama pull nomic-embed-text:latest
ollama pull mistral-small:22b-instruct-2409-q6_K
```

### Running Experiments

#### Quick Test (5-10 minutes)
```bash
npm run cli
# Select "🧪 Run Interactive Test"
# Choose "RAG Customer Support Experiment"
# Select "Quick RAG Test"
```

#### Full Evaluation (15-25 minutes)
```bash
npm run cli
# Select "🧪 Run Interactive Test"
# Choose "RAG Customer Support Experiment"  
# Select "Comprehensive RAG Evaluation"
```

#### Analysis Mode (5-10 minutes)
```bash
npm run cli
# Select "🧪 Run Interactive Test"
# Choose "RAG Customer Support Experiment"
# Select "Retrieval Analysis"
```

### Direct Command Line
```bash
# Quick test
npx tsx experiments/rag-customer-support/RAGExperiment.ts quick

# Full evaluation  
npx tsx experiments/rag-customer-support/RAGExperiment.ts full

# Analysis only
npx tsx experiments/rag-customer-support/RAGExperiment.ts analyze
```

## 📈 Expected Results

### Typical Performance Metrics
- **Pass Rate**: 75-90% (depends on model and thresholds)
- **Chunk Retrieval F1**: 0.7-0.9 (semantic search quality)
- **Response Quality**: 0.8-0.9 (LLM judge scores)
- **Processing Time**: 2-5 seconds per query

### Output Files
```
outputs/rag-customer-support-[timestamp]/
├── evaluation-report.json      # Main results summary
├── detailed-results.json       # Full test case details
├── results-analysis.csv        # Data for analysis
└── experiment-report.md        # Human-readable report
```

## 🔍 Sample Test Cases

### Easy Query Example
```
Query: "How do I reset my password?"
Expected Chunks: [1, 2]
Retrieved: [1, 2] (Chunk F1: 1.0)
Response: "To reset your password: 1) Go to login page..."
LLM Judge: Accuracy: 0.95, Helpfulness: 0.90
Combined Score: 0.92 ✅ PASS
```

### Hard Query Example
```
Query: "I can't login and need to reset password but also have billing questions"
Expected Chunks: [1, 4, 16]
Retrieved: [1, 4, 5] (Chunk F1: 0.67)  
Response: "For login issues, reset your password by..."
LLM Judge: Completeness: 0.70, Accuracy: 0.85
Combined Score: 0.71 ✅ PASS
```

## 🎯 Key Features

### Concrete Chunk Testing
- **Deterministic evaluation** of retrieval accuracy
- **Exact expectations** for each query (e.g., "password reset" → chunks [1,2])
- **Precision/Recall metrics** for retrieval quality

### LLM-as-Judge Evaluation
- **Sophisticated response assessment** using Mistral 22B
- **Multi-criteria scoring** across 5 dimensions
- **Reference-based evaluation** using full ground truth documents

### Local-First Architecture
- **Privacy-preserving** - all processing happens locally
- **No API costs** - uses local Ollama models
- **Reproducible** - consistent local environment

### Comprehensive Analysis
- **Performance by category** (password, billing, technical, etc.)
- **Difficulty analysis** (easy, medium, hard queries)
- **Failure pattern identification** for optimization
- **Retrieval pattern analysis** for system tuning

## 🛠️ Configuration Options

### RAG Pipeline Settings
```typescript
{
  retrievalTopK: 3,           // Number of chunks to retrieve
  retrievalThreshold: 0.3,    // Minimum similarity threshold
  temperature: 0.1,           // LLM temperature for consistency
  maxResponseTokens: 500      // Response length limit
}
```

### Evaluation Criteria
```typescript
{
  chunkWeight: 0.4,           // Weight for chunk retrieval accuracy
  responseWeight: 0.6,        // Weight for LLM judge scores
  passingThreshold: 0.7,      // Minimum score to pass
  requireExactChunkMatch: false // Require exact chunk matching
}
```

## 📊 Interpreting Results

### Good Performance Indicators
- **Pass Rate > 80%**: System working well overall
- **Chunk F1 > 0.8**: Excellent retrieval accuracy
- **Response Quality > 0.8**: High-quality responses
- **Low failure variance**: Consistent across categories

### Areas for Improvement
- **Low recall**: Increase `retrievalTopK` or lower `retrievalThreshold`
- **Poor groundedness**: Improve context injection prompts
- **Category imbalance**: Add more examples for weak categories
- **Slow performance**: Optimize embedding generation or caching

## 🔧 Troubleshooting

### Common Issues

#### "Ollama server not available"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama server
ollama serve
```

#### "Model not found"
```bash
# Pull required models
ollama pull nomic-embed-text:latest
ollama pull mistral-small:22b-instruct-2409-q6_K
```

#### "Evaluation failed"
- Check model has sufficient memory (22B model needs ~16GB RAM)
- Verify Ollama server is responsive
- Try with smaller model like `llama3.1:8b`

## 🧪 Experiment Variations

### Custom Test Cases
Modify `KnowledgeBase.ts` to add your own:
- Knowledge chunks with specific IDs
- Test queries with expected chunk mappings
- Categories relevant to your domain

### Different Models
```bash
# Use different LLM models
npx tsx experiments/rag-customer-support/RAGExperiment.ts full --model=llama3.1:8b
```

### Evaluation Tuning
Adjust weights in `HybridEvaluator.ts`:
- Higher chunk weight for retrieval-focused evaluation
- Higher response weight for quality-focused evaluation

## 🎉 Success Metrics

A successful RAG implementation should achieve:
- ✅ **>75% pass rate** across all test cases
- ✅ **>0.8 chunk F1 score** for retrieval accuracy
- ✅ **>0.8 response quality** from LLM judge
- ✅ **Consistent performance** across categories
- ✅ **Sub-3 second** response times

## 📚 Further Reading

- [RAG Architecture Guide](../../ARCHITECTURE.md)
- [Embedding Provider Documentation](../../embeddings/README.md)
- [Evaluation Framework](../../core/README.md)
- [Ollama Integration](../../adapters/README.md)

---

*Built with the Synaptic Lab Kit - The AI-Powered Testing Framework*