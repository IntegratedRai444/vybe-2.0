# Contributing to Vybe AI

Thank you for your interest in contributing to Vybe AI! Here's how you can help:

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
   ```bash
   git clone https://github.com/yourusername/vybe-ai.git
   cd vybe-ai
   ```
3. **Set up** the development environment

   ```bash
   # Create and activate a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -e ".[dev,ai]"
   ```

4. **Configure** environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## Development Workflow

1. Create a new branch for your feature/fix
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run tests
   ```bash
   pytest tests/ -v
   ```
4. Ensure code quality
   ```bash
   black .
   isort .
   flake8
   mypy .
   ```
5. Commit your changes with a descriptive message
   ```bash
   git commit -m "feat: add new feature"
   ```
6. Push to your fork and open a Pull Request

## Code Style

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) for Python code
- Use type hints for all functions and methods
- Write docstrings for all public functions/classes/modules
- Keep commits atomic and focused
- Write tests for new features

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce the issue
- Expected vs. actual behavior
- Environment details (OS, Python version, etc.)

## License

By contributing to Vybe AI, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE) file.
