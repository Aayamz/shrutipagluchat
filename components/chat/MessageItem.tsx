'use client';

import { useState } from 'react';
import { Message } from '@/lib/types';
import { Check, CheckCheck, Clock, X, Eye } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isSender: boolean;
}

export default function MessageItem({ message, isSender }: MessageItemProps) {
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateRemainingHours = (expiresAtStr: string | null) => {
    if (!expiresAtStr) return null;
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = new Date().getTime();
    const diffMs = expiresAt - now;
    if (diffMs <= 0) return 'Expired';
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return `${hours}h remaining`;
  };

  const remainingHoursStr = calculateRemainingHours(message.expires_at);

  return (
    <>
      <div className={`flex flex-col mb-3 ${isSender ? 'items-end' : 'items-start'} animation-fadeIn`}>
        <div
          className={`max-w-[85%] md:max-w-[70%] p-3.5 shadow-card transition-all ${
            isSender
              ? 'bubble-sent text-white'
              : 'bubble-received text-white'
          }`}
        >
          {/* Image Message */}
          {message.message_type === 'image' && message.image_url && (
            <div className="mb-2 relative rounded-lg overflow-hidden border border-white/10 group cursor-pointer">
              <img
                src={message.image_url}
                alt="Chat attachment"
                className="w-full max-h-72 object-cover rounded-lg group-hover:scale-105 transition-all duration-300"
                onClick={() => setShowImageLightbox(true)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <Eye className="w-6 h-6 text-white" />
              </div>

              {/* Expiry Badge */}
              {remainingHoursStr && (
                <div className="absolute top-2 right-2 bg-canvas/90 backdrop-blur-md border border-magenta/40 text-magenta text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                  <Clock className="w-3 h-3" />
                  <span>24h Expiry: {remainingHoursStr}</span>
                </div>
              )}
            </div>
          )}

          {/* Text Content */}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
              {message.content}
            </p>
          )}

          {/* Metadata Footer */}
          <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-85">
            <span>{formatTime(message.created_at)}</span>

            {/* Read/Delivered Ticks for Sender */}
            {isSender && (
              <span className="inline-flex items-center">
                {message.status === 'read' ? (
                  <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-link" /></span>
                ) : message.status === 'delivered' ? (
                  <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-white/70" /></span>
                ) : (
                  <span title="Sent"><Check className="w-3.5 h-3.5 text-white/70" /></span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {showImageLightbox && message.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animation-fadeIn"
          onClick={() => setShowImageLightbox(false)}
        >
          <button
            onClick={() => setShowImageLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-primary p-2 rounded-full bg-canvas/50 border border-hairline"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={message.image_url}
            alt="Full size attachment"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-float"
          />
        </div>
      )}
    </>
  );
}
