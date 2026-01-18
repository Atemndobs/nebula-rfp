/**
 * Utility to export eligibility rules as Markdown
 *
 * Formats rules for human and AI agent review
 */

export interface ExportedRule {
  ruleId: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'hard' | 'soft';
  defaultOutcome: 'REJECTED' | 'PARTNER_REQUIRED' | 'FLAG';
  allowOverride: boolean;
  keywords: string[];
  keywordCount: number;
  isRegex: boolean;
  version: number;
  updatedAt: string | null;
}

export interface ExportedRulesData {
  exportedAt: string;
  rulesVersion: string;
  totalRules: number;
  evaluationStats: {
    total: number;
    eligible: number;
    partnerRequired: number;
    rejected: number;
  };
  organizationCapabilities: {
    hasUsEntity: boolean;
    certifications: {
      is8a: boolean;
      isSDVOSB: boolean;
      isHUBZone: boolean;
      isWOSB: boolean;
      isEDWOSB: boolean;
      isSmallBusiness: boolean;
    };
    canPartnerForSetAside: boolean;
    canPartnerForOnsite: boolean;
    canPartnerForUsOrg: boolean;
  };
  rules: ExportedRule[];
}

/**
 * Format rules as Markdown for human review
 */
export function formatRulesAsMarkdown(data: ExportedRulesData): string {
  const lines: string[] = [];

  // Header
  lines.push('# RFP Eligibility Rules Export');
  lines.push('');
  lines.push(`**Exported:** ${data.exportedAt}`);
  lines.push(`**Rules Version:** ${data.rulesVersion}`);
  lines.push(`**Total Rules:** ${data.totalRules}`);
  lines.push('');

  // Evaluation Statistics
  lines.push('## Evaluation Statistics');
  lines.push('');
  lines.push('| Status | Count | Percentage |');
  lines.push('|--------|-------|------------|');
  const total = data.evaluationStats.total || 1; // Avoid division by zero
  lines.push(`| Eligible | ${data.evaluationStats.eligible} | ${((data.evaluationStats.eligible / total) * 100).toFixed(1)}% |`);
  lines.push(`| Partner Required | ${data.evaluationStats.partnerRequired} | ${((data.evaluationStats.partnerRequired / total) * 100).toFixed(1)}% |`);
  lines.push(`| Rejected | ${data.evaluationStats.rejected} | ${((data.evaluationStats.rejected / total) * 100).toFixed(1)}% |`);
  lines.push(`| **Total** | **${data.evaluationStats.total}** | 100% |`);
  lines.push('');

  // Organization Capabilities
  lines.push('## Organization Capabilities');
  lines.push('');
  lines.push('### Entity Status');
  lines.push(`- **US Entity:** ${data.organizationCapabilities.hasUsEntity ? 'Yes' : 'No'}`);
  lines.push('');
  lines.push('### Certifications');
  const certs = data.organizationCapabilities.certifications;
  lines.push(`- 8(a): ${certs.is8a ? 'Yes' : 'No'}`);
  lines.push(`- SDVOSB: ${certs.isSDVOSB ? 'Yes' : 'No'}`);
  lines.push(`- HUBZone: ${certs.isHUBZone ? 'Yes' : 'No'}`);
  lines.push(`- WOSB: ${certs.isWOSB ? 'Yes' : 'No'}`);
  lines.push(`- EDWOSB: ${certs.isEDWOSB ? 'Yes' : 'No'}`);
  lines.push(`- Small Business: ${certs.isSmallBusiness ? 'Yes' : 'No'}`);
  lines.push('');
  lines.push('### Partnership Options');
  lines.push(`- Can partner for Set-Aside: ${data.organizationCapabilities.canPartnerForSetAside ? 'Yes' : 'No'}`);
  lines.push(`- Can partner for Onsite: ${data.organizationCapabilities.canPartnerForOnsite ? 'Yes' : 'No'}`);
  lines.push(`- Can partner for US Org: ${data.organizationCapabilities.canPartnerForUsOrg ? 'Yes' : 'No'}`);
  lines.push('');

  // Rules Summary Table
  lines.push('## Rules Summary');
  lines.push('');
  lines.push('| Rule | Enabled | Severity | Default Outcome | Keywords |');
  lines.push('|------|---------|----------|-----------------|----------|');
  for (const rule of data.rules) {
    const enabledIcon = rule.enabled ? 'Yes' : 'No';
    const severityIcon = rule.severity === 'hard' ? 'HARD' : 'soft';
    lines.push(`| ${rule.name} | ${enabledIcon} | ${severityIcon} | ${rule.defaultOutcome} | ${rule.keywordCount} |`);
  }
  lines.push('');

  // Detailed Rules
  lines.push('## Detailed Rules');
  lines.push('');

  for (const rule of data.rules) {
    lines.push(`### ${rule.name}`);
    lines.push('');
    lines.push(`**Rule ID:** \`${rule.ruleId}\``);
    lines.push('');
    lines.push(`**Description:** ${rule.description}`);
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Enabled | ${rule.enabled ? 'Yes' : 'No'} |`);
    lines.push(`| Severity | ${rule.severity.toUpperCase()} |`);
    lines.push(`| Default Outcome | ${rule.defaultOutcome} |`);
    lines.push(`| Allow Override | ${rule.allowOverride ? 'Yes' : 'No'} |`);
    lines.push(`| Uses Regex | ${rule.isRegex ? 'Yes' : 'No'} |`);
    lines.push(`| Version | ${rule.version} |`);
    if (rule.updatedAt) {
      lines.push(`| Last Updated | ${rule.updatedAt} |`);
    }
    lines.push('');

    if (rule.keywords.length > 0) {
      lines.push('**Keywords:**');
      lines.push('');
      lines.push('```');
      // Group keywords for readability
      const keywordsPerLine = 3;
      for (let i = 0; i < rule.keywords.length; i += keywordsPerLine) {
        const chunk = rule.keywords.slice(i, i + keywordsPerLine);
        lines.push(chunk.map(k => `"${k}"`).join(', '));
      }
      lines.push('```');
    } else {
      lines.push('**Keywords:** None (rule uses different logic)');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Footer for AI agents
  lines.push('## Review Instructions');
  lines.push('');
  lines.push('### For Human Reviewers');
  lines.push('1. Review each rule\'s keywords for completeness and accuracy');
  lines.push('2. Check if severity levels match business requirements');
  lines.push('3. Verify organization capabilities are up to date');
  lines.push('4. Consider if any new rules are needed based on recent RFP patterns');
  lines.push('');
  lines.push('### For AI Strategy Agents');
  lines.push('When analyzing these rules, consider:');
  lines.push('1. **Keyword Coverage:** Are there common RFP terms missing from the keyword lists?');
  lines.push('2. **False Positives:** Could any keywords incorrectly reject good opportunities?');
  lines.push('3. **False Negatives:** Are there patterns that should trigger rules but don\'t?');
  lines.push('4. **Severity Calibration:** Should any rules be upgraded/downgraded in severity?');
  lines.push('5. **New Rules:** Based on evaluation stats, are new eligibility rules needed?');
  lines.push('');
  lines.push('Provide recommendations in the following format:');
  lines.push('```');
  lines.push('RECOMMENDATION: [action type: ADD_KEYWORD | REMOVE_KEYWORD | CHANGE_SEVERITY | NEW_RULE | DISABLE_RULE]');
  lines.push('RULE: [rule_id]');
  lines.push('DETAILS: [specific recommendation]');
  lines.push('RATIONALE: [why this change improves eligibility filtering]');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format rules as JSON for programmatic use
 */
export function formatRulesAsJson(data: ExportedRulesData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Download content as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
