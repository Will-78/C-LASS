'use client';

import { useState, useEffect } from "react";

interface Message {
  id?: number;
  role: "user" | "ai";
  content: string;
}

const Chat = () => {
  const [userMessage, setUserMessage] = useState('');
  const [fullChatLog, setFullChatLog] = useState<Message[]>([{role: "ai", content: "Hello!"}]);

  const inputPlaceholder = "Enter message...";

  const fetchResponse = async() => {
    try {

      setFullChatLog(prevLog => [...prevLog, {id: Date.now(), role: "user", content: userMessage}]);

      setUserMessage('');

      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      const data = await response.json();

      setFullChatLog(prevLog => [...prevLog, {id: Date.now(), role: "ai", content: data.message}]);
      
    } catch (error) {
      console.error("Error fetching response.", error);
    }
  }

  return (
    <div className="flex h-screen bg-[#050509] text-slate-100">
      <div className="flex flex-1 justify-center">
        <div className="flex h-full w-full flex-col border-x border-slate-800 bg-[#050509]">

          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500/80" />

              <div>
                <h1 className="text-sm font-semibold">C-LASS</h1>
                <p className="text-xs text-slate-400">
                  Ask anything about SE450
                </p>
              </div>

            </div>

            <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              New chat
            </button>

          </header>

          <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {fullChatLog.map((message, idx) => 
              <ChatMessage key={idx} message={message} />
            )}
          </main>

          <footer className="border-t border-slate-800 px-4 py-3">
            <div className="mx-auto">
              <div className="rounded-2xl border border-slate-700 bg-[#0b0b12] px-3 py-2 shadow-lg">

                <textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (userMessage.trim()) {
                      fetchResponse();
                      }
                    }
                  }}
                />

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Model: C-LASS 1.0</span>
                  <button 
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-black hover:bg-emerald-400"
                  onClick={fetchResponse}
                  disabled={!userMessage.trim()}
                  >
                    <span>Send</span>
                    <span>↵</span>
                  </button>
                </div>

              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                C-LASS can make mistakes. Check with class materials
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  // leaving this for later bc this killed me
  
  return (
    <div className={`chat-message ${message.role}`}>
      <span className="role">{message.role}: </span>
      <span className="content">{message.content}</span>
    </div>
  );
}

export default Chat;
