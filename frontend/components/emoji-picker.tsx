'use client';

import * as React from 'react';
import { Smile, Hand, Heart, Sparkles, Trees, Plane, Package, Flag } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    label: 'Cảm xúc',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '🫠', '🫡', '🫣', '🫤', '🫥', '🥳', '🥸', '🥺', '🥹', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
    ]
  },
  {
    id: 'gestures',
    label: 'Cử chỉ',
    icon: Hand,
    emojis: [
      '🙌', '👏', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '💅', '🤳', '👂', '👃', '👀', '👁️', '👅', '👄', '💋', '🧠', '🦴', '🦷', '👣', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👵', '👴'
    ]
  },
  {
    id: 'nature',
    label: 'Tự nhiên',
    icon: Trees,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙊', '🙉', '🙈', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '☀️', '🌤', '⛅️', '🌥', '☁️', '🌦', '🌧', '⛈', '🌩', '❄️', '☃️', '⛄️'
    ]
  },
  {
    id: 'activities',
    label: 'Hoạt động',
    icon: Sparkles,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸', '🎻', '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🥘', '🍲', '🍿', '🍱', '🍘', '🍙', '🍚', '🍛', '🍰', '🎂', '🥧', '🍫', '🍬', '🍭', '🍮', '🍩', '🍪', '🍨', '🍧', '🍦', '🥤', '🧋', '🍵', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍼', '☕', '🍵', '🍶', '🥢', '🍴', '🥄'
    ]
  },
  {
    id: 'travel',
    label: 'Du lịch',
    icon: Plane,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🚲', '🛴', '🛵', '🏍', '🚂', '🚆', '🚄', '🚅', '🚈', '🚇', '🚊', '🚋', '🚢', '🛥', '🚤', '⛵️', '⛵', '🛶', '⚓️', '🚀', '🛸', '🚁', '🏢', '🏠', '🏡', '⛪️', '🕋', '🏛', '🌆', '🌇', '🌉', '🌋', '🗻', '⛰️', '🏔️', '🏕️', '⛺', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫'
    ]
  },
  {
    id: 'objects',
    label: 'Vật dụng',
    icon: Package,
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '⚔️', '🗡️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻'
    ]
  },
  {
    id: 'symbols',
    label: 'Biểu tượng',
    icon: Flag,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '⭐', '🌟', '💢', '💯', '🚫', '⚠️', '✅', '❌', '⭕', '🛑', '⛔', '📛', '♨️', '🔅', '🔆', '🔱', '⚜️', '🔰', '♻️', '🈯', '💹', '❇️', '✳️', '❎', '💠', '🌀', '💤', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🛐'
    ]
  }
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
}

export function EmojiPicker({ onEmojiSelect, className, disabled, closeOnSelect = false }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('smileys');

  const processedCategories = React.useMemo(() => {
    return EMOJI_CATEGORIES.map(cat => ({
      ...cat,
      validEmojis: cat.emojis.filter(emoji => {
        const trimmed = emoji.trim();
        const isText = /^[a-zA-Z0-9\s]+$/.test(trimmed);
        return !(isText && trimmed.length > 1);
      }).map(e => e.trim())
    }));
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant='ghost'
          size='icon'
          disabled={disabled}
          className={cn('h-8 w-8 text-zinc-500 hover:text-zinc-900 rounded-lg', className)}
        >
          <Smile className='h-4 w-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[320px] p-0 rounded-xl shadow-xl border-zinc-100 bg-white overflow-hidden z-[9999] data-[state=open]:!animate-none data-[state=closed]:!animate-none transition-none">
        {isOpen && (
          <Tabs defaultValue="smileys" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex overflow-x-auto no-scrollbar bg-zinc-50/50 border-b border-zinc-100">
              <TabsList className="flex-1 justify-start rounded-none bg-transparent h-10 p-0 w-max min-w-full">
                {processedCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      className="flex-1 min-w-[45px] h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:text-orange-600 text-zinc-400"
                      title={cat.label}
                    >
                      <Icon className="h-4 w-4" />
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            {processedCategories.map((cat) => (
              <TabsContent
                key={cat.id}
                value={cat.id}
                className="p-2 mt-0 focus-visible:ring-0"
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-8 gap-1 max-h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar p-1">
                  {activeTab === cat.id && cat.validEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEmojiSelect(emoji);
                        if (closeOnSelect) setIsOpen(false);
                      }}
                      className="h-8 w-8 flex items-center justify-center text-lg hover:bg-zinc-100 rounded-lg transition-colors active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}
