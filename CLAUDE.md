# Menos Ping - Development Workflow

## Project Overview

Menos Ping is a professional desktop application for gaming latency optimization, built with Electron, React, and TypeScript. It provides real-time network monitoring, system-level optimizations, and game-specific performance tuning.

## Technology Stack

- **Desktop Framework**: Electron
- **UI Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright
- **Code Quality**: ESLint + Prettier
- **Package Manager**: npm

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (starts Vite + Electron dev)
npm run dev

# Build for distribution
npm run build

# Run tests
npm run test

# Type checking
npm run type-check

# Linting & formatting
npm run lint
npm run format
```

## Project Structure

```
menos-ping/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── electron-main.ts  # Entry point
│   │   ├── preload.ts        # IPC bridge
│   │   └── Application.ts    # App orchestration
│   ├── renderer/             # React UI
│   │   ├── main.tsx          # React entry
│   │   └── styles.css        # Tailwind styles
│   ├── services/             # Core services
│   │   ├── NetworkMonitor.ts # Network monitoring
│   │   ├── GameDetector.ts   # Game detection
│   │   ├── OptimizationEngine.ts
│   │   ├── ConfigManager.ts
│   │   └── Logger.ts
│   ├── components/           # React components
│   ├── pages/                # React pages
│   ├── hooks/                # Custom hooks
│   ├── config/               # Configuration
│   ├── types/                # TypeScript types
│   ├── utils/                # Utilities
│   └── native/               # Native modules
├── index.html                # HTML entry
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # Tailwind config
├── .eslintrc.json            # ESLint config
├── .prettierrc.json          # Prettier config
└── package.json              # Dependencies

```

## Key Services

### NetworkMonitor
Monitors network conditions in real-time:
- Ping/latency measurement
- Jitter calculation
- Packet loss detection
- Connection quality scoring

### GameDetector
Detects running games and applies optimizations:
- Process monitoring
- Game profile matching
- Automatic optimization activation

### OptimizationEngine
Applies OS-level optimizations:
- TCP/UDP tuning
- DNS optimization
- Routing optimization
- Platform-specific implementations (Windows, Linux, macOS)

### ConfigManager
Handles persistent configuration:
- Profile management
- Game profile storage
- Settings persistence
- Auto-save functionality

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: camelCase for functions/variables, PascalCase for classes/components
- **Comments**: Minimal - only for non-obvious logic

### Type Safety

```bash
# Always run type checking before commit
npm run type-check
```

### Testing

```bash
# Run tests
npm run test

# Run with coverage
npm run test -- --coverage
```

### Linting & Formatting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Format code
npm run format
```

## Architecture Decisions

### Why Electron + React?
- Cross-platform (Windows, Linux, macOS)
- Modern UI with React
- Access to system APIs via Node.js
- Native performance with HTML5

### Why TypeScript?
- Type safety at compile time
- Better IDE support
- Self-documenting code
- Catch errors early

### Why Vite?
- Fast development server
- Quick builds
- Modern ES module support
- Great React plugin support

## Performance Targets

- **Memory**: < 100MB idle
- **CPU**: < 2% overhead
- **Latency Impact**: < 1ms
- **UI Refresh**: 60 FPS
- **Dashboard Refresh**: 1000ms

## Security Considerations

- Electron context isolation enabled
- IPC communication secured
- No node integration in renderer
- Signed updates only
- No sensitive data in logs

## Building & Distribution

```bash
# Build for development
npm run build

# Package for distribution
npm run pack    # Create package without installer
npm run dist    # Create installer for distribution

# Electron builder automatically creates:
# - Windows: NSIS installer + portable
# - macOS: DMG + zip
# - Linux: AppImage + deb
```

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add navigation in sidebar
3. Add route/navigation logic in main app

### Adding a New Service
1. Create service in `src/services/`
2. Initialize in Application class
3. Expose via getters
4. Create hooks if needed for React

### Adding a New Configuration Option
1. Update type in `src/types/index.ts`
2. Add to default config in `src/config/default.ts`
3. Update ConfigManager to handle it
4. Add UI in Settings page

### Platform-Specific Code
Create platform-specific implementations:
```typescript
if (process.platform === 'win32') {
  // Windows-specific code
} else if (process.platform === 'linux') {
  // Linux-specific code
} else if (process.platform === 'darwin') {
  // macOS-specific code
}
```

## Debugging

### Electron DevTools
The dev version automatically opens DevTools. For production builds, set:
```typescript
mainWindow.webContents.openDevTools()
```

### Logging
Use the Logger service:
```typescript
import { getLogger } from '@services/Logger'
const logger = getLogger('MyModule')
logger.info('Message', data)
```

## Contributing Guidelines

1. **Branch**: Create feature branches from `main`
2. **Commits**: Clear, descriptive messages
3. **Tests**: Add tests for new features
4. **Types**: Maintain strict type safety
5. **Performance**: Profile before optimizing
6. **Security**: Consider security implications

## Environment Variables

For development, create `.env.local`:
```
NODE_ENV=development
VITE_DEBUG=true
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Module Resolution Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Rebuild native modules: `npm rebuild`

### Electron Crashing
- Check console output in DevTools
- Enable logging in Application class
- Use logger.debug() for detailed tracing

## Performance Profiling

```bash
# Profile with Chrome DevTools
# In electron-main.ts, add:
mainWindow.webContents.openDevTools()
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build and test installers
5. Create git tag
6. Build and sign release
7. Upload to GitHub releases

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

## Contact & Support

For questions or issues, refer to:
- Project Repository
- Issues Tracker
- Community Forums

---

Last Updated: 2026-07-01
Version: 0.1.0
