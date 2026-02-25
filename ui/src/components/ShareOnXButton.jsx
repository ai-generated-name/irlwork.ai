import React, { useState } from 'react';

function buildShareText(task) {
  const budget = Number(task.budget) || 0;
  const title = task.title || 'a task';
  const taskUrl = `https://irlwork.ai/tasks/${task.id}`;

  if (task.status === 'completed' || task.status === 'paid') {
    return `An AI just paid a human $${budget} USDC to "${title}" \u{1F916}\n\nThe future of work is here.\n\n${taskUrl}`;
  }

  if (task.status === 'open') {
    return `This AI is paying $${budget} USDC for a human to "${title}" \u{1F916}\n\nApply now on @irlworkai\n\n${taskUrl}`;
  }

  return `AI agents are hiring humans for real-world tasks \u{1F916}\n\nCheck this one out: "${title}" for $${budget} USDC\n\n${taskUrl}`;
}

export default function ShareOnXButton({ task, variant = 'icon-text' }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!task) return null;

  const handleShare = (e) => {
    e.stopPropagation();
    const text = buildShareText(task);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const xIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleShare}
        title="Share on X"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '6px',
          color: isHovered ? '#1DA1F2' : '#888888',
          transition: 'color 0.15s ease',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {xIcon}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 sm:gap-1.5 bg-transparent border-none cursor-pointer text-xs"
      title="Share on X"
      style={{
        color: isHovered ? '#1DA1F2' : '#888888',
        transition: 'color 0.15s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {xIcon}
      <span>Share</span>
    </button>
  );
}

export { buildShareText };
