# Hexomind 🎮

A mesmerizing hexagonal puzzle game built for Reddit using Devvit, Phaser, and React. Place colorful hexagonal pieces on a honeycomb grid, clear lines, and compete for the highest score in this addictive brain-teaser.

![Hexomind Game](https://img.shields.io/badge/Reddit-Devvit-FF4500?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?style=flat-square)
![Phaser](https://img.shields.io/badge/Phaser-3.88.2-8BC34A?style=flat-square)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat-square)

## 🎯 Game Features

- **Hexagonal Grid Gameplay**: Strategic placement of hexagonal pieces on a honeycomb board
- **Line Clearing Mechanics**: Clear complete rows, columns, and diagonals for points
- **Combo System**: Chain multiple clears for bonus points and impressive combos
- **Multiple Leaderboards**: Compete globally, daily, weekly, or within your subreddit
- **Share & Rescue**: Share your game to get rescued when stuck (limited uses)
- **Glassmorphism UI**: Beautiful modern interface with smooth animations
- **Responsive Design**: Adapts perfectly to different screen sizes
- **Color Themes**: Dynamic color palettes fetched from Colormind API

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ installed on your machine
- A Reddit account for development
- Reddit Developer account (created during setup)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hexomind.git
cd hexomind

# Install dependencies
npm install

# Login to Reddit (first time only)
npm run login

# Start development server
npm run dev
```

## 📦 Project Structure

```
hexomind/
├── src/
│   ├── client/          # Frontend game code
│   │   ├── game/        # Phaser game engine
│   │   │   ├── core/    # Game logic and models
│   │   │   ├── presentation/ # Visual components
│   │   │   ├── scenes/  # Phaser scenes
│   │   │   └── config/  # Game configuration
│   │   ├── ui/          # React UI components
│   │   │   ├── components/ # UI panels and overlays
│   │   │   └── store/   # Zustand state management
│   │   └── services/    # API and data services
│   ├── server/          # Backend serverless functions
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core server logic
│   │   └── utils/       # Server utilities
│   └── shared/          # Shared types and constants
├── public/
│   └── assets/          # Game assets (SVGs, images)
├── dist/                # Build output
└── devvit.json         # Reddit Devvit configuration
```

## 🎮 How to Play

1. **Place Pieces**: Drag hexagonal pieces from the tray onto the board
2. **Strategic Placement**: Position pieces to complete lines in any direction
3. **Clear Lines**: Complete rows, columns, or diagonals to clear them and score points
4. **Combo Multiplier**: Clear multiple lines consecutively for bonus points
5. **Avoid Game Over**: The game ends when no pieces can be placed
6. **Share for Rescue**: When stuck, share the game to get a one-time board clear

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start all dev servers (client, server, devvit)
npm run dev:client       # Start client dev server only
npm run dev:server       # Start server dev server only
npm run dev:devvit       # Start devvit playtest only

# Build & Deploy
npm run build            # Build client and server
npm run deploy           # Build and upload to Reddit
npm run launch           # Build, deploy, and publish for review

# Code Quality
npm run check            # Run all checks (type, lint, format)
npm run type-check       # TypeScript type checking
npm run lint             # ESLint checking
npm run lint:fix         # ESLint with auto-fix
npm run prettier         # Format code with Prettier
npm run test             # Run tests with Vitest
```

## 🎨 Technical Stack

### Frontend
- **Phaser 3.88.2**: 2D game engine for the hexagonal puzzle mechanics
- **React 19**: UI overlay components and menus
- **Zustand**: State management for UI and game state
- **GSAP**: Smooth animations and transitions
- **Tailwind CSS 4**: Utility-first styling
- **Vite**: Fast build tool and dev server

### Backend
- **Express 5**: Serverless API endpoints
- **Redis**: Data persistence for scores and leaderboards
- **Devvit Web**: Reddit's developer platform integration

### Development
- **TypeScript 5.8**: Type safety across the entire codebase
- **ESLint & Prettier**: Code quality and formatting
- **Vitest**: Unit testing framework
- **Concurrently**: Parallel development servers

## 🏆 Features in Detail

### Leaderboard System
- **Global**: All-time high scores across all subreddits
- **Daily**: Resets every 24 hours for fresh competition
- **Weekly**: 7-day competition periods
- **Subreddit**: Compete within your community

### Score System
- Base points for placing pieces
- Line clear bonuses (100 points per line)
- Combo multipliers (2x, 3x, up to 5x)
- Multi-line clear bonuses
- Special pattern bonuses

### Game Mechanics
- **Piece Generation**: Intelligent algorithm ensures playable pieces
- **Validation System**: Real-time placement validation
- **Preview System**: Shows where pieces will be placed
- **Auto-save**: Progress saved automatically
- **Share Rescue**: Limited-use lifeline when stuck

## 🎯 Configuration

### Environment Variables
Create a `.env` file for local development:
```env
# Add any environment-specific variables here
```

### Game Configuration
Modify `src/client/game/config/` files to adjust:
- Grid size and layout
- Piece generation rules
- Score multipliers
- Visual themes
- Animation speeds

## 📊 API Endpoints

### Client → Server
- `GET /api/highscores` - Fetch user's high score
- `POST /api/highscores` - Submit new high score
- `GET /api/leaderboard/:period` - Get leaderboard data
- `POST /api/statistics` - Update game statistics
- `POST /api/share-rescue` - Process share rescue

### Reddit Integration
- Menu action: Create new game post
- Trigger: App installation handler
- Webview: Full-screen game interface

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- gridModel.test.ts
```

## 📝 License

This project is licensed under the BSD-3-Clause License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- WebSockets not supported in Devvit environment
- Limited to client-side rendering for real-time features
- Share rescue feature requires Reddit authentication

## 🚢 Deployment

1. **Build**: `npm run build` - Creates optimized production builds
2. **Deploy**: `npm run deploy` - Uploads to Reddit's servers
3. **Launch**: `npm run launch` - Submits for Reddit review
4. **Install**: Add the app to your subreddit from Reddit's app directory

## 📚 Resources

- [Reddit Devvit Documentation](https://developers.reddit.com/)
- [Phaser Documentation](https://phaser.io/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ✨ Credits

Built with ❤️ for the Reddit community using the Devvit platform.

Special thanks to:
- The Phaser team for their excellent game engine
- Reddit's Devvit team for the developer platform
- The open-source community for the amazing tools

---

**Play Hexomind now on Reddit!** 🎮🔷