import { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { GrEmoji } from "react-icons/gr";

const InputBox = () => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className=" w-[350px] px-3 flex flex-col items-center mb-5 z-50">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      <div className="w-full h-[40px] flex items-center relative">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full h-full rounded-[8px] border-[1px]  mt-2 outline-none px-3 py-2"
          placeholder="Type a message..."
        />
        <button
          className="absolute right-2 cursor-pointer"
         
        >
          <GrEmoji />
        </button>
      </div>
    </div>
  );
};

export default InputBox;
