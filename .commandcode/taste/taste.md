# workflow
- Plan architecture fully before implementing any code. No code generation until the plan is reviewed and approved. Confidence: 0.90
- Use multiple specialized sub-agents working in parallel on separate Git branches, with the main agent and user serving as reviewers/integrators who merge branches. Confidence: 0.85
- Keep project plans in a local `.commandcode/plans/` directory, not in a global `~/.commandcode/plans/` directory. Confidence: 0.80
- Every role defined in the architecture plan must have a corresponding README document with ownership boundaries, tech stack, phase checklists, and sub-agent assignments. Confidence: 0.65

# branding
- No competitor-bashing in README or branding. Communicate what the product is, not what others aren't. Confidence: 0.85
- README tone should be direct, technical, and calm. No emojis. No superlatives. No marketing fluff. Confidence: 0.80

# design-philosophy
- Avoid: enterprise bloat, dashboard aesthetics, overengineered abstractions, feature creep, AI-first gimmicks, plugin-system obsession. Confidence: 0.90
- Optimize for: interaction quality, responsiveness, trustworthiness, consistency, and developer flow state. Confidence: 0.90
- The product should feel: fast, calm, precise, keyboard-first, trustworthy, modern, and opinionated. Confidence: 0.85
- Apply high-end, premium visual design — the $150k-agency aesthetic from high-end-visual-design and design-taste-frontend skills. The tool should look expensive and meticulously crafted, not merely functional or minimal. Confidence: 0.80

# design-anti-patterns
- Never use Inter font. It signals AI-generated design and lacks personality. Confidence: 0.70
- Never use purple glows, gradients, or generic sci-fi/cyberpunk aesthetics. They're hallmarks of AI-generated slop. Confidence: 0.70

# typescript
- No `any` types in the data pipeline. Every data type must be fully typed through the entire pipeline. Confidence: 0.70

# code-quality
- Every component must have complete state coverage: loading, empty, error, and edge cases. Confidence: 0.70

# workflow
- Do not make unsolicited visual design/style changes. Only fix crashes, bugs, and functional issues unless the user explicitly requests design work. Confidence: 0.65

# data-integrity
- Every mutation must be transactional — partial failures must roll back completely. Confidence: 0.70
