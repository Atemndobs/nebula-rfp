# MCP (Model Context Protocol) Setup Guide

## Overview

This project uses the Model Context Protocol to extend Claude Code's capabilities with external integrations. MCP servers provide additional tools and data sources while maintaining cost control and context efficiency.

## Currently Configured MCP Servers

### GitHub MCP Server ✅
**Purpose:** Streamline PR creation, code review, and issue management without leaving Claude Code.

**Capabilities:**
- Create pull requests with generated descriptions
- View and manage GitHub issues
- Check CI/CD status
- Review code and comments
- Search repositories

**Cost:** FREE (GitHub API is free for personal/team use)
**Context Impact:** Low (only loads data when explicitly invoked)

---

## Setup Instructions

### 1. Get GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `claude-code-mcp-token`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read organization data)
   - ✅ `workflow` (Update GitHub Actions workflows)
5. Click "Generate token"
6. **Copy the token** (you won't see it again)

### 2. Configure MCP Token

Open `.claude/mcp.json` and add your token:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

**Security Notes:**
- ⚠️ This file is in `.gitignore` - never commit tokens to Git
- 🔒 Use a project-specific token with minimal scopes
- 🔄 Rotate tokens periodically (every 90 days)
- 🗑️ Revoke tokens when no longer needed

### 3. Verify Setup

Restart Claude Code, then test:

```
User: "Show me recent GitHub issues in this repo"
```

If configured correctly, Claude will use the GitHub MCP to fetch issues.

---

## Cost & Context Management

### Token Usage Strategy

**✅ DO:**
- Use MCP for specific, targeted queries
- Let Claude decide when MCP is needed
- Cache results in Convex when appropriate
- Invoke during dedicated tasks (PR creation, issue review)

**❌ DON'T:**
- Load entire repositories into context
- Fetch all issues/PRs on every session start
- Use MCP for data that's already in local files
- Chain multiple MCP calls unnecessarily

### Expected Token Impact

| Activity | MCP Invocation | Token Cost | Mitigation |
|----------|----------------|------------|------------|
| Normal coding session | 0 calls | +0 tokens | No auto-loading |
| PR creation | 1-2 calls | +500-1000 tokens | Only when creating PR |
| Issue review | 1 call per issue | +200-500 tokens | Query specific issues only |
| Code search | 1-3 calls | +300-800 tokens | Use local Grep first |

**Average session impact:** +5-10% tokens (only when actively using GitHub features)

### Cost Breakdown

| MCP Server | API Calls/Month | Cost | Notes |
|------------|-----------------|------|-------|
| GitHub | Unlimited | $0 | Free for authenticated users |

**Total Monthly Cost:** $0

---

## Usage Patterns

### Pattern 1: Create PR with Context
```
User: /commit "Added eMMA connector"
Claude: [Creates commit, then uses GitHub MCP to create PR with description]
```

### Pattern 2: Review Code
```
User: "What's the status of PR #42?"
Claude: [Uses GitHub MCP to fetch PR details, CI status, reviews]
```

### Pattern 3: Issue Management
```
User: "Show me open issues labeled 'bug'"
Claude: [Queries GitHub MCP with filters]
```

### Pattern 4: Code Search
```
User: "Find where we use the statsAggregation pattern in other repos"
Claude: [Uses GitHub MCP to search across repositories]
```

---

## Future MCP Servers (Not Yet Configured)

### Puppeteer MCP (For eMMA Scraping)
**Status:** Planned for Phase 1 eMMA implementation
**Cost:** $0 (self-hosted)
**Setup:** Add when ready to implement eMMA connector

### Brave Search MCP (Enhanced Web Research)
**Status:** Optional enhancement
**Cost:** Free tier (2000 queries/month)
**Setup:** Only if WebSearch limitations become blocking

---

## Troubleshooting

### "MCP server not responding"
1. Check token is correctly set in `.claude/mcp.json`
2. Verify token has required scopes
3. Restart Claude Code
4. Check token hasn't expired

### "Rate limit exceeded"
- GitHub has generous rate limits (5000 requests/hour)
- If hit, wait 1 hour or use authenticated requests (should be automatic)

### "Permission denied"
- Verify token has `repo` scope
- Check you have access to the repository
- Ensure organization allows token access

---

## Security Best Practices

1. **Token Management**
   - Store tokens in `.claude/mcp.json` (gitignored)
   - Never commit tokens to version control
   - Use separate tokens for different projects
   - Revoke tokens when changing machines

2. **Scope Minimization**
   - Only grant required scopes
   - Prefer read-only access when possible
   - Review token permissions regularly

3. **Monitoring**
   - Check token usage on GitHub Settings
   - Review API calls if unexpected behavior
   - Rotate tokens every 90 days

---

## Support

**GitHub MCP Documentation:** https://github.com/modelcontextprotocol/servers/tree/main/src/github
**Claude Code MCP Guide:** https://docs.anthropic.com/claude/docs/model-context-protocol
**Project Issues:** Report in `.claude/skills/update-rules/SKILL.md` updates

---

*Last Updated: January 19, 2026*
