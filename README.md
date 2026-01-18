# RFP Discovery & Evaluation Tool

An AI-powered platform for discovering, filtering, and evaluating RFP (Request for Proposal) opportunities. Built for Nebula Logix to automate the pursuit decision process.

## Features

- **Multi-Source RFP Discovery** - Fetches RFPs from web and mobile development categories via FastAPI backend
- **6-Dimension Scoring Framework** - Evaluates RFPs against Technical Relevance, Scope Fit, Category Focus, Client Profile, Logistics, and Skill Alignment
- **Multi-Provider AI Analysis** - Supports Gemini, OpenAI, Anthropic, Groq, DeepSeek, Ollama, and LM Studio
- **Fit Analysis & Recommendations** - AI-generated recommendations with pursue/decline decisions
- **Configurable Criteria** - Admin panel for customizing keywords, categories, and AI settings
- **Export & Selection** - Bulk selection, CSV export, and shortlist management
- **Dark/Light Theme** - Full theme support with persistent preferences

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (Geist theme)
- **AI Integration**: Multi-provider support (7 AI providers)
- **Data Source**: FastAPI backend at `fastapi.curator.atemkeng.eu`
- **Deployment**: Docker with Nginx

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your API_KEY (Gemini API key)

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env.local` file with:

```env
API_KEY=your-gemini-api-key
```

Other AI providers can be configured via the Admin panel in the UI.

### Build for Production

```bash
npm run build
npm run preview
```

### Docker Deployment

```bash
docker-compose up --build
```

## Project Structure

```
rfp-discovery/
├── App.tsx                    # Main application component
├── types.ts                   # TypeScript interfaces and enums
├── constants.ts               # Evaluation criteria, AI configs
├── components/
│   ├── AdminView.tsx          # Settings and configuration
│   ├── FilterControls.tsx     # RFP filtering interface
│   ├── RfpCard.tsx            # Individual RFP display
│   ├── RawDataView.tsx        # Raw API data viewer
│   ├── SelectionControls.tsx  # Bulk selection actions
│   ├── Modal.tsx              # Reusable modal
│   ├── ThemeSwitcher.tsx      # Dark/light theme toggle
│   └── ViewSwitcher.tsx       # View navigation
├── services/
│   ├── rfpDataService.ts      # RFP fetching from FastAPI
│   ├── evaluationService.ts   # RFP evaluation logic
│   ├── fitAnalysisService.ts  # AI-powered fit analysis
│   ├── geminiService.ts       # Google Gemini integration
│   ├── openaiService.ts       # OpenAI integration
│   ├── deepseekService.ts     # DeepSeek integration
│   ├── ollamaService.ts       # Ollama (local) integration
│   ├── lmStudioService.ts     # LM Studio (local) integration
│   └── csvExportService.ts    # Export functionality
└── .claude/skills/            # Claude Code skills for development
```

## Evaluation Criteria

| Criterion | Description |
|-----------|-------------|
| Technical Relevance | Matches tech stack (React, AWS, serverless, TypeScript) |
| Scope Fit | Project type alignment (redesign, portal, cloud migration) |
| Category Focus | Preferred categories (web-design, software-dev, IT-services) |
| Client Profile | U.S. agencies, agile-friendly organizations |
| Logistics | Remote-friendly, sufficient deadline, clear SOW |
| Skill Alignment | Required roles match team composition |

## Documentation

For detailed documentation, see [GEMINI.md](./GEMINI.md) which includes:
- Architecture guidelines
- Implementation phases
- Coding standards
- Feature planning requirements

## License

Private - Nebula Logix