
import { Phone, MessageCircle, Mail } from 'lucide-react';
import { cn, createTelLink, createWhatsAppLink, createMailtoLink, formatPhoneNumber } from '../../lib/utils';

interface ContactCardProps {
  phone?: string;
  whatsapp?: string;
  email?: string;
  className?: string;
}

export function ContactCard({ phone, whatsapp, email, className }: ContactCardProps) {
  if (!phone && !whatsapp && !email) return null;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-white border border-border shadow-sm p-3',
        className
      )}
    >
      <p className="text-xs text-muted-foreground mb-3">Contact us directly</p>

      <div className="flex flex-wrap gap-2">
        {phone && (
          <a
            href={createTelLink(phone)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-blue-50 text-blue-700 hover:bg-blue-100',
              'transition-colors text-sm font-medium'
            )}
          >
            <Phone className="w-4 h-4" />
            <span>Call</span>
          </a>
        )}

        {whatsapp && (
          <a
            href={createWhatsAppLink(whatsapp, 'Hi! I have a question about Sporting Club.')}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-green-50 text-green-700 hover:bg-green-100',
              'transition-colors text-sm font-medium'
            )}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        )}

        {email && (
          <a
            href={createMailtoLink(email, 'Inquiry from AI Concierge')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-purple-50 text-purple-700 hover:bg-purple-100',
              'transition-colors text-sm font-medium'
            )}
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </a>
        )}
      </div>

      {/* Show phone number if provided */}
      {phone && (
        <p className="text-xs text-muted-foreground mt-3">
          Direct line: {formatPhoneNumber(phone)}
        </p>
      )}
    </div>
  );
}
