# Vybe AI Frontend Setup Guide

## Prerequisites

- Node.js v16 or later
- npm (comes with Node.js) or yarn
- Backend server (see backend documentation)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/vybe-ai.git
   cd vybe-ai/frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000/api/ws
   ```

## Development

1. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Environment Variables

| Variable       | Description     | Default                      |
| -------------- | --------------- | ---------------------------- |
| `VITE_API_URL` | Backend API URL | `http://localhost:8000`      |
| `VITE_WS_URL`  | WebSocket URL   | `ws://localhost:8000/api/ws` |

## Project Structure

```
frontend/
├── public/            # Static files
├── src/
│   ├── assets/        # Images, fonts, etc.
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API and service integrations
│   ├── store/         # State management
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── .env.local         # Local environment variables
├── package.json       # Dependencies and scripts
└── vite.config.ts     # Vite configuration
```

## Troubleshooting

1. **Connection Issues**

   - Ensure the backend server is running
   - Check that the API URL in `.env.local` matches your backend URL
   - Verify CORS settings on the backend

2. **Installation Issues**

   - Delete `node_modules` and `package-lock.json` then reinstall
   - Ensure you're using a compatible Node.js version

3. **Development Server**
   - If port 3000 is in use, Vite will automatically use the next available port
   - Check the console for specific error messages

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

[Your License Here]
