import React, { useState, useEffect, useRef } from 'react';
import { FaEllipsisV } from 'react-icons/fa';

function Sidebar({ conversations, activeConversationId, selectConversation, startNewConversation, updateConversationTitle, deleteConversation }) {
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  const handleStartRename = (conv) => {
    setEditingConversationId(conv.id);
    setNewTitle(conv.title || '');
    setIsDropdownOpen(null);
  };

  const handleSaveRename = (id) => {
    if (newTitle.trim()) {
      updateConversationTitle(id, newTitle);
      setEditingConversationId(null);
    }
  };

  const handleCancelRename = () => {
    setEditingConversationId(null);
    setNewTitle('');
  };

  const handleOpenDropdown = (convId) => {
    setIsDropdownOpen(isDropdownOpen === convId ? null : convId);
  };

  const handleDeleteClick = (convId) => {
    deleteConversation(convId);
    setIsDropdownOpen(null);
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen !== null && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="bg-gray-800 text-white flex flex-col w-80 flex-shrink-0">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={startNewConversation}
          className="w-full bg-cyan-800 hover:bg-cyan-900 text-white font-bold py-2 px-4 rounded"
        >
          New Chat
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={`p-3 cursor-pointer hover:bg-gray-700 flex items-center justify-between ${activeConversationId === conv.id ? 'bg-gray-700 border-l-4 border-cyan-800' : ''
              }`}
          >
            <div
              className="flex-grow text-sm font-semibold truncate"
              onClick={() => {
                if (!isDropdownOpen) {
                  selectConversation(conv.id);
                }
              }}
            >
              {editingConversationId === conv.id ? (
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => handleSaveRename(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(conv.id);
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                  className="bg-gray-700 text-white rounded py-1 px-2 text-sm focus:outline-none"
                  autoFocus
                />
              ) : (
                conv.title || 'New Chat'
              )}
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => handleOpenDropdown(conv.id)}
                className="text-gray-500 hover:text-white focus:outline-none"
                title="Options"
              >
                <FaEllipsisV size={14} />
              </button>
              {isDropdownOpen === conv.id && (
                <div className="absolute right-0 mt-2 w-32 bg-gray-700 border border-gray-600 rounded shadow-md z-10">
                  <button
                    onClick={() => handleStartRename(conv)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-600 focus:outline-none"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteClick(conv.id)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-600 focus:outline-none text-red-500"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;