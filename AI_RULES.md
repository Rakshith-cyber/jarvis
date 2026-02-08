# 🤖 JARVIS AI - Development Rules

## 🛠 Tech Stack
- **Backend Framework**: [Hono](https://hono.dev/) (TypeScript) running on Cloudflare Workers.
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) for persistent storage.
- **Frontend**: React (Transitioning) with Tailwind CSS for styling.
- **Icons**: [Lucide React](https://lucide.dev/) (Preferred) and FontAwesome.
- **AI Models**: OpenAI (GPT-4o-mini) and Google Gemini (1.5 Flash).
- **Deployment**: Cloudflare Pages.
- **Voice**: Web Speech API (Recognition & Synthesis).

## 📏 Development Rules
1. **Component Architecture**: Always create small, focused components. New components must reside in `src/components/`.
2. **Styling**: Use Tailwind CSS utility classes exclusively. Avoid custom CSS unless for complex animations.
3. **State Management**: Use React hooks for local state. Use the backend API for persistent state.
4. **API Design**: All API routes must be prefixed with `/api/` and return JSON.
5. **Database**: All schema changes must be handled via SQL migrations in the `migrations/` folder.
6. **Icons**: Use Lucide React for all new UI elements.
7. **Error Handling**: Do not swallow errors. Let them bubble up to the UI to be displayed via Toasts.
8. **AI Providers**: Support multiple providers (OpenAI, Gemini). Always check for API key presence before calling.