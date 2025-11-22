# Claude Code Guidelines

## Code Principles

### DRY (Don't Repeat Yourself)
Extract shared logic into reusable modules. Duplication leads to inconsistency and maintenance burden.

### Single Responsibility
Each module, function, or class should have one reason to change. Keep functions small and focused.

### Meaningful Names
Use intention-revealing names. Code should read like well-written prose. Avoid abbreviations unless universally understood.

### Fail Fast
Validate inputs early and throw descriptive errors. Don't let invalid state propagate through the system.

## Testing

### Arrange, Act, Assert
Structure tests clearly:
```typescript
// Arrange - set up test data
const input = createTestData();

// Act - execute the code under test
const result = await functionUnderTest(input);

// Assert - verify the outcome
expect(result).toEqual(expected);
```

### Test Behavior, Not Implementation
Tests should verify what code does, not how it does it. This allows refactoring without breaking tests.

### One Assertion Per Test (when possible)
Each test should verify one behavior. Multiple assertions often indicate multiple tests.

## Refactoring

### Extract Function
When code needs a comment to explain what it does, extract it into a well-named function.

### Replace Magic Numbers
Use named constants for values that have meaning beyond their literal value.

### Guard Clauses
Prefer early returns over nested conditionals:
```typescript
// Prefer this
if (!isValid) return;
doWork();

// Over this
if (isValid) {
  doWork();
}
```

## Error Handling

### Throw Specific Errors
Create descriptive error messages that help diagnose the problem:
```typescript
throw new Error(`Upload failed: file size ${size} exceeds maximum ${MAX_SIZE}`);
```

### Don't Swallow Errors
Either handle an error meaningfully or let it propagate. Silent failures are debugging nightmares.

## Commits

### Atomic Commits
Each commit should represent one logical change. If you need "and" in your commit message, consider splitting it.

### Conventional Commits
Use prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

### Short Messages
Keep commit messages concise. The diff tells the "what", the message should tell the "why".

## Code Review

### Address All Comments
Don't ignore reviewer feedback. Either implement the suggestion or explain why not.

### Small PRs
Smaller changes are easier to review and less likely to introduce bugs.
