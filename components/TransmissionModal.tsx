import React from 'react';
import { X, ExternalLink, Headphones, Code, Eye, Share2, Radio, Database, Cpu } from 'lucide-react';

interface TransmissionModalProps {
  onClose: () => void;
}

interface LinkItem {
  label: string;
  url: string;
  icon?: React.ReactNode;
}

interface Category {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  links: LinkItem[];
}

const TransmissionModal: React.FC<TransmissionModalProps> = ({ onClose }) => {
  const categories: Category[] = [
    {
      id: 'audio',
      title: 'Sonic Frequencies',
      icon: <Headphones size={18} />,
      color: 'text-purple-400',
      links: [
        { label: 'Bandcamp', url: 'https://zombiekanapa.bandcamp.com/' },
        { label: 'SoundCloud (Main)', url: 'https://soundcloud.com/zombiekanapa' },
        { label: 'SoundCloud (Trippin)', url: 'https://soundcloud.com/kanapatrippin' },
        { label: 'SoundCloud (Szymon)', url: 'https://soundcloud.com/szymonkarpierz' },
        { label: 'Mixcloud', url: 'https://www.mixcloud.com/zombiekanapa' },
        { label: 'Audio.com', url: 'https://audio.com/zombiekanapa' },
        { label: 'Udio', url: 'https://www.udio.com/creators/zombiekanapa' },
        { label: 'Suno', url: 'https://suno.com/@zombiekanapa' },
        { label: 'MusicGPT', url: 'https://musicgpt.com/@szymonkarpierzszn' },
        { label: 'Producer.ai', url: 'https://www.producer.ai/zombiekanapa' },
        { label: 'Riffusion', url: 'https://www.riffusion.com/zombiekanapa' },
        { label: 'Waves StudioVerse', url: 'https://www.waves.com/studioverse/creator/zombiekanapa' },
      ]
    },
    {
      id: 'visual',
      title: 'Visual / Video Ops',
      icon: <Eye size={18} />,
      color: 'text-pink-400',
      links: [
        { label: 'YouTube', url: 'https://www.youtube.com/@zombiekanapa' },
        { label: 'Instagram', url: 'https://www.instagram.com/kanapazombie/' },
        { label: 'TikTok', url: 'https://www.tiktok.com/@zombiekanapa' },
        { label: 'ArtStation', url: 'https://zombiekanapa.artstation.com/' },
        { label: 'Vimeo', url: 'https://vimeo.com/zombiekanapa' },
        { label: 'OpenArt.ai', url: 'https://openart.ai/@zombiekanapa' },
        { label: 'NightCafe', url: 'https://creator.nightcafe.studio/u/kanapazombie' },
        { label: 'Civitai', url: 'https://civitai.com/user/zombiekanapa' },
      ]
    },
    {
      id: 'code',
      title: 'Code / AI / Dev',
      icon: <Code size={18} />,
      color: 'text-green-400',
      links: [
        { label: 'GitHub', url: 'https://github.com/KanapaZombie' },
        { label: 'HuggingFace', url: 'https://huggingface.co/zombiekanapa' },
        { label: 'Kaggle', url: 'https://www.kaggle.com/szymonkarpierz' },
        { label: 'Dev.to', url: 'https://dev.to/zombiekanapa' },
        { label: 'Azure Dev', url: 'https://dev.azure.com/zombiednb/' },
        { label: 'Apify', url: 'https://apify.com/zombiekanapa' },
        { label: 'OpenWebUI', url: 'https://openwebui.com/u/zombiekanapa' },
        { label: 'DeepAI', url: 'https://deepai.org/profile/szymon-karpierz-szn' },
        { label: 'WandB', url: 'https://wandb.ai/zombiekanapa' },
      ]
    },
    {
      id: 'social',
      title: 'Comms / Social',
      icon: <Share2 size={18} />,
      color: 'text-cyan-400',
      links: [
        { label: 'LinkTree (HQ)', url: 'https://linktr.ee/zombiekanapa' },
        { label: 'Twitter / X', url: 'https://twitter.com/ZKanapa' },
        { label: 'LinkedIn', url: 'https://www.linkedin.com/in/szymonkarpierz/' },
        { label: 'Buy Me A Coffee', url: 'https://buymeacoffee.com/zombiekanapa' },
        { label: 'Discogs', url: 'https://www.discogs.com/artist/384692' },
        { label: 'LinqApp', url: 'https://linqapp.com/szymon?r=link' },
        { label: 'Shortverse', url: 'https://www.shortverse.com/person/zombiekanapa' },
        { label: 'IRCAM Forum', url: 'https://forum.ircam.fr/profile/zombiekanapa/' },
        { label: 'OpenAI Community', url: 'https://community.openai.com/' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-[1500] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-gray-900 border-2 border-purple-500 rounded-lg w-full max-w-4xl shadow-[0_0_30px_rgba(168,85,247,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-purple-900/30 p-4 flex items-center justify-between shrink-0 border-b border-purple-500/50">
          <div className="flex items-center gap-3">
            <Radio className="text-purple-400 h-8 w-8 animate-pulse" />
            <div>
              <h2 className="text-white font-bold text-xl uppercase tracking-wider">Transmission Hub</h2>
              <p className="text-purple-400 text-xs font-mono">SIGNAL STRENGTH: 100% // ENCRYPTED</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-4">
                <div className={`flex items-center gap-2 ${cat.color} border-b border-gray-700 pb-2`}>
                  {cat.icon}
                  <h3 className="font-bold uppercase text-sm tracking-wide">{cat.title}</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {cat.links.map((link, idx) => (
                    <a 
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 transition-all text-xs text-gray-300 hover:text-white"
                    >
                      <span className="truncate mr-2">{link.label}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 border-t border-purple-900/50 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                ZombieKanapa // Global Network Node // 2024
            </p>
        </div>
      </div>
    </div>
  );
};

export default TransmissionModal;