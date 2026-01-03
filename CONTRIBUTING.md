# Contributing to BECMI D&D Virtual Tabletop

Thank you for your interest in contributing to the BECMI VTT project! We welcome contributions from the community.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug Reports**: Found a bug? Please open an issue!
- 💡 **Feature Suggestions**: Have an idea? Share it in an issue!
- 📝 **Code Contributions**: Fix bugs, add features, improve documentation
- 📚 **Documentation**: Improve existing docs or add new ones
- 🎨 **UI/UX Improvements**: Enhance the user interface and experience
- 🧪 **Testing**: Help test new features and report issues

## 📋 Contribution Guidelines

### Before You Start

1. **Check Existing Issues**: Look for existing issues or pull requests that might address your contribution
2. **Open an Issue First**: For major changes, please open an issue to discuss your idea
3. **Read the License**: Make sure you understand the [LICENSE](LICENSE) - especially the hosting restrictions

### Code Contributions

1. **Fork the Repository**: Create your own fork of the project
2. **Create a Branch**: Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Follow Code Standards**:
   - **JavaScript**: ES6+ modules, JSDoc comments
   - **PHP**: PSR-12 style, PHPDoc comments
   - **Stylus**: Follow existing modular architecture
   - **Database**: Use migrations for schema changes
4. **Write Clear Commit Messages**: Use descriptive commit messages
5. **Test Your Changes**: Test thoroughly before submitting
6. **Update Documentation**: Update relevant documentation if needed

### Pull Request Process

1. **Update Your Fork**: Make sure your fork is up to date with the main repository
2. **Create Pull Request**: Submit your PR with a clear description
3. **Link Issues**: Reference any related issues in your PR description
4. **Wait for Review**: The maintainer will review your contribution
5. **Make Changes if Requested**: Be open to feedback and suggestions

### Code Review

- All contributions will be reviewed by the project maintainer
- Feedback will be provided in a constructive manner
- Be patient - reviews may take some time
- Address review comments promptly

## 🎯 What We're Looking For

### High Priority
- Bug fixes
- Security improvements
- Performance optimizations
- Accessibility improvements
- Documentation improvements

### Medium Priority
- New features (discuss in issues first)
- UI/UX enhancements
- Code refactoring
- Test coverage improvements

### Low Priority
- Cosmetic changes
- Minor optimizations
- Style tweaks

## 📝 Coding Standards

### JavaScript
- Use ES6+ features
- Follow existing module structure
- Add JSDoc comments for functions
- Use meaningful variable names
- Handle errors gracefully

### PHP
- Follow PSR-12 coding standards
- Use prepared statements for all database queries
- Validate and sanitize all input
- Add PHPDoc comments
- Use type hints where possible

### Stylus/CSS
- Follow the modular architecture
- Use CSS variables from `_variables.styl`
- Use mixins from `_mixins.styl` when available
- Maintain consistent naming conventions

### Database
- Always use migrations for schema changes
- Follow existing migration naming: `###_description.sql`
- Test migrations on a copy of the database first
- Document any breaking changes

## 🚫 What NOT to Do

- **Don't host the application** without explicit permission (see LICENSE)
- **Don't remove license information**
- **Don't submit code that violates the license**
- **Don't submit incomplete work** - make sure it's functional
- **Don't ignore existing code style** - follow the project conventions

## 💬 Communication

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and general discussion
- **Pull Requests**: Use PR comments for code-specific discussions

## 🙏 Recognition

All contributors will be:
- ✅ Credited in the [CREDITS.md](CREDITS.md) file
- ✅ Mentioned in release notes (for significant contributions)
- ✅ Acknowledged in the project documentation

## ❓ Questions?

If you have questions about contributing:
1. Check existing issues and discussions
2. Open a new issue with the `question` label
3. Contact the maintainer through GitHub

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](LICENSE) for details.

---

**Thank you for contributing to BECMI VTT!** 🎲✨

