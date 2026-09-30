import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { Mail, Clock, MessageSquare, Send } from 'lucide-react';
import { PublicHeader } from '../../components/layout/PublicHeader';

export const Contact: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-background-darker pt-32 pb-20 px-6 relative overflow-hidden">
      <PublicHeader />
      <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-8">
        
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Get in touch</h1>
            <p className="text-text-muted">
              Whether you need a full security assessment or just have a question about the platform, our team is ready to help.
            </p>
          </div>
          
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-xl text-brand-cyan"><Mail size={20} /></div>
              <div>
                <div className="text-sm text-text-muted">Email Us</div>
                <div className="text-white font-medium">security@sentrix.local</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-xl text-brand-purple"><Clock size={20} /></div>
              <div>
                <div className="text-sm text-text-muted">Response Time</div>
                <div className="text-white font-medium">Under 24 hours</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-xl text-brand-magenta"><MessageSquare size={20} /></div>
              <div>
                <div className="text-sm text-text-muted">Support Hours</div>
                <div className="text-white font-medium">Mon-Fri, 9am - 6pm EST</div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <GlassCard className="p-8">
            {sent ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-text-muted">We have received your inquiry and will respond within 24 hours.</p>
                <Button className="mt-6" variant="secondary" onClick={() => setSent(false)}>Send another</Button>
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
                <Button type="submit" loading={loading} className="w-full mt-2" icon={<Send size={18} />}>
                  Send Message
                </Button>
              </form>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  );
};
