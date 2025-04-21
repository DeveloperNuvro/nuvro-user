import React from 'react';

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

const messages: Message[] = [
  { text: 'Hello, can you help me?', sender: 'user' },
  { text: "Hey! Of course, I’d be happy to help.\nWhat do you need? 😊", sender: 'bot' },
  { text: 'Hello, can you help me?', sender: 'user' },
  { text: "Hey! Of course, I’d be happy to help.\nWhat do you need? 😊", sender: 'bot' },
  { text: 'Hello, can you help me?', sender: 'user' },
  { text: "Hey! Of course, I’d be happy to help.\nWhat do you need? 😊", sender: 'bot' },


];

const ChatMessages: React.FC = () => {
  return (
    <div className="flex flex-col-reverse gap-2 w-[350px] scrollbar-hide pt-[150px] px-3   z-[-10] overflow-y-auto pb-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${
            msg.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`px-4 py-2 max-w-[90%] text-sm whitespace-pre-line rounded-xl ${
              msg.sender === 'user'
                ? 'bg-[radial-gradient(83.13%_223.4%_at_96.63%_91.88%,_#8C52FF_0%,_#5D17E9_100%)] text-white rounded-br-none'
                : 'bg-[#F4EEFF] text-[#8C52FF] rounded-bl-none'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;
