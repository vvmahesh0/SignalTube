import type { ReactNode } from "react";

type RichTextProps = {
  content: string;
  tone?: "article" | "support" | "summary";
};

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

export function RichText({ content, tone = "article" }: RichTextProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`rich-text rich-text-${tone}`}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <Heading key={`${block.type}-${index}`} level={block.level}>
                {renderInline(block.text)}
              </Heading>
            );
          case "blockquote":
            return (
              <blockquote key={`${block.type}-${index}`} className="rich-text-blockquote">
                {renderInline(block.text)}
              </blockquote>
            );
          case "unordered-list":
            return (
              <ul key={`${block.type}-${index}`} className="rich-text-list">
                {block.items.map((item, itemIndex) => (
                  <li key={`${index}-${itemIndex}`}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ordered-list":
            return (
              <ol key={`${block.type}-${index}`} className="rich-text-list rich-text-list-ordered">
                {block.items.map((item, itemIndex) => (
                  <li key={`${index}-${itemIndex}`}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={`${block.type}-${index}`} className="rich-text-paragraph">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}

function Heading({
  level,
  children
}: {
  level: 2 | 3 | 4;
  children: ReactNode;
}) {
  if (level === 2) {
    return <h2 className="rich-text-h2">{children}</h2>;
  }

  if (level === 3) {
    return <h3 className="rich-text-h3">{children}</h3>;
  }

  return <h4 className="rich-text-h4">{children}</h4>;
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphBuffer = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("#### ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 4, text: line.slice(5).trim() });
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "heading", level: 2, text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      const quoteLines = [line.slice(2).trim()];
      while (index + 1 < lines.length && lines[index + 1].trim().startsWith("> ")) {
        index += 1;
        quoteLines.push(lines[index].trim().slice(2).trim());
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      flushParagraph();
      const items = [line.replace(/^[-*•]\s+/, "").trim()];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const nextTrimmed = nextLine.trim();

        if (/^[-*•]\s+/.test(nextTrimmed)) {
          index += 1;
          items.push(nextTrimmed.replace(/^[-*•]\s+/, "").trim());
          continue;
        }

        if (nextTrimmed && /^\s{2,}\S/.test(nextLine)) {
          index += 1;
          items[items.length - 1] = `${items[items.length - 1]} ${nextTrimmed}`;
          continue;
        }

        break;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+[\.)]\s+/.test(line)) {
      flushParagraph();
      const items = [line.replace(/^\d+[\.)]\s+/, "").trim()];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const nextTrimmed = nextLine.trim();

        if (/^\d+[\.)]\s+/.test(nextTrimmed)) {
          index += 1;
          items.push(nextTrimmed.replace(/^\d+[\.)]\s+/, "").trim());
          continue;
        }

        if (nextTrimmed && /^\s{2,}\S/.test(nextLine)) {
          index += 1;
          items[items.length - 1] = `${items[items.length - 1]} ${nextTrimmed}`;
          continue;
        }

        break;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("***")) {
      nodes.push(
        <strong key={`${match.index}-bold-italic`}>
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={`${match.index}-bold`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${match.index}-italic`}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
