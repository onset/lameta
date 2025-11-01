---
agent: agent
---

We are turning the information in src\export\ROCrate\feedback.md into linear tickets. They have already been processesed into report.md.

For each item in report.md we will create a linear ticket with the following properties:

- Title: Ro-crate #<problem-number> <short description>
- Label: ro-crate
- Description: use this template:
  `
  [<current model>] e.g. [ChatGPT-9] or [Claude 8.7]

# Original feedback

/_ copy from feedback.md _/

# Summary

/_ copy from report.md _/

# References

/_ Read " https://raw.githubusercontent.com/Language-Research-Technology/ldac-profile/refs/heads/master/profile/profile.md and https://www.researchobject.org/ro-crate/specification/1.2/structure. Add relevant rules here (converted to markdown as needed) for later reference, along with a markdown hyperlink to the source. _/

# Analysis

/_ think hard about this, get it right. Read the feedback and compare it to the references. If you think the feedback is in conflict, add a ⚠️ and say so. If you think it is not totall clear what we should do, add a ⚠️ and say so. label the ticket "needs-review" and assign it to me (hattonjohn). It is ok for us to say "we don't really know what to do here." _/

# Proposed changes/additions to test cases

/_ look at our unit tests (src\export\ROCrate\_\_tests\_\_) and find out why we missed this. Either we have a missing test or a wrong test.
If a current test case is wrong, say add a label to the ticket "incorrect-test". I will have to consider it. _/

# Proposed fix

/_ look at our ro-crate export code, which is src\export\ROCrate\*.ts. What changes do we need to make to fix this? Normally you don't want to write actual code here. _/

`

If there are any ⚠️ markers in the resulting ticket, assign the ticket to me (hattonjohn). Otherwise, leave unassigned.

Do One ticket at a time. Do not think about multiple tickets and then write them out. Use the linear mcp to create each ticket before moving to the next one.
