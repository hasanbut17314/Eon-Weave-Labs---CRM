import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessages, sendMessage, addLocalMessage, removeLocalMessage } from "@/redux/slices/chatSlice";
import { RootState, AppDispatch } from "@/redux/Store"
import useAuth from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import {  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Ellipsis } from "lucide-react"
import { baseURL } from "@/utils/baseURL";
import { useToast } from "@/hooks/use-toast";
import SocketService from "@/lib/socket";

const TextScreen = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?._id
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketService = SocketService.getInstance();
  const roomJoinedRef = useRef(false);

  const dispatch = useDispatch<AppDispatch>();

  const {
    selectedChat,
    chatType,
    conversationId,
    messages,
    isMessagesLoading
  } = useSelector((state: RootState) => state.chat);

  const chatId = selectedChat?._id || "";
  const actualChatId = chatType === "user" && conversationId ? conversationId : chatId;
  const chatMessages = useMemo(() => selectedChat ? messages[actualChatId] || [] : [], [selectedChat, messages, actualChatId]);

  // Handle socket room joining
  useEffect(() => {
    // Reset room joined flag when chat changes
    roomJoinedRef.current = false;
  }, [selectedChat, chatType]);

  // useEffect(() => {
  //   // Join the appropriate room based on chat type
  //   if (selectedChat?._id && !roomJoinedRef.current) {
  //     console.log('Joining room for chat:', selectedChat.name || selectedChat._id);
      
  //     if (chatType === "channel") {
  //       // For channels, join using channel ID
  //       socketService.joinChannel(selectedChat._id);
  //     } else if (chatType === "user" && conversationId) {
  //       // For direct messages, join using conversation ID
  //       console.log('Joining conversation room:', conversationId);
  //       // Try both possible event names the backend might expect
  //       socketService.joinChannel(conversationId);
        
  //       // Manually join room since backend might not have a specific "join conversation" event
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       const socket = (socketService as any).socket;
  //       if (socket) {
  //         socket.emit('join_room', { conversationId });
  //         socket.emit('join_room', { roomId: `conversation:${conversationId}` });
  //       }
  //     }
      
  //     roomJoinedRef.current = true;
  //   }
    
  //   // Clean up when component unmounts or chat changes
  //   return () => {
  //     if (chatType === "channel" && selectedChat?._id) {
  //       socketService.leaveChannel(selectedChat._id);
  //     } else if (chatType === "user" && conversationId) {
  //       socketService.leaveChannel(conversationId);
  //     }
  //   };
  // }, [selectedChat, chatType, conversationId, socketService]);

  // Auto-scroll to bottom when messages change
  
  useEffect(() => {
    if (selectedChat?._id && !roomJoinedRef.current) {
      if (chatType === "channel") {
        socketService.joinChannel(selectedChat._id);
      } // Remove conversation join, rely on backend
      roomJoinedRef.current = true;
    }
    return () => {
      if (chatType === "channel" && selectedChat?._id) {
        socketService.leaveChannel(selectedChat._id);
      }
    };
  }, [selectedChat, chatType, socketService])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Fetch initial messages when selected chat changes
  useEffect(() => {
    if (selectedChat?._id) {
      dispatch(fetchMessages({
        chatId: selectedChat._id,
        chatType
      }));
    }
  }, [selectedChat, chatType, dispatch]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat?._id) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      senderId: currentUserId,
      receiverId: actualChatId,
      text: newMessage,
      time: new Date().toLocaleTimeString(),
    };

    // Log connection status before sending
    console.log('Socket connected before sending?', socketService.isConnected());

    // Add optimistic message
    dispatch(addLocalMessage({
      chatId: actualChatId,
      message: tempMessage
    }));

    setNewMessage("");

    try {
      // Send via API
      console.log('Sending message via API with type:', chatType);
      const result = await dispatch(sendMessage({
        chatId: selectedChat._id,
        chatType,
        content: newMessage
      })).unwrap();
      
      console.log('Message sent result:', result);
      
      dispatch(removeLocalMessage({
        chatId: actualChatId,
        messageId: tempId
      }));
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message"
      });
    }
  };

  const copyLink = (id: string) => {
    try {
      navigator.clipboard.writeText(`${baseURL}/chat/channels/${id}/join`)
      toast({
        variant: "default",
        title: "Link copied to clipboard",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy link to clipboard"
      })
      console.error("Failed to copy link to clipboard:", error)
    }
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 bg-gray-800 flex items-center justify-center">
        <p className="text-gray-400">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-800 h-screen flex flex-col">
      <div className="p-4 bg-primary text-white flex items-center justify-between">
        <div className="flex items-center">
          <p className="font-bold">{selectedChat.name || (selectedChat.participants && selectedChat.participants.name)}</p>
          {conversationId && <span className="text-xs ml-2 opacity-50">(ID: {conversationId.substring(0, 6)}...)</span>}
        </div>
        {chatType === "channel" &&
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => { }}>Delete Conversation</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { }}>Clear Messages</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { }}>Leave Conversation</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyLink(selectedChat._id)}>Join Link</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { }}>See Details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      </div>

      <ScrollArea className="h-full">
        <div className="flex-1 p-4 flex flex-col gap-3">
          {isMessagesLoading ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-400">Loading messages...</p>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-400">No messages yet. Start a conversation!</p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
              >
                <div className={`w-4/5 max-w-[80%]`}>
                  <div
                    className={`p-3 rounded-lg break-words ${
                      msg.senderId === currentUserId 
                        ? "bg-primary text-white ml-auto" 
                        : "bg-gray-700 text-gray-200"
                    }`}
                  >
                    <p className="text-md whitespace-normal">{msg.text}</p>
                    <p className="text-[11px] text-gray-300 mt-1">{msg.time}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-gray-900 flex">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 p-2 bg-gray-700 rounded text-white"
        />
        <button
          className="ml-2 py-2 px-4 bg-primary rounded"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default TextScreen;











// import { useState, useEffect, useRef, useMemo } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchMessages, sendMessage, addLocalMessage, removeLocalMessage } from "@/redux/slices/chatSlice";
// import { RootState, AppDispatch } from "@/redux/Store"
// import useAuth from "@/hooks/useAuth";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import {  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { Ellipsis } from "lucide-react"
// import { baseURL } from "@/utils/baseURL";
// import { useToast } from "@/hooks/use-toast";
// import SocketService from "@/lib/socket";

// const TextScreen = () => {
//   const { toast } = useToast();
//   const { user } = useAuth();
//   const currentUserId = user?._id
//   const [newMessage, setNewMessage] = useState("");
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const socketService = SocketService.getInstance();

//   const dispatch = useDispatch<AppDispatch>();

//   const {
//     selectedChat,
//     chatType,
//     conversationId,
//     messages,
//     isMessagesLoading
//   } = useSelector((state: RootState) => state.chat);

//   const chatId = selectedChat?._id || "";
//   const chatMessages = useMemo(() => selectedChat ? messages[chatId] || [] : [], [selectedChat, messages, chatId]);

//   useEffect(() => {
//     const token = localStorage.getItem("accessToken") || "";
//     socketService.initializeSocket(token);
//     socketService.setDispatch(dispatch);
//   }, [dispatch, socketService]);

//   useEffect(() => {
//     if (selectedChat?._id && chatType === "channel") {
//       socketService.joinChannel(selectedChat._id);
//     }

//     return () => {
//       if (selectedChat?._id && chatType === "channel") {
//         socketService.leaveChannel(selectedChat._id);
//       }
//     };
//   }, [selectedChat, chatType, socketService]);

//   // Auto-scroll to bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [chatMessages]);

//   // Fetch initial messages when selected chat changes
//   useEffect(() => {
//     if (selectedChat?._id) {
//       dispatch(fetchMessages({
//         chatId: selectedChat._id,
//         chatType
//       }));
//     }
//   }, [selectedChat, chatType, dispatch]);

//   const handleSendMessage = async () => {
//     if (!newMessage.trim() || !selectedChat?._id) return;

//     const tempId = `temp-${Date.now()}`;
//     const tempMessage = {
//       id: tempId,
//       senderId: currentUserId,
//       receiverId: selectedChat._id,
//       text: newMessage,
//       time: new Date().toLocaleTimeString(),
//     };

//     // Add optimistic message
//     dispatch(addLocalMessage({
//       chatId: selectedChat._id,
//       message: tempMessage
//     }));

//     setNewMessage("");

//     try {
//       // Send via API
//       await dispatch(sendMessage({
//         chatId: selectedChat._id,
//         chatType,
//         content: newMessage
//       })).unwrap();
//       dispatch(removeLocalMessage({
//         chatId: selectedChat._id,
//         messageId: tempId
//       }));
//     } catch (error) {
//       console.error("Failed to send message:", error);
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "Failed to send message"
//       });
//     }
//   };

//   const copyLink = (id: string) => {
//     try {
//       navigator.clipboard.writeText(`${baseURL}/chat/channels/${id}/join`)
//       toast({
//         variant: "default",
//         title: "Link copied to clipboard",
//       })
//     } catch (error) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "Failed to copy link to clipboard"
//       })
//       console.error("Failed to copy link to clipboard:", error)
//     }
//   }

//   if (!selectedChat) {
//     return (
//       <div className="flex-1 bg-gray-800 flex items-center justify-center">
//         <p className="text-gray-400">Select a chat to start messaging</p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 bg-gray-800 h-screen flex flex-col">
//       <div className="p-4 bg-primary text-white flex items-center justify-between">
//         <p className="font-bold">{selectedChat.name || (selectedChat.participants && selectedChat.participants.name)}</p>
//         {conversationId && <span className="text-xs ml-2 opacity-50">(Conversation ID: {conversationId})</span>}
//         {chatType === "channel" &&
//           <DropdownMenu>
//             <DropdownMenuTrigger>
//               <Ellipsis />
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuItem onSelect={() => { }}>Delete Conversation</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => { }}>Clear Messages</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => { }}>Leave Conversation</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => copyLink(selectedChat._id)}>Join Link</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => { }}>See Details</DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         }
//       </div>

//       <ScrollArea className="h-full">
//         <div className="flex-1 p-4 flex flex-col gap-3">
//           {isMessagesLoading ? (
//             <div className="flex justify-center items-center h-full">
//               <p className="text-gray-400">Loading messages...</p>
//             </div>
//           ) : chatMessages.length === 0 ? (
//             <div className="flex justify-center items-center h-full">
//               <p className="text-gray-400">No messages yet. Start a conversation!</p>
//             </div>
//           ) : (
//             chatMessages.map((msg) => (
//               <div
//                 key={msg.id}
//                 className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
//               >
//                 <div className={`w-4/5 max-w-[80%]`}>
//                   <div
//                     className={`p-3 rounded-lg break-words ${
//                       msg.senderId === currentUserId 
//                         ? "bg-primary text-white ml-auto" 
//                         : "bg-gray-700 text-gray-200"
//                     }`}
//                   >
//                     <p className="text-md whitespace-normal">{msg.text}</p>
//                     <p className="text-[11px] text-gray-300 mt-1">{msg.time}</p>
//                   </div>
//                 </div>
//               </div>
//             ))
//           )}
//           <div ref={messagesEndRef} />
//         </div>
//       </ScrollArea>

//       <div className="p-4 bg-gray-900 flex">
//         <input
//           type="text"
//           placeholder="Type a message..."
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
//           className="flex-1 p-2 bg-gray-700 rounded text-white"
//         />
//         <button
//           className="ml-2 py-2 px-4 bg-primary rounded"
//           onClick={handleSendMessage}
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default TextScreen;










// import { useState, useEffect, useRef, useMemo } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchMessages, sendMessage, addLocalMessage, removeLocalMessage } from "@/redux/slices/chatSlice";
// import { RootState, AppDispatch } from "@/redux/Store"
// import useAuth from "@/hooks/useAuth";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { Ellipsis } from "lucide-react"
// import { baseURL } from "@/utils/baseURL";
// import { useToast } from "@/hooks/use-toast";

// const TextScreen = () => {
//   const { toast } = useToast();
//   const { user } = useAuth();
//   const currentUserId = user?._id
//   const [newMessage, setNewMessage] = useState("");
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   const dispatch = useDispatch<AppDispatch>();

//   const {
//     selectedChat,
//     chatType,
//     messages,
//     isMessagesLoading
//   } = useSelector((state: RootState) => state.chat);

//   const chatId = selectedChat?._id || "";
//   const chatMessages = useMemo(() => selectedChat ? messages[chatId] || [] : [], [selectedChat, messages, chatId]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [chatMessages]);

//   useEffect(() => {
//     if (selectedChat?._id) {
//       dispatch(fetchMessages({
//         chatId: selectedChat._id,
//         chatType
//       }));
//     }
//   }, [selectedChat, chatType, dispatch]);

//   const handleSendMessage = async () => {
//     if (!newMessage.trim() || !selectedChat?._id) return;

