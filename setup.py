from setuptools import find_packages, setup

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="vybe-ai",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="AI-Powered Development Environment with Integrated MCP Debugging System",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/vybe-ai",
    packages=find_packages(where="backend"),
    package_dir={"": "backend"},
    python_requires=">=3.9",
    install_requires=[
        "fastapi>=0.85.0",
        "uvicorn>=0.19.0",
        "python-dotenv>=0.21.0",
        "aiohttp>=3.8.0",
        "pydantic>=1.10.0",
        "sqlalchemy>=1.4.0",
        "httpx>=0.23.0",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "numpy>=1.21.0",
        "pandas>=1.3.0",
        "tqdm>=4.62.0",
        "python-multipart>=0.0.5",
        "python-jose[cryptography]>=3.3.0",
        "python-multipart>=0.0.5",
        "python-dateutil>=2.8.2",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.20.0",
            "pytest-cov>=4.0.0",
            "black>=22.0.0",
            "isort>=5.10.0",
            "flake8>=4.0.0",
            "mypy>=0.910",
        ],
        "ai": [
            "openai>=0.27.0",
            "anthropic>=0.3.0",
            "tiktoken>=0.3.0",
            "faiss-cpu>=1.7.0",  # or faiss-gpu for GPU support
        ],
    },
    entry_points={
        "console_scripts": [
            "vybe=main:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
