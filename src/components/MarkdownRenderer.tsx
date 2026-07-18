import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { formatJson } from "../lib/format";
import { useCurrentTheme } from "../hooks/useTheme";

function isPureJson(s: string): boolean {
  const t = s.trimStart();
  if (t[0] !== "{" && t[0] !== "[") return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

export function MarkdownRenderer({ content }: { content: string }) {
  const theme = useCurrentTheme();
  const syntaxTheme = theme === "light" ? oneLight : oneDark;

  if (isPureJson(content)) {
    return (
      <SyntaxHighlighter language="json" style={syntaxTheme} PreTag="div">
        {formatJson(content)}
      </SyntaxHighlighter>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className ?? "");
          const lang = match ? match[1] : "";
          const code = String(children).replace(/\n$/, "");
          if (lang) {
            return (
              <SyntaxHighlighter language={lang} style={syntaxTheme} PreTag="div">
                {code}
              </SyntaxHighlighter>
            );
          }
          return <code className={className}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
