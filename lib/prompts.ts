export const FEEDBACK_ANALYSIS_PROMPT = (projectContext: string, feedbackText: string, hasMedia: boolean) => `
You are an expert product manager analyzing user feedback for a project. Your goal is to evaluate the quality and utility of the feedback based on specific criteria.

<project_context>
${projectContext}
</project_context>

<user_feedback>
${feedbackText}
</user_feedback>

<metadata>
Has Media/Attachments: ${hasMedia}
</metadata>

<instructions>
**CRITICAL FIRST STEP: Check if the feedback is actually related to the project.**

Before evaluating any other criteria, determine if the feedback is relevant to the project described in the project_context. Consider:
- Does the feedback discuss the project's features, goals, or implementation?
- Does it address the project's purpose or domain?
- Is it responding to the project's content or asking questions about it?
- Or is it completely unrelated (e.g., spam, off-topic discussion, random messages)?

**IF THE FEEDBACK IS NOT RELATED TO THE PROJECT:**
- Set ALL scores (relevance, depth, evidence, constructiveness, tone) to very low values (1-2)
- Relevance MUST be 1 if the feedback is completely unrelated
- Other scores should also be 1-2 to reflect that the feedback is not useful for this project
- Still provide a brief summary

**IF THE FEEDBACK IS RELATED TO THE PROJECT:**
Evaluate the feedback based on the following criteria. Assign a score from 1 to 10 for each.

1.  **Relevance**: How closely does it align with the project's context and goals? (This should be high if related, low if not)
2.  **Depth**: Does it provide actionable details, specific examples, or deep insights? (vs. surface-level comments)
3.  **Evidence**: Does it include supporting evidence like screenshots, documents, or references? (If 'Has Media/Attachments' is true, this score should generally be higher).
4.  **Constructiveness**: Does it offer constructive suggestions or solutions? (vs. pure praise or vague criticism)
5.  **Tone**: Is the writing clear, concise, and professional?

Additionally, provide a very brief, one-sentence summary of the feedback.
</instructions>

<output_format>
Return the result as a valid JSON object with the following structure. Do not include markdown formatting (like \`\`\`json).

{
  "relevance": number,
  "depth": number,
  "evidence": number,
  "constructiveness": number,
  "tone": number,
  "summary": "string"
}
</output_format>
`;

export const FEEDBACK_SUMMARY_PROMPT = (feedbackItems: Array<{ content: string; hasMedia: boolean }>) => `
<feedback_items>
${feedbackItems.map((item, index) => `
Feedback ${index + 1}:
${item.content}
${item.hasMedia ? '[Includes media/attachments]' : ''}
`).join('\n---\n')}
</feedback_items>

<instructions>
Analyze all the feedback items above and create a concise 50-word summary. Focus only on the key points and common themes from the feedback. Do not include any other information.
</instructions>

<output_format>
Return only the summary text. No JSON, no markdown, just the plain text summary (exactly 50 words).
</output_format>
`;
