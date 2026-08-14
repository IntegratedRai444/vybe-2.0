// Default project templates
export const defaultTemplates = {
  basic: {
    name: 'Basic Project',
    description: 'A basic project structure',
    files: [
      {
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="app.js"></script>
</body>
</html>`
      },
      {
        name: 'styles.css',
        content: '/* Your styles here */\nbody {\n  margin: 0;\n  font-family: Arial, sans-serif;\n  line-height: 1.6;\n}'
      },
      {
        name: 'app.js',
        content: '// Your JavaScript code here\nconsole.log(\'Hello, world!\');'
      }
    ]
  },
  react: {
    name: 'React Project',
    description: 'A basic React project structure',
    files: [
      {
        name: 'src/App.jsx',
        content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to My React App</h1>
    </div>
  );
}

export default App;`
      },
      {
        name: 'src/index.jsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      },
      {
        name: 'src/index.css',
        content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`
      }
    ]
  },
  // Add more templates as needed
};

export type ProjectTemplate = keyof typeof defaultTemplates;
