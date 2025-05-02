import React from 'react'
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import './index.css';

const ChatBot = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversationMessages, setActiveConversationMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [tempIdCounter, setTempIdCounter] = useState(0);

  const getNewTempId = (prefix = 'temp') => {
    const id = `${prefix}-${Date.now()}-${tempIdCounter}`;
    setTempIdCounter(prev => prev + 1);
    return id;
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/gemini/conversations');
      if (!response.ok) return [];
      const data = await response.json();
      setConversations(data);
      return data;
    } catch (error) {
      return [];
    }
  };

  const fetchMessages = async () => {
    if (!activeConversationId) {
      setActiveConversationMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);
    try {
      const response = await fetch(`http://localhost:8080/api/gemini/conversations/${activeConversationId}/messages`);
      if (!response.ok) {
        if (response.status === 404) {
          setConversations(prevConvs => prevConvs.filter(conv => conv.id !== activeConversationId));
          setActiveConversationId(null);
        }
        setActiveConversationMessages([]);
        return;
      }
      const data = await response.json();
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role
      }));
      setActiveConversationMessages(formattedMessages);
    } catch (error) {
      setActiveConversationMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    const loadConversationsAndSelectRecent = async () => {
      const convs = await fetchConversations();
      if (convs.length > 0) {
        setActiveConversationId(convs[0].id);
      }
      setInitialLoadComplete(true);
    };
    loadConversationsAndSelectRecent();
  }, []);

  useEffect(() => {
    if (initialLoadComplete) {
      fetchMessages();
    }
  }, [activeConversationId, initialLoadComplete]);

  const selectConversation = (id) => {
    if (activeConversationId !== id) {
      setActiveConversationId(id);
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setActiveConversationMessages([]);
  };

  const handleUpdateConversationTitle = async (conversationId, newTitle) => {
    try {
      const response = await fetch(`http://localhost:8080/api/gemini/conversations/${conversationId}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });
      if (response.ok) {
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === conversationId ? { ...conv, title: newTitle } : conv
          )
        );
      } else {
        console.error('Failed to update conversation title:', response.status);
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

const handleDeleteConversation = async (conversationId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/gemini/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setConversations(prevConversations =>
          prevConversations.filter(conv => conv.id !== conversationId)
        );
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
          setActiveConversationMessages([]);
        }
      } else {
        console.error('Failed to delete conversation:', response.status);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleSendMessage = async (prompt, selectedFile) => {
    if ((!prompt.trim() && !selectedFile) || isLoadingAI) return;

    const userMessageText = prompt.trim() + (selectedFile ? ` (file: ${selectedFile.name})` : '');
    const userMessage = { id: getNewTempId('user'), text: userMessageText, sender: 'user' };
    setActiveConversationMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoadingAI(true);

    const loadingMessageId = getNewTempId('loading');
    const loadingMessage = {
      id: loadingMessageId,
      text: '',
      sender: 'model',
      isLoadingIndicator: true
    };
    setActiveConversationMessages(prevMessages => {
      const userMsgIndex = prevMessages.findIndex(msg => msg.id === userMessage.id);
      if (userMsgIndex !== -1) {
        const newMessages = [...prevMessages];
        newMessages.splice(userMsgIndex + 1, 0, loadingMessage);
        return newMessages;
      }
      return [...prevMessages, loadingMessage];
    });

    const requestBody = {
      prompt: prompt.trim(),
      conversationId: activeConversationId,
      file: selectedFile ? {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileContent: selectedFile.content
      } : null
    };

    try {
      const response = await fetch('http://localhost:8080/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setActiveConversationMessages(prevMessages => {
          let newMessages = prevMessages.filter(msg => msg.id !== loadingMessageId);
          const userMsgIndex = newMessages.findIndex(msg => msg.id === userMessage.id);
          const errorMsg = {
            id: getNewTempId('error'),
            text: `Error: ${errorData.error || response.statusText || 'Unknown Error'}`,
            sender: 'model'
          };
          if (userMsgIndex !== -1) {
            newMessages.splice(userMsgIndex + 1, 0, errorMsg);
          } else {
            newMessages.push(errorMsg);
          }
          return newMessages;
        });
        return;
      }

      const data = await response.json();
      const receivedConversationId = data.conversationId;
      const isNewChat = !activeConversationId;

      if (isNewChat) {
        setActiveConversationId(receivedConversationId);
        await fetchConversations();
        // Removed: await fetchMessages();
      } else {
        await fetchMessages();
      }

    } catch (error) {
      setActiveConversationMessages(prevMessages => {
        let newMessages = prevMessages.filter(msg => msg.id !== loadingMessageId);
        const userMsgIndex = newMessages.findIndex(msg => msg.id === userMessage.id);
        const netErrorMsg = {
          id: getNewTempId('neterror'),
          text: `Network Error: ${error.message || 'Unknown Error'}`,
          sender: 'model'
        };
        if (userMsgIndex !== -1) {
          newMessages.splice(userMsgIndex + 1, 0, netErrorMsg);
        } else {
          newMessages.push(netErrorMsg);
        }
        return newMessages;
      });
    } finally {
      setIsLoadingAI(false);
    }
  };
  const handleEditMessage = async (messageId, newContent) => {
    if (!activeConversationId || !newContent.trim() || isLoadingAI) return;

    const originalMessage = activeConversationMessages.find(msg => msg.id === messageId);
    if (!originalMessage) return;

    setActiveConversationMessages(prevMessages =>
        prevMessages.map(msg =>
            msg.id === messageId ? { ...msg, text: newContent, isEditing: false } : msg
        )
    );

    try {
        const updateResponse = await fetch(`http://localhost:8080/api/gemini/message/${messageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newContent })
        });

        if (!updateResponse.ok) {
            const updateErrorData = await updateResponse.json().catch(() => ({}));
            setActiveConversationMessages(prevMessages => {
                const messagesWithRevertedEdit = prevMessages.map(msg =>
                    msg.id === messageId ? { ...msg, text: originalMessage.text } : msg
                );
                const index = messagesWithRevertedEdit.findIndex(msg => msg.id === messageId);
                const errorMessage = {
                    id: getNewTempId('edit-save-error'),
                    text: `Failed to save edit: ${updateErrorData.error || updateResponse.statusText || 'Unknown Error'}`,
                    sender: 'model'
                };
                if (index !== -1) {
                    messagesWithRevertedEdit.splice(index + 1, 0, errorMessage);
                } else {
                    messagesWithRevertedEdit.push(errorMessage);
                }
                return messagesWithRevertedEdit;
            });
            return;
        }

        const editedMessageIndex = activeConversationMessages.findIndex(msg => msg.id === messageId);
        if (editedMessageIndex === -1) {
            setActiveConversationMessages(prevMessages => {
                const newMessages = [...prevMessages];
                const index = newMessages.findIndex(msg => msg.id === messageId && msg.isLoadingIndicator !== true);
                const errorMessage = {
                    id: getNewTempId('regen-error-find'),
                    text: `Error: Could not find message in list to regenerate from.`,
                    sender: 'model'
                };
                if (index !== -1) {
                    newMessages.splice(index + 1, 0, errorMessage);
                } else {
                    newMessages.push(errorMessage);
                }
                return newMessages;
            });
            return;
        }

        const loadingMessageId = getNewTempId('regen-loading');
        setActiveConversationMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const index = newMessages.findIndex(msg => msg.id === messageId && msg.isLoadingIndicator !== true);
            const loadingIndicator = {
                id: loadingMessageId,
                text: '',
                sender: 'model',
                isLoadingIndicator: true
            };
            if (index !== -1) {
                newMessages.splice(index + 1);
                newMessages.push(loadingIndicator);
            } else {
                newMessages.push(loadingIndicator);
            }
            return newMessages;
        });
        setIsLoadingAI(true);

        try {
            const editedMessage = activeConversationMessages.find(msg => msg.id === messageId && msg.isLoadingIndicator !== true);
            if (!editedMessage) throw new Error("Internal Error: Could not find edited message in list after splice.");

            const regenResponse = await fetch(`http://localhost:8080/api/gemini/conversations/${activeConversationId}/regenerate-from/${editedMessage.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!regenResponse.ok) {
                const regenErrorData = await regenResponse.json().catch(() => ({}));
                setActiveConversationMessages(prevMessages => {
                    let newMessages = prevMessages.filter(msg => msg.id !== loadingMessageId);
                    const index = newMessages.findIndex(msg => msg.id === messageId && msg.isLoadingIndicator !== true);
                    const errorMessage = {
                        id: getNewTempId('regen-error'),
                        text: `Regeneration failed: ${regenErrorData.error || regenResponse.statusText || 'Unknown Error'}`,
                        sender: 'model'
                    };
                    if (index !== -1) {
                        newMessages.splice(index + 1, 0, errorMessage);
                    } else {
                        newMessages.push(errorMessage);
                    }
                    return newMessages;
                });
                return;
            }

            const newAiMessageEntity = await regenResponse.json();
            if (!newAiMessageEntity || typeof newAiMessageEntity.id === 'undefined' || !newAiMessageEntity.role || typeof newAiMessageEntity.content === 'undefined') {
                setActiveConversationMessages(prevMessages => prevMessages.filter(msg => msg.id !== loadingMessageId).concat({
                    id: getNewTempId('regen-format-error'),
                    text: `Regeneration failed: Unexpected response format from backend.`,
                    sender: 'model'
                }));
                return;
            }

            setActiveConversationMessages(prevMessages => {
                let newMessages = [...prevMessages];
                newMessages = newMessages.filter(msg => msg.id !== loadingMessageId);
                const index = newMessages.findIndex(msg => msg.id === messageId && msg.isLoadingIndicator !== true) + 1;
                const formattedMessage = {
                    id: newAiMessageEntity.id,
                    text: newAiMessageEntity.content,
                    sender: newAiMessageEntity.role
                };
                newMessages.splice(index, 0, formattedMessage);
                return newMessages;
            });

        } catch (error) {
            setActiveConversationMessages(prevMessages => prevMessages.filter(msg => msg.id !== loadingMessageId));
            setActiveConversationMessages(prevMessages => {
                const newMessages = [...prevMessages];
                const index = newMessages.findIndex(msg => msg.id === messageId && msg.isLoadingIndicator !== true);
                const errorMessage = {
                    id: getNewTempId('regen-err'),
                    text: `Regeneration error: ${error.message || 'Unknown error'}`,
                    sender: 'model'
                };
                if (index !== -1) {
                    newMessages.splice(index + 1, 0, errorMessage);
                } else {
                    newMessages.push(errorMessage);
                }
                return newMessages;
            });
        } finally {
            setIsLoadingAI(false);
        }

    } catch (error) {
        setActiveConversationMessages(prevMessages => {
            const newMessages = [...prevMessages];
            const index = newMessages.findIndex(msg => msg.id === messageId);
            const errorMessage = {
                id: getNewTempId('main-edit-error'),
                text: `Edit failed: ${error.message || 'Unknown Error'}`,
                sender: 'model'
            };
            if (index !== -1) {
                newMessages[index].text = originalMessage.text;
                newMessages.splice(index + 1, 0, errorMessage);
            } else {
                newMessages.push(errorMessage);
            }
            return newMessages;
        });
    }
    
};


  return (
        <div className="flex h-screen bg-gray-100 overscroll-none">
            <Sidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                selectConversation={selectConversation}
                startNewConversation={startNewConversation}
                updateConversationTitle={handleUpdateConversationTitle} // Pass this prop
                deleteConversation={handleDeleteConversation}   // Pass this prop
                isLoadingConversations={!initialLoadComplete && conversations.length === 0}
                className="flex-shrink-0 w-80"
            />

            <ChatArea
                conversationId={activeConversationId}
                messages={activeConversationMessages}
                isLoadingMessages={isLoadingMessages}
                isLoadingAI={isLoadingAI}
                sendMessage={handleSendMessage}
                editMessage={handleEditMessage}
                conversations={conversations}
            />
        </div>
    );
}

export default ChatBot;