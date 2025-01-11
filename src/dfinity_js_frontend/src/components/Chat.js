import React, { useState } from "react";
import useApi from "../hooks/useApi";
import Loading from "./Loading";
import { useEffect } from "react";
import { login, logout } from "../utils/auth";
import toast from "react-hot-toast";
import { getConversation } from "../utils/chat";
import TextInput from "./TextInput";
import { encryptData } from "../utils/encryptData";
import "../styles/cat-theme.css";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const { loading, chatCompletion, chatMessage, setChatMessage } = useApi();

  const updateChatMessage = async () => {
    if (window.auth.principalText && window.auth.isAuthenticated) {
      const conversation = await getConversation(window.auth.principalText);
      console.log(conversation);
      if (conversation) {
        setChatMessage(conversation.conversation);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.auth.isAuthenticated) {
      toast.error("You are not authenticated");
      return;
    }

    const openaiKey = localStorage.getItem("icp-dai-open-ai");
    if (!openaiKey) {
      toast.error("No openai key found");
      return;
    }

    if (question) {
      const history = [...chatMessage, { content: question, role: "user" }];
      setChatMessage(() => [...history]);
      await chatCompletion(history);
      setQuestion("");
    }
  };

  useEffect(() => {
    updateChatMessage();
  }, []);

  const onValidateOpenaiAPI = (e) => {
    const key = e.target.value;
    setOpenaiKey(key);
    
    const apiKeyFormat = /^sk-(?:proj-)?[A-Za-z0-9_-]{36,}$/;
    
    console.log('Key:', key);
    console.log('Is valid:', apiKeyFormat.test(key));
  };
  

  const onSaveOpenaiKey = () => {
    const apiKeyFormat = /^sk-(?:proj-)?[A-Za-z0-9_-]{36,}$/;
    
    if (!openaiKey || !apiKeyFormat.test(openaiKey)) {
      console.log('Invalid key:', openaiKey);
      return toast.error("Invalid API key format");
    }
    
    const encryptedApiKey = encryptData(openaiKey);
    localStorage.setItem("icp-dai-open-ai", encryptedApiKey);
    toast.success("API key successfully saved and encrypted");
    setOpenaiKey("");
  };

  return (
    <div className="cat-wrapper">
      <div className="cat-header">
        <h1>Meow Chat</h1>
        <button
          className="cat-button"
          onClick={() => (window.auth.isAuthenticated ? logout() : login())}
        >
          {window.auth.isAuthenticated ? "Log out" : "Login"}
        </button>
      </div>
      <div className="cat-input-container">
        <TextInput
          onChange={onValidateOpenaiAPI}
          placeholder="Paste your API key here... meow!"
          value={openaiKey}
          type="text"
          style={{ width: '100%' }}
        />
        <button
          className="cat-button"
          onClick={onSaveOpenaiKey}
        >
          Save
        </button>
      </div>
      <div className="cat-chat">
        <div className="conversation-start"></div>
        {chatMessage.map((message, index) => (
          <div
            key={index}
            className={`cat-bubble ${message.role === "user" ? "me" : ""}`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="cat-bubble">
            <Loading />
          </div>
        )}
        <div className="cat-input-container">
          <input
            className="cat-input"
            placeholder="Ask me something... meow!"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? handleSubmit(e) : null)}
          />
          {!loading && (
            <button
              className="cat-button"
              onClick={handleSubmit}
            >
              Send 🐾
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
