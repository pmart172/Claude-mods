# claude-mods

Two mods for Claude Code.

- **prompt-check** – adds a **✨ Check prompt** button above the prompt box. Press it before sending and Claude reviews your draft (in the context of the conversation so far), lists up to four concrete suggestions, and offers a rewritten version you can drop into the prompt box with **Use improved version**. Nothing is sent until you send it.
- **usage-meter** – always shows how much of your 5-hour and weekly usage limits you have used, with a bar, a percentage and when each window resets. Green under 50%, yellow from 50%, red from 80%. Figures appear after the first reply of a session, and only on a subscription plan.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-check --marketplace pmart172/claude-mods
/plugin install usage-meter --marketplace pmart172/claude-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope loads them in every session).

From a shell:

```
claude plugin install prompt-check --marketplace pmart172/claude-mods
claude plugin install usage-meter --marketplace pmart172/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `pmart172/claude-mods`, then Add plugin.

This repository is private: installing needs read access to it on GitHub and a git credential for github.com on your machine (an SSH key, or `gh auth login` then `gh auth setup-git`).
