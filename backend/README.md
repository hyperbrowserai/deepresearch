# Deep Research Agent

An intelligent research agent that conducts comprehensive research on any topic. The agent uses a combination of web search, content scraping, and AI-powered analysis to generate detailed research reports.

## Features

- 🤖 AI-powered research process
- 🔍 Intelligent web search and content scraping
- 📝 Automatic content summarization and relevance filtering
- 📊 Structured report generation with citations
- 🔄 Smart backtracking and error recovery
- 🎯 Topic refinement through clarifying questions

## Architecture

The agent consists of several specialized modules:

1. **Clarification Module**: Refines the research topic through targeted questions
2. **Search Module**: Performs web searches and content scraping
3. **Summarization Module**: Analyzes and filters content for relevance
4. **Brain Module**: Generates structured reports with insights
5. **Orchestrator**: Coordinates the entire research process

## Prerequisites

- Node.js 18+
- TypeScript
- OpenAI API key
- Hyperbrowser API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
   OPENAI_API_KEY=your_openai_key
   HYPERBROWSER_API_KEY=your_hyperbrowser_key
   ```

## Usage

Run the research agent with a topic:

```bash
npx tsx src/index.ts "Your research topic here"
```

Example:
```bash
npx tsx src/index.ts "The impact of artificial intelligence on healthcare in 2024"
```

## Output

The agent generates a comprehensive research report including:

- Introduction
- Multiple thematic sections
- Source citations
- Conclusion
- Metadata about sources used

## Development

The project uses TypeScript and follows a modular architecture. Key files:

- `src/index.ts`: Entry point
- `src/orchestrator.ts`: Main coordination logic
- `src/modules/`: Individual specialized modules
- `src/types.ts`: TypeScript type definitions

## License

MIT 