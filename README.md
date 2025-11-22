# Lens Llama

## Structure

- `apps/web`: Next.js 14 application with TypeScript, TailwindCSS, and Shadcn/ui.
- `apps/facilitator`: Placeholder for the facilitator service.
- `packages/contracts`: Hardhat project with Foundry plugin support.
- `packages/config`: Shared ESLint and Prettier configurations.
- `packages/database`: Shared database package.
- `packages/shared`: Shared utility package.

## Setup Details

### Tooling

- Package Manager: PNPM
- Monorepo Manager: Turborepo
- Linting/Formatting: ESLint + Prettier (shared config)

### Apps & Packages

- `apps/web`: Downgraded to Next.js 14.2.3 and Tailwind 3.4.3 to ensure stability and compatibility with standard Shadcn/ui setup.
- `packages/contracts`: Configured with Hardhat and Foundry support (foundry.toml created).

### Verification

The following commands have been verified to pass:

- `pnpm install`: Installs all dependencies.
- `pnpm build`: Builds all packages (Next.js app and Hardhat contracts).
- `pnpm lint`: Runs linting across the workspace.

### Usage

- `pnpm dev`: To start the development environment
- `pnpm build`: To build the project