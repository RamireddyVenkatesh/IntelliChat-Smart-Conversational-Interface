import React, { useState, useRef, useEffect } from 'react';
import Message from '../Message';
import { FaRegEdit, FaCheck, FaTimes, FaPaperclip, FaTimesCircle } from 'react-icons/fa';

function ChatArea({ conversationId, messages, isLoadingMessages, isLoadingAI, sendMessage, editMessage, conversations }) {
  const [inputMessage, setInputMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingAI, editingMessageId]);

  useEffect(() => {
    if (editingMessageId !== null) {
      const messageToEdit = messages.find(msg => msg.id === editingMessageId);
      if (messageToEdit) {
        setEditingMessageText(messageToEdit.text);
        const element = document.getElementById(`message-${editingMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        console.warn(`Message with ID ${editingMessageId} not found in current messages list. Cancelling edit.`);
        handleCancelEditing();
      }
    } else {
      setEditingMessageText('');
    }
  }, [editingMessageId, messages]);

  const handleSendMessage = () => {
    if ((!inputMessage.trim() && !selectedFile) || isLoadingAI) {
      return;
    }
    sendMessage(inputMessage, selectedFile);
    setInputMessage('');
    setSelectedFile(null);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartEditing = (message) => {
    if (message.sender === 'user' && !isLoadingAI && editingMessageId === null) {
      setEditingMessageId(message.id);
    }
  };

  const handleSaveEditing = async () => {
    if (!editingMessageId || !editingMessageText.trim() || isLoadingAI) {
      return;
    }
    await editMessage(editingMessageId, editingMessageText);
    setEditingMessageId(null);
  };

  const handleCancelEditing = () => {
    setEditingMessageId(null);
  };

  const handleEditKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSaveEditing();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File size exceeds the maximum limit of ${maxSize / 1024 / 1024}MB.`);
        setSelectedFile(null);
        event.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          name: file.name,
          type: file.type,
          content: e.target.result
        };
        setSelectedFile(fileData);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
        reader.readAsText(file);
      } else {
        alert(`Unsupported file type: ${file.type}. Only images and plain text files are supported for now.`);
        setSelectedFile(null);
        event.target.value = null;
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const activeConversation = conversations ? conversations.find(conv => conv.id === conversationId) : null;
  const headerTitle = activeConversation ? activeConversation.title : 'New Conversation';

  return (
    <div className="flex-grow flex flex-col bg-gray-50 overscroll-none">
      <div className="p-4 border-b border-gray-200 bg-gray-600 text-center text-white overscroll-none">
        <h2 className="text-lg font-semibold">{headerTitle}</h2>
        {isLoadingMessages && <div className="text-sm text-gray-500">Loading messages...</div>}
      </div>

      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4 overscroll-none">
        {messages.length === 0 && conversationId === null && !isLoadingMessages && !isLoadingAI ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <h3 className="text-2xl font-bold mb-4">Welcome to the ChatBot!</h3>
            <p className="text-lg mb-4">I'm ready to help you with your questions or provide creative content.</p>
            <p className="text-md">Type a message below to start a new conversation.</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isEditing={editingMessageId === message.id}
              onStartEditing={handleStartEditing}
              isLoadingIndicator={message.isLoadingIndicator}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="self-center w-[800px] flex p-6 border-t border-gray-200 bg-gray-200 overscroll-none rounded-[50px]">
        {editingMessageId !== null ? (
          <div className="flex-grow flex items-center gap-2">
            <textarea
              value={editingMessageText}
              onChange={(e) => setEditingMessageText(e.target.value)}
              onKeyPress={handleEditKeyPress}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-700 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={editingMessageText.split('\n').length || 1}
              disabled={isLoadingAI}
            />
            <button
              onClick={handleSaveEditing}
              className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!editingMessageText.trim() || isLoadingAI}
              title="Save Edit"
            >
              <FaCheck />
            </button>
            <button
              onClick={handleCancelEditing}
              className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
              title="Cancel Edit"
            >
              <FaTimes />
            </button>
          </div>
        ) : (
          <div className="flex-grow flex items-center gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-blue-700 resize-none max-h-[120px] overflow-y-auto"
              placeholder="Type your message here..."
              rows={inputMessage.split('\n').length || 1}
              disabled={isLoadingAI}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,text/plain,text/markdown"
            />
            {selectedFile ? (
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                <span className="text-sm text-gray-700 truncate max-w-[100px]">{selectedFile.name}</span>
                <button onClick={handleClearFile} className="text-red-500 hover:text-red-700" title="Remove file">
                  <FaTimesCircle />
                </button>
              </div>
            ) : (
              <button onClick={handleAttachClick} className="text-gray-600 hover:text-gray-900" title="Attach a file">
                <FaPaperclip />
              </button>
            )}
            <button
              onClick={handleSendMessage}
              className="ml-2 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={(inputMessage.trim() === '' && !selectedFile) || isLoadingAI}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatArea;
