# Contributing to ETH Global

Thank you for your interest in contributing to ETH Global! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Prerequisites**
   - Node.js >= 18.0.0
   - PNPM >= 8.0.0
   - PostgreSQL (for database)
   - Foundry (optional, for contract testing)

2. **Clone and Install**
   ```bash
   git clone https://github.com/tboot-0510/eth-global.git
   cd eth-global
   pnpm install
   ```

3. **Environment Variables**
   ```bash
   # Copy example env files
   cp apps/web/.env.example apps/web/.env.local
   cp apps/facilitator/.env.example apps/facilitator/.env
   cp packages/database/.env.example packages/database/.env
   
   # Update with your values
   ```

## Project Structure

```
eth-global/
├── apps/
│   ├── web/              # Next.js frontend + API
│   └── facilitator/      # x402 payment server
├── packages/
│   ├── contracts/        # Smart contracts
│   └── database/         # Shared database schema
```

## Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following existing patterns
   - Add tests for new features
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   pnpm build    # Build all packages
   pnpm lint     # Run linters
   pnpm test     # Run tests
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Open a PR on GitHub
   - Describe your changes
   - Link related issues

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Prefer interfaces over types
- Use meaningful variable names

### React/Next.js
- Use functional components with hooks
- Prefer server components when possible
- Use Tailwind CSS for styling
- Follow Next.js App Router conventions

### Smart Contracts
- Follow Solidity best practices
- Use OpenZeppelin contracts
- Write comprehensive tests
- Document complex logic

### Testing
- Write tests for new features
- Maintain existing test coverage
- Use meaningful test descriptions
- Follow AAA pattern (Arrange, Act, Assert)

## Commit Message Format

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(web): add payment dashboard
fix(facilitator): handle ERC-6492 edge case
docs(readme): update installation instructions
```

## Code Review Process

1. All PRs require review before merging
2. Address reviewer feedback
3. Keep PRs focused and small
4. Update tests and docs

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues/discussions first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
