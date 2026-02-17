'use client';

import { useState } from "react";

interface Message {
  id?: number;
  role: "user" | "ai";
  content: string;
}

const Chat = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatId, setChatId] = useState<number | null>(null);
  const [fullChatLog, setFullChatLog] = useState<Message[]>([
    { role: "ai", content: "Hello!" }
  ]);

  const inputPlaceholder = "Enter message...";

  const fetchResponse = async () => {
    try {
      const username = localStorage.getItem("username");

      if (!username) {
        alert("Please sign in first.");
        return;
      }

      // Add user message immediately to UI
      setFullChatLog(prevLog => [
        ...prevLog,
        { id: Date.now(), role: "user", content: userMessage }
      ]);

      const currentMessage = userMessage;
      setUserMessage('');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          chat_id: chatId,
          message: currentMessage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Chat failed");
      }

      // Save chat_id for future messages
      setChatId(data.chat_id);

      // Add AI response to UI
      setFullChatLog(prevLog => [
        ...prevLog,
        { id: Date.now(), role: "ai", content: data.response }
      ]);

    } catch (error: any) {
      console.error("Error fetching response:", error);
      alert(error.message || "Error fetching response.");
    }
  };

  return (
    <div className="flex h-screen bg-[#050509] text-slate-100">
      <div className="flex flex-1 justify-center">
        <div className="flex h-full w-full flex-col border-x border-slate-800 bg-[#050509]">

          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500/80" />

              <div>
                <h1 className="text-sm font-semibold">KGTutor</h1>
                <p className="text-xs text-slate-400">
                  Ask anything about SE450
                </p>
              </div>
            </div>

            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => {
                setChatId(null);
                setFullChatLog([{ role: "ai", content: "Hello!" }]);
              }}
            >
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
                  <span>Model: KGTutor 1.0</span>
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
                KGTutor can make mistakes. Check with class materials
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={`chat-message ${message.role}`}>
      <span className="role">{message.role}: </span>
      <span className="content">{message.content}</span>
    </div>
  );
}

export default Chat;
