import * as React from "react";
import ReactMarkdown from "react-markdown";

export const Markdown: React.FunctionComponent<{
  children: string;
}> = ({ children }) => {
  return (
    <ReactMarkdown
      renderers={{
        link: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              if (href) {
                require("electron").shell.openExternal(href);
              }
            }}
          >
            {children}
          </a>
        )
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
