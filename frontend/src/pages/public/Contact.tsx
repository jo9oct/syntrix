import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { Mail, Clock, MessageSquare, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { PublicHeader } from '../../components/layout/PublicHeader';

const contactInfo = [
  {
    icon: <Mail size={18} />,
    iconColor: 'text-brand-cyan',
    iconBg: 'bg-brand-cyan/10 border-brand-cyan/20',
    label: 'Email Us',
    value: 'security@sentrix.local'
  },
  {
    icon: <Clock size={18} />,
    iconColor: 'text-brand-purple',
    iconBg: 'bg-brand-purple/10 border-brand-purple/20',
    label: 'Response Time',
    value: 'Under 24 hours'
  },
  {
    icon: <MessageSquare size={18} />,
    iconColor: 'text-brand-magenta',
    iconBg: 'bg-brand-magenta/10 border-brand-magenta/20',
    label: 'Support Hours',
    value: 'Mon–Fri, 9am – 6pm EST'
  }
];

export const Contact: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  };

  const content = (
    <div id="contact" className="max-w-5xl mx-auto scroll-mt-28 px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-12 space-y-4">
        <div className="section-badge bg-brand-magenta/10 border border-brand-magenta/20 text-brand-magenta">
          <Sparkles size={12} /> Get in Touch
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
          We're here to help
        </h2>
        <p className="text-text-muted text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Whether you need a full security assessment or just have a question about the platform, our team is ready.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-7">
        {/* Left: Contact info */}
        <div className="md:col-span-2 space-y-5">
          {contactInfo.map((info, i) => (
            <div key={i} className="glass-card p-4 border-white/8 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${info.iconBg} ${info.iconColor}`}>
                {info.icon}
              </div>
              <div>
                <div className="text-xs text-text-muted mb-0.5">{info.label}</div>
                <div className="text-sm font-semibold text-white">{info.value}</div>
              </div>
            </div>
          ))}

          {/* Ambient note */}
          <div className="glass-elevated rounded-2xl border border-white/8 p-4 mt-2">
            <p className="text-xs text-text-muted leading-relaxed">
              For enterprise or bulk licensing enquiries, mention it in your message and a dedicated security architect will reach out within 12 hours.
            </p>
          </div>
        </div>

        {/* Right: Contact form */}
        <div className="md:col-span-3">
          <div className="glass-elevated rounded-3xl border border-white/8 overflow-hidden">
            <div className="p-6 sm:p-8">
              {sent ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight">Message Sent!</h3>
                  <p className="text-text-muted text-sm leading-relaxed max-w-xs mx-auto">
                    Thank you for reaching out. A security engineer will respond within 24 hours.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="text-xs text-brand-cyan hover:underline mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan rounded"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" placeholder="Jane" required />
                    <Input label="Last Name" placeholder="Doe" required />
                  </div>
                  <Input label="Work Email" type="email" placeholder="jane@company.com" required />
                  <Select
                    label="Subject"
                    options={[
                      { value: 'general', label: 'General Inquiry' },
                      { value: 'assessment', label: 'Security Assessment' },
                      { value: 'partnership', label: 'Partnership' },
                      { value: 'support', label: 'Platform Support' }
                    ]}
                    required
                  />
                  <Textarea label="Message" placeholder="How can we help you?" rows={5} required />
                  <Button type="submit" loading={loading} className="w-full mt-2" icon={<Send size={16} />}>
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 section-glow-right opacity-35 pointer-events-none" aria-hidden="true" />
        {content}
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-background-darker pt-32 pb-20 relative overflow-hidden">
      <PublicHeader />
      {content}
    </div>
  );
};
