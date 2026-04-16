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
  const [chatError, setChatError] = useState('');

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
    const trimmedMessage = userMessage.trim();
    if (!trimmedMessage) return;

    const username = localStorage.getItem("username");
    if (!username) {
      setChatError("Sign in to start a chat and save your messages.");
      window.dispatchEvent(new Event("open-auth"));
      return;
    }

    try {
      setChatError('');
      setGeneratingResponse(true);
      let chatId = currentChat?.id;

      // If this is a new chat, create it first
      if (!chatId) {
        chatId = await createNewChat();
        if (!chatId) {
          throw new Error('Unable to create a chat for this user.');
        }
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

      if (!response.ok || !response.body) {
        throw new Error('Failed to generate a response.');
      }

      const reader = response.body.getReader();
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
      
      setFullChatLog(prevLog => [...prevLog, {role: "assistant", content: fullResponseText}]);
      
    } catch (error) {
      console.error("Error fetching response.", error);
      setChatError("The chat request failed. Sign in again and try once more.");
    } finally
    {      
      setGeneratingResponse(false);
    }
  }

  return (

    <div className="chat-shell flex h-[calc(100vh-7rem)] min-h-[40rem] bg-transparent text-slate-800">
      <div className="flex flex-1 justify-center">
        <div className="chat-frame flex h-full w-full flex-col border-x border-sky-200/80 bg-sky-50/70 backdrop-blur-sm">

          <header className="chat-header flex items-center justify-between border-b border-sky-200/80 bg-white/55 px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-sky-400 shadow-sm shadow-sky-200" />
                <div>
                  <h1 className="text-sm font-semibold">KGTutor</h1>
                  <p className="text-xs text-white">
                    Ask anything about SE450
                  </p>
                </div>
              </div>
              
              {}
              {(
                <select
                  value={currentChat?.id?.toString() || 'new'}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      // Handle new chat
                      const newChat: Chat = { id: undefined, title: 'New Chat' };
                      setCurrentChat(newChat);
                      setFullChatLog([]);
                    } else {
                      const selected = chats.find(c => c.id === Number(e.target.value));
                      if (selected) setCurrentChat(selected);
                    }
                  }}
                  className="chat-select rounded-lg border border-sky-200 bg-white px-3 py-1 text-xs text-sky-900 shadow-sm transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
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

          <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
              <div className={`space-y-4 ${fullChatLog.length > 0 || generatingResponse ? "" : "flex flex-1 items-center justify-center"}`}>
                {fullChatLog.length === 0 && !generatingResponse ? (
                  <div className="rounded-3xl border border-sky-200 bg-white/80 px-8 py-10 text-center shadow-lg shadow-sky-100">
                    <h2 className="text-xl font-semibold text-sky-950">Start a new chat</h2>
                    <p className="mt-2 text-sm text-sky-700/75">
                      Ask a question about SE450 and lets guide you through complex topics.
                    </p>
                  </div>
                ) : (
                  <>
                    {fullChatLog.map((message, idx) => (
                      <div
                        key={idx}
                        {...(message.role === "user" && { "data-user-message": true })}
                        className={
                          message.role === "user"
                            ? "chat-user-bubble ml-auto w-fit max-w-2xl rounded-2xl border border-sky-300 bg-sky-500 p-4 text-sm leading-relaxed text-white shadow-md shadow-sky-200/80"
                            : "chat-assistant prose max-w-none rounded-3xl border border-transparent bg-transparent p-1"
                        }
                      >
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ))}

                    {generatingResponse && (
                      <div className="chat-assistant prose max-w-none rounded-3xl border border-transparent bg-transparent p-1">
                        <ReactMarkdown>{streamedText}</ReactMarkdown>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>

          <footer className="shrink-0 px-4 py-3">
            <div className="mx-auto w-full max-w-5xl">
            <div className="chat-composer rounded-2xl border border-sky-200 bg-white/90 p-4 text-slate-800 shadow-lg shadow-sky-100">
              <textarea
                value={userMessage}
                onChange={(e) => {
                  setUserMessage(e.target.value);
                  if (chatError) setChatError('');
                }}
                placeholder={inputPlaceholder}
                rows={3}
                className="max-h-40 w-full resize-y bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !generatingResponse) {
                    e.preventDefault();
                    if (userMessage.trim()) {
                      streamResponse();
                    }
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-white">
                <span>Model: GPT-4o</span>
                <button 
                  className="chat-send inline-flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-400 disabled:bg-sky-200 disabled:text-white/70"
                  onClick={streamResponse}
                  disabled={!userMessage.trim() || generatingResponse}
                >
                  <span>Send</span>
                  <span>↵</span>
                </button>
              </div>
              {chatError && (
                <p className="mt-3 text-xs text-amber-300">
                  {chatError}
                </p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-white">
              KGTutor can make mistakes. Check with class materials
            </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Chat;
