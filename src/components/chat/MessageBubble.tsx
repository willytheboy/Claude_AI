import React from 'react';
import { cn, formatRelativeTime } from '../../lib/utils';
import { FeedbackButtons } from './FeedbackButtons';
import { SocialMediaCard } from '../RichContent/SocialMediaCard';
import { MapCard } from '../RichContent/MapCard';
import { ImageCard } from '../RichContent/ImageCard';
import { WeatherCard } from '../RichContent/WeatherCard';
import { LinkPreviewCard } from '../RichContent/LinkPreviewCard';
import { ContactCard } from '../RichContent/ContactCard';
import type { ChatMessage, RichContent } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRate?: (rating: 1 | 5) => void;
  className?: string;
}

function RichContentRenderer({ content }: { content: RichContent }) {
  switch (content.type) {
    case 'image':
      return <ImageCard url={content.url} caption={content.caption} alt={content.alt} />;
    case 'weather':
      return (
        <WeatherCard
          temperature={content.temperature}
          conditions={content.conditions}
          icon={content.icon}
          humidity={content.humidity}
          windSpeed={content.wind_speed}
          recommendation={content.recommendation}
        />
      );
    case 'map':
      return (
        <MapCard
          address={content.address}
          coordinates={content.coordinates}
          zoom={content.zoom}
        />
      );
    case 'social':
      return (
        <SocialMediaCard
          platform={content.platform}
          url={content.url}
          label={content.label}
        />
      );
    case 'contact':
      return (
        <ContactCard
          phone={content.phone}
          whatsapp={content.whatsapp}
          email={content.email}
        />
      );
    case 'link':
      return (
        <LinkPreviewCard
          url={content.url}
          title={content.title}
          description={content.description}
          image={content.image}
        />
      );
    case 'gallery':
      return (
        <div className="grid grid-cols-2 gap-2">
          {content.images.map((img, idx) => (
            <ImageCard key={idx} url={img.url} caption={img.caption} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function MessageBubble({
  message,
  isStreaming = false,
  onRate,
  className,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 px-4 py-2 message-appear',
        isUser ? 'items-end' : 'items-start',
        className
      )}
    >
      {/* Message bubble */}
      <div
        className={cn(
          'chat-bubble',
          isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'
        )}
      >
        {/* Text content */}
        <div className={cn('whitespace-pre-wrap', isStreaming && 'streaming-cursor')}>
          {message.content}
        </div>
      </div>

      {/* Rich content */}
      {message.rich_content && message.rich_content.length > 0 && (
        <div className="flex flex-col gap-2 max-w-[85%] mr-auto">
          {message.rich_content.map((content, index) => (
            <RichContentRenderer key={index} content={content} />
          ))}
        </div>
      )}

      {/* Footer with timestamp and feedback */}
      {!isUser && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeTime(message.created_at)}</span>
          {onRate && !isStreaming && (
            <FeedbackButtons
              messageId={message.id}
              initialRating={message.rating}
              onRate={onRate}
            />
          )}
        </div>
      )}

      {isUser && (
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(message.created_at)}
        </span>
      )}
    </div>
  );
}
