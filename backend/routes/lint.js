// Mock implementation of lint routes
export function setupLintRoutes(app) {
  // Lint a file or directory
  app.post("/api/lint", (req, res) => {
    const { filePath, content, rules = {} } = req.body;

    // Mock linting results
    const mockIssues = [
      {
        ruleId: "no-console",
        severity: 1,
        message: "Unexpected console statement",
        line: 5,
        column: 5,
        nodeType: "CallExpression",
        source: 'console.log("Hello");',
        fix: {
          range: [45, 65],
          text: "",
        },
      },
      {
        ruleId: "semi",
        severity: 2,
        message: "Missing semicolon",
        line: 10,
        column: 15,
        nodeType: "VariableDeclaration",
        source: "const x = 5",
        fix: {
          range: [85, 95],
          text: ";",
        },
      },
    ];

    res.json({
      status: "success",
      data: {
        filePath: filePath || "example.js",
        issues: mockIssues,
        errorCount: mockIssues.length,
        warningCount: 0,
        fixableErrorCount: mockIssues.length,
        fixableWarningCount: 0,
        usedDeprecatedRules: [],
      },
    });
  });

  // Get available linting rules
  app.get("/api/lint/rules", (req, res) => {
    res.json({
      status: "success",
      data: [
        {
          name: "no-console",
          description: "Disallow the use of console",
          category: "Possible Errors",
          recommended: true,
          fixable: true,
        },
        {
          name: "semi",
          description: "Require or disallow semicolons",
          category: "Stylistic Issues",
          recommended: true,
          fixable: true,
        },
        {
          name: "indent",
          description: "Enforce consistent indentation",
          category: "Stylistic Issues",
          recommended: true,
          fixable: true,
        },
      ],
    });
  });

  // Apply automatic fixes
  app.post("/api/lint/fix", (req, res) => {
    const { content, rules = {} } = req.body;

    // Mock fixed content
    const fixedContent = (content || "")
      .replace('console.log("Hello");', "")
      .replace("const x = 5", "const x = 5;");

    res.json({
      status: "success",
      data: {
        fixed: true,
        output: fixedContent,
        messages: [
          {
            ruleId: "no-console",
            severity: 1,
            message: "Unexpected console statement",
            fix: { range: [45, 65], text: "" },
            fixed: true,
          },
          {
            ruleId: "semi",
            severity: 2,
            message: "Missing semicolon",
            fix: { range: [85, 95], text: ";" },
            fixed: true,
          },
        ],
      },
    });
  });

  console.log("✅ Lint routes initialized");
}
