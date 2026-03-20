'use client';

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Chat {
  id?: number;
  title: string;
}

const Chat = () => {
  const mainRef = useRef<HTMLDivElement>(null);
  const [userMessage, setUserMessage] = useState('');
  const [fullChatLog, setFullChatLog] = useState<Message[]>([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat>({ id: undefined, title: 'New Chat' });

  const inputPlaceholder = "Enter message...";

  useEffect(() => {
    if (mainRef.current && fullChatLog.length > 0 && fullChatLog[fullChatLog.length - 1].role === "user") {
      setTimeout(() => {
        if (mainRef.current) {
          const userMessages = mainRef.current.querySelectorAll('[data-user-message]');
          const latestUserMessage = userMessages[userMessages.length - 1] as HTMLElement;
          if (latestUserMessage) {
            latestUserMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  }, [fullChatLog.length]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const username = localStorage.getItem("username");
        if (!username) return;

        const response = await fetch('/api/get-user-chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username
          })
        });

        if (!response.ok) throw new Error('Failed to fetch chats');
        const chatList = await response.json();
        setChats(chatList.map((responseChat: any) => ({ 
          id: responseChat.chat_id,
          title: responseChat.title 
        })));
      } catch (error) {
        console.error('Error getting chats:', error);
      }
    };

    fetchChats();
  }, []);

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!currentChat?.id) {
        setFullChatLog([]);
        return;
      }

      try {
        const response = await fetch('/api/get-chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: currentChat.id
          })
        });

        if (!response.ok) throw new Error('Failed to fetch chat history');
        const messages = await response.json();
        setFullChatLog(messages);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setFullChatLog([]);
      }
    };

    fetchChatHistory();
  }, [currentChat?.id]);

  const createNewChat = async() => {
        const username = localStorage.getItem("username");
        if (!username) {
          console.error("Username not found");
          return;
        }

        const createResponse = await fetch('/api/create-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username,
            message: userMessage
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create chat');
        }

        const createData = await createResponse.json();
        const chatId = createData.chat_id;
        
        // Update current chat with the new ID
        const newChat: Chat = { id: chatId, title: userMessage };
        setCurrentChat(newChat);
        
        // Refresh chats list
        const chatsResponse = await fetch('/api/get-user-chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username })
        });
        if (chatsResponse.ok) {
          const chatList = await chatsResponse.json();
          setChats(chatList.map((responseChat: any) => ({ 
            id: responseChat.chat_id,
            title: responseChat.title 
          })));
        }
      
        return chatId
  }

  const streamResponse = async() => {
    try {
      setGeneratingResponse(true);
      let chatId = currentChat?.id;

      // If this is a new chat, create it first
      if (!chatId) {
        chatId = await createNewChat();
      }

      setFullChatLog(prevLog => [...prevLog, {role: "user", content: userMessage}]);
      const userMsg = userMessage; // save current text
      setUserMessage('');

      let ongoingText = "...";
      setStreamedText(ongoingText);

      const response = await fetch('/api/generate_response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          chat_id: chatId
        })
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let firstChunkLoaded = false;
      let fullResponseText = "";

      while (!done) {
        const {value, done: readerDone} = await reader.read();
        done = readerDone;
        
        if (value) {
          if (!firstChunkLoaded) {
            ongoingText = "";
            firstChunkLoaded = true;
          }
          const chunkValue = decoder.decode(value, { stream: true });
          ongoingText += chunkValue;
          fullResponseText += chunkValue;
          setStreamedText(ongoingText);
        }
      }
      
      setGeneratingResponse(false);
      setFullChatLog(prevLog => [...prevLog, {role: "assistant", content: fullResponseText}]);
      
    } catch (error) {
      console.error("Error fetching response.", error);
    } finally
    {      
      setGeneratingResponse(false);
    }
  }

  return (

    <div className="flex h-screen bg-[#050509] text-slate-100">
      <div className="flex flex-1 justify-center">
        <div className="flex h-full w-full flex-col border-x border-slate-800 bg-[#050509]">

          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-emerald-500/80" />
                <div>
                  <h1 className="text-sm font-semibold">KGTutor</h1>
                  <p className="text-xs text-slate-400">
                    Ask anything about SE450
                  </p>
                </div>
              </div>
              
              {/* Chat Selection */}
              {(
                <select
                  value={currentChat?.id?.toString() || 'new'}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      // Handle new chat creation
                      const newChat: Chat = { id: undefined, title: 'New Chat' };
                      setCurrentChat(newChat);
                      setFullChatLog([]);
                    } else {
                      const selected = chats.find(c => c.id === Number(e.target.value));
                      if (selected) setCurrentChat(selected);
                    }
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="new">+ New Chat</option>
                  {chats.map((chat, index) => (
                    <option key={index} value={chat.id}>
                      {chat.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </header>

          <main ref={mainRef} className={`space-y-4 overflow-y-auto px-4 py-4 mx-80 ${fullChatLog.length > 0 ? "flex-1 pb-96" : "basis-1/3"}`}>
            {fullChatLog.map((message, idx) => (
              <div
                key={idx}
                {...(message.role === "user" && { "data-user-message": true })}
                className={
                  message.role === "user"
                    ? "max-h-64 w-fit max-w-md overflow-y-auto rounded-2xl bg-gray-700 p-4 text-sm leading-relaxed text-slate-100 ml-auto"
                    : "prose max-w-none dark:prose-invert"
                }
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ))}

            {generatingResponse &&
              <div className="prose max-w-none dark:prose-invert">
                <ReactMarkdown>{streamedText}</ReactMarkdown>
              </div>
            }
          </main>

          <footer className="mx-80 px-4 py-3">
            <div className="rounded-2xl bg-gray-700 p-4 text-slate-100 shadow-lg">
              <textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder={inputPlaceholder}
                className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-300 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !generatingResponse) {
                    e.preventDefault();
                    if (userMessage.trim()) {
                      streamResponse();
                    }
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                <span>Model: GPT-4o</span>
                <button 
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-black hover:bg-emerald-400"
                  onClick={streamResponse}
                  disabled={!userMessage.trim() || generatingResponse}
                >
                  <span>Send</span>
                  <span>↵</span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              KGTutor can make mistakes. Check with class materials
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Chat;