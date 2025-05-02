import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '../src/components/CodeBlock';
import { FaRegEdit } from 'react-icons/fa';


function Message({ message, isEditing, onStartEditing, isLoadingIndicator }) {

    if (isLoadingIndicator) {
         return (
           <div className="flex flex-col max-w-[80%] p-3 rounded-lg self-start bg-gray-300 text-black">
              <div className="message-text">
                 <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                 </div>
              </div>
           </div>
         );
    }


    const bubbleClasses = `flex flex-col border border-[2px] max-w-[80%] p-3 rounded-lg ${
        message.sender === 'user'
          ? 'self-end bg-gray-100 text-black' 
          : 'self-start bg-gray-200 text-black'
      }`;

    return (
        <div
          id={`message-${message.id}`}
          className={bubbleClasses}
        >
          <div className="flex justify-end items-end text-xs font-semibold mb-1 opacity-90">
             {message.sender === 'user' && !isEditing && !isLoadingIndicator && (
                 <button
                     onClick={() => onStartEditing(message)}
                     className={`mr-2 p-1 text-xs rounded ${message.sender === 'user' ? 'text-white hover:bg-blue-800' : 'text-black hover:bg-gray-400'} transition-colors`}
                     title="Edit message"
                 >
                     <FaRegEdit className='text-lg text-black'/>
                 </button>
             )}
          </div>

          <div className="break-words message-content"> 
             {message.sender === 'user' ? (
                 message.text.split('\n').map((line, i) => (
                   <span key={i}>
                     {line}
                     {i < message.text.split('\n').length - 1 && <br />}
                   </span>
                 ))
             ) : (
                 <ReactMarkdown
                     remarkPlugins={[remarkGfm]}
                     components={{
                         code: CodeBlock,
                        }}
                 >
                     {message.text}
                 </ReactMarkdown>
             )}
           </div>
        </div>
      );
}

export default Message;