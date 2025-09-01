/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Chat } from '@google/genai';
import { FormEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define the structure of a message object
interface Message {
  role: 'user' | 'ai';
  text: string;
}

function App() {
  // State for messages, user input, and loading status
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Start loading for initial greeting

  // Refs for the AI chat instance and the chat window element
  const chatRef = useRef<Chat | null>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);

  // Initialize the Gemini AI and chat
  useEffect(() => {
    // Correctly use API_KEY from environment variables
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    
    // Create a chat instance with the specified model
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
    });

    // Function to generate the initial greeting
    const generateInitialGreeting = async () => {
      if (!chatRef.current) return;
      try {
        const response = await chatRef.current.sendMessageStream({
          message: 'Write a friendly, short greeting to start our conversation. Include a 😊.'
        });

        // Add a placeholder for the AI message that will be populated by the stream
        setMessages(prev => [...prev, { role: 'ai', text: '' }]);

        let aiResponse = '';
        for await (const chunk of response) {
          aiResponse += chunk.text;
          // Update the last message (the AI's) with the streaming content
          setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1].text = aiResponse;
              return newMessages;
          });
        }
      } catch (error) {
        console.error('Failed to generate initial greeting:', error);
        setMessages([{ role: 'ai', text: 'Hello! How can I help you today? 😊' }]);
      } finally {
        setIsLoading(false);
      }
    };

    generateInitialGreeting();
  }, []);

  // Effect to scroll the chat window to the bottom when new messages are added
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chatRef.current) return;

    const userMessage: Message = { role: 'user', text: userInput };
    // Add user message and an empty AI message placeholder to be populated by the stream
    setMessages(prev => [...prev, userMessage, { role: 'ai', text: '' }]);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessageStream({ message: userMessage.text });

      let aiResponse = '';
      for await (const chunk of response) {
        aiResponse += chunk.text;
        // Update the last (AI) message in the array with the new chunk
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = aiResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = 'Sorry, something went wrong. Please try again.';
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Loading indicator component
  const Loader = () => (
    <div className="loader message ai">
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
    </div>
  );

  return (
    <div className="app">
      <header>
        <h1>Gifted's AI chat</h1>
      </header>
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          (msg.text || (isLoading && index === messages.length -1)) ? (
             <div key={index} className={`message ${msg.role}`}>
              {msg.text ? (
                msg.role === 'user' ? (
                  msg.text
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                )
              ) : (
                <Loader />
              )}
            </div>
          ) : null
        ))}
      </div>
      <form className="input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          aria-label="Chat input"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !userInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);