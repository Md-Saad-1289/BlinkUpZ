import React from 'react';

const INLINE_PATTERNS = [
  {
    type: 'code',
    regex: /`([^`]+)`/
  },
  {
    type: 'bold',
    regex: /\*\*(.+?)\*\*/
  },
  {
    type: 'underline',
    regex: /__(.+?)__/
  },
  {
    type: 'strikethrough',
    regex: /~~(.+?)~~/
  },
  {
    type: 'italic',
    regex: /\*([^*]+)\*/
  },
  {
    type: 'italic',
    regex: /_([^_]+)_/
  },
  {
    type: 'link',
    regex: /#\((https?:\/\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/
  },
  {
    type: 'mention',
    regex: /@@?[a-zA-Z0-9_]+|@everyone/
  }
];

const findNextInlineMatch = (text) => {
  let earliest = null;

  for (const pattern of INLINE_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, '');
    const match = regex.exec(text);
    if (!match) continue;

    if (!earliest || match.index < earliest.index || (match.index === earliest.index && INLINE_PATTERNS.indexOf(pattern) < INLINE_PATTERNS.indexOf(earliest.pattern))) {
      earliest = { pattern, match, index: match.index };
    }
  }

  return earliest;
};

const renderInlineMatch = (matchData, keyPrefix) => {
  const { pattern, match } = matchData;
  const textKey = `${keyPrefix}-${pattern.type}-${match.index}`;

  switch (pattern.type) {
    case 'code':
      return (
        <code key={textKey} className="bg-slate-800 px-1 rounded text-amber-300 font-mono text-[0.85em]">
          {match[1]}
        </code>
      );
    case 'bold':
      return <strong key={textKey}>{parseInline(match[1], `${textKey}-bold`)}</strong>;
    case 'underline':
      return <u key={textKey}>{parseInline(match[1], `${textKey}-underline`)}</u>;
    case 'strikethrough':
      return <del key={textKey}>{parseInline(match[1], `${textKey}-strike`)}</del>;
    case 'italic':
      return <em key={textKey}>{parseInline(match[1], `${textKey}-italic`)}</em>;
    case 'link': {
      const url = match[1] || match[3];
      const label = match[2] || url;
      return (
        <a
          key={textKey}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-cyan-300 hover:text-cyan-200 underline"
        >
          {label}
        </a>
      );
    }
    case 'mention': {
      const mentionText = match[0];
      return (
        <span key={textKey} className="text-amber-300 font-semibold">
          {mentionText}
        </span>
      );
    }
    default:
      return match[0];
  }
};

const parseInline = (text, keyPrefix = 'inline') => {
  if (!text) return [];

  const matchData = findNextInlineMatch(text);
  if (!matchData) {
    return [text];
  }

  const { match, index } = matchData;
  const before = text.slice(0, index);
  const matchedText = match[0];
  const after = text.slice(index + matchedText.length);

  return [
    ...(before ? [before] : []),
    renderInlineMatch(matchData, keyPrefix),
    ...parseInline(after, `${keyPrefix}-${index}`)
  ];
};

const parseMessageContent = (content) => {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (!currentList) return;
    blocks.push({ type: currentList.type, items: currentList.items });
    currentList = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('> ')) {
      flushList();
      blocks.push({ type: 'quote', content: line.slice(2).trim() });
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList();
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ordered') {
        flushList();
        currentList = { type: 'ordered', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      continue;
    }

    flushList();
    blocks.push({ type: 'paragraph', content: line });
  }

  flushList();

  return blocks.map((block, index) => {
    if (block.type === 'quote') {
      return (
        <div
          key={`quote-${index}`}
          className="border-l-4 border-cyan-400 bg-slate-800/80 p-3 rounded-r-xl text-slate-200"
        >
          {parseInline(block.content, `quote-${index}`)}
        </div>
      );
    }

    if (block.type === 'bullet' || block.type === 'ordered') {
      const ListTag = block.type === 'bullet' ? 'ul' : 'ol';
      return (
        <ListTag key={`list-${index}`} className="list-inside list-disc space-y-1 pl-5 text-slate-200">
          {block.items.map((item, itemIndex) => (
            <li key={`item-${index}-${itemIndex}`} className="leading-6">
              {parseInline(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ListTag>
      );
    }

    return (
      <p key={`para-${index}`} className="whitespace-pre-wrap leading-relaxed">
        {parseInline(block.content, `para-${index}`)}
      </p>
    );
  });
};

export default parseMessageContent;
