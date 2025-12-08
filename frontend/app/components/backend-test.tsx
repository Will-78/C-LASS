'use client';

import { useState, useEffect } from "react";

const Chat = () => {
  const [userMessage, setUserMessage] = useState('');
  const [fullChatLog, setFullChatLog] = useState([{role: "ai", content: "Hello!"}]);

  const inputPlaceholder = "Enter message...";

  const fetchResponse = async() => {
    try {
      setFullChatLog(prevLog => [...prevLog, {role: "user", content: userMessage}]);

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

      setFullChatLog(prevLog => [...prevLog, {role: "ai", content: data.message}]);
      
    } catch (error) {
      console.error("Error fetching response.", error);
    }
  }

  return (
    <div className="chat">
      <div>
        {fullChatLog.map((message, idx) => {
          if (message.role === "user") {
            return (
              <div key={idx} className="user-message">
                user: {message.content}
              </div>
            );
          }
          return (
          <div key={idx} className="ai-message">
            ai: {message.content}
          </div>
          );
        })}
      </div>

      <div className="input-section">
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder={inputPlaceholder}
          className="input-text-box"
        />
        <button type="submit" onClick={fetchResponse} disabled={!userMessage.trim()}>
          Enter
        </button>
      </div>
    </div>
  );
}

export default Chat;
