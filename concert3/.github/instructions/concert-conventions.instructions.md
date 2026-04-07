# Concert Conventions

These conventions apply to all Concert 3 missions in this repository.

## Code Standards

- Write clean, readable code with meaningful names
- Follow the language-specific style guide for this project
- Prefer composition over inheritance
- Keep functions small and focused (single responsibility)

## Testing

- Write tests before implementation (TDD)
- Unit tests for business logic
- Integration tests for API endpoints and data flows
- Test error paths, not just happy paths
- Minimum 80% code coverage for new code

## Git Conventions

- Use conventional commits: `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep commits atomic — one logical change per commit
- Write descriptive commit messages

## Security

- Never commit secrets or credentials
- Validate all user inputs
- Use parameterized queries for database access
- Follow principle of least privilege
- Review dependencies for known vulnerabilities

## Documentation

- Document public APIs and interfaces
- Include JSDoc/TSDoc for exported functions
- Keep README up to date
- Document architectural decisions in ADRs when applicable
