import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard';

function CodeBlock({ inline, className, children }) {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return !inline && match ? (
    <div className="relative bg-gray-800 rounded-md my-2 overflow-hidden overscroll-none">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-700 text-xs text-gray-300 font-mono">
        <span>{match[1] ? match[1].toUpperCase() : 'CODE'}</span>
        <CopyToClipboard text={codeContent} onCopy={handleCopy}>
          <button className="flex items-center px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-white transition-colors duration-200">
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </CopyToClipboard>
      </div>
      <SyntaxHighlighter
        style={coldarkDark}
        language={match[1] || null}
        PreTag="div"
        codeTagProps={{ style: { padding: '1rem', overflowX: 'auto', display: 'block' } }}
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className}>{children}</code>
  );
}

export default CodeBlock;