//     const tempId = `temp-${Date.now()}`;
//     const tempMessage = {
//       id: tempId,
//       senderId: currentUserId,
//       receiverId: selectedChat._id,
//       text: newMessage,
//       time: new Date().toLocaleTimeString(),
//     };

//     dispatch(addLocalMessage({
//       chatId: selectedChat._id,
//       message: tempMessage
//     }));

//     setNewMessage("");

//     try {
//       await dispatch(sendMessage({
//         chatId: selectedChat._id,
//         chatType,
//         content: newMessage
//       })).unwrap();

//       dispatch(removeLocalMessage({
//         chatId: selectedChat._id,
//         messageId: tempId
//       }));
//     } catch (error) {
//       console.error("Failed to send message:", error);
//     }
//   };

//   const copyLink = (id: string) => {
//     try {
//       navigator.clipboard.writeText(`${baseURL}/chat/channels/${id}/join`)
//       toast({
//         variant: "default",
//         title: "Link copied to clipboard",
//       })
//     } catch (error) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "Failed to copy link to clipboard"
//       })
//       console.error("Failed to copy link to clipboard:", error)
//     }
//   }

//   if (!selectedChat) {
//     return (
//       <div className="flex-1 bg-gray-800 flex items-center justify-center">
//         <p className="text-gray-400">Select a chat to start messaging</p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 bg-gray-800 h-screen flex flex-col">
//       <div className="p-4 bg-primary text-white flex items-center justify-between">
//         <p className="font-bold">{selectedChat.name || (selectedChat.participants && selectedChat.participants.name)}</p>
        
//         {chatType === "channel" &&
//           <DropdownMenu>
//             <DropdownMenuTrigger>
//               <Ellipsis />
//             </DropdownMenuTrigger>
//             <DropdownMenuContent>
//               <DropdownMenuItem onSelect={() => { }}>Delete Conversation</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => { }}>Clear Messages</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => { }}>Leave Conversation</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => copyLink(selectedChat._id)}>Join Link</DropdownMenuItem>
//               <DropdownMenuItem onSelect={() => { }}>See Details</DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         }
//       </div>

//       <ScrollArea className="h-full">
//         <div className="flex-1 p-4 flex flex-col gap-3">
//           {isMessagesLoading ? (
//             <div className="flex justify-center items-center h-full">
//               <p className="text-gray-400">Loading messages...</p>
//             </div>
//           ) : chatMessages.length === 0 ? (
//             <div className="flex justify-center items-center h-full">
//               <p className="text-gray-400">No messages yet. Start a conversation!</p>
//             </div>
//           ) : (
//             chatMessages.map((msg) => (
//               <div
//                 key={msg.id}
//                 className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
//               >
//                 <div className={`max-w-[60%]`}>
//                   <div
//                     className={`p-3 rounded-lg break-words ${
//                       msg.senderId === currentUserId 
//                         ? "bg-primary text-white ml-auto" 
//                         : "bg-gray-700 text-gray-200"
//                     }`}
//                   >
//                     <p className="text-md whitespace-normal">{msg.text}</p>
//                     <p className="text-[11px] text-gray-300 mt-1">{msg.time}</p>
//                   </div>
//                 </div>
//               </div>
//             ))
//           )}
//           <div ref={messagesEndRef} />
//         </div>
//       </ScrollArea>

//       <div className="p-4 bg-gray-900 flex">
//         <input
//           type="text"
//           placeholder="Type a message..."
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
//           className="flex-1 p-2 bg-gray-700 rounded text-white"
//         />
//         <button
//           className="ml-2 py-2 px-4 bg-primary rounded"
//           onClick={handleSendMessage}
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// };

// export default TextScreen;