import React from "react";
import { Check, Copy, Download } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const extension = language === "javascript" ? "js" : 
                      language === "typescript" ? "ts" : 
                      language === "php" ? "php" : 
                      language === "sql" ? "sql" : 
                      language === "html" ? "html" : 
                      language === "css" ? "css" : "txt";
    
    const blob = new Blob([value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaslink-code-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group my-4 rounded-none overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl max-h-[600px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-10 shrink-0">
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
          {language || "code"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCode}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100 cursor-pointer"
            title="Download code"
          >
            <Download size={14} />
          </button>
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100 cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <SyntaxHighlighter
          language={language || "javascript"}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.875rem",
            lineHeight: "1.5",
            background: "transparent",
          }}
          codeTagProps={{
            style: {
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
