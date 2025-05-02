package com.example.geminiintegration.service;

import com.example.geminiintegration.entity.Conversation;
import com.example.geminiintegration.entity.Message;
import com.example.geminiintegration.repository.ConversationRepository;
import com.example.geminiintegration.repository.MessageRepository;
import jakarta.transaction.Transactional; // Use Spring's transactional annotation
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDateTime; // Import LocalDateTime

@Service
public class ChatService {

    private static final Logger logger = LoggerFactory.getLogger(ChatService.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final GeminiService geminiService;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       GeminiService geminiService) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.geminiService = geminiService;
    }

    @Transactional
    public Mono<Map<String, Object>> processChatMessage(String prompt, UUID conversationId) {

        final Conversation currentConversation;
        final List<Message> initialHistoryMessages;
        final int initialSequenceNumber;

        if (conversationId == null) {
            currentConversation = conversationRepository.save(new Conversation());
            initialHistoryMessages = new ArrayList<>();
            initialSequenceNumber = 0;
            logger.info("Started new conversation with ID: {}", currentConversation.getId());
        } else {
            currentConversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> {
                    logger.warn("Conversation not found with ID: {}", conversationId);
                    return new RuntimeException("Conversation not found with ID: " + conversationId);
                });
            initialHistoryMessages = messageRepository.findByConversationIdOrderBySequenceNumberAsc(conversationId);
            initialSequenceNumber = initialHistoryMessages.size();
            logger.info("Continuing conversation with ID: {}, {} existing messages", conversationId, initialHistoryMessages.size());
        }

        final Message newUserMessage = new Message();
        newUserMessage.setConversation(currentConversation);
        newUserMessage.setRole("user");
        newUserMessage.setContent(prompt);
        newUserMessage.setSequenceNumber(initialSequenceNumber);
        // Backend should preferably return the saved message entity with ID after saving
        messageRepository.save(newUserMessage);


        final List<Map<String, Object>> apiHistory = initialHistoryMessages.stream()
                .map(this::messageToApiContentMap)
                .collect(Collectors.toCollection(ArrayList::new));

        apiHistory.add(messageToApiContentMap(newUserMessage));

        return geminiService.generateContentWithHistory(apiHistory)
            .flatMap(geminiResponse -> {
                String modelResponseText = geminiResponse.extractTextResponse();
                logger.info("Received model response for conversation {}: {}", currentConversation.getId(), modelResponseText);

                final int modelSequenceNumber = initialSequenceNumber + 1;

                // Always save a model message, even if it's a default error message
                Message newModelMessage = new Message();
                newModelMessage.setConversation(currentConversation);
                newModelMessage.setRole("model");
                // Use default message if Gemini returned nothing meaningful
                newModelMessage.setContent((modelResponseText != null && !modelResponseText.trim().isEmpty()) ? modelResponseText : "Sorry, I couldn't generate a response.");
                newModelMessage.setSequenceNumber(modelSequenceNumber);
                 // Backend should preferably return the saved message entity with ID after saving
                messageRepository.save(newModelMessage);


                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("conversationId", currentConversation.getId());
                responseMap.put("response", newModelMessage.getContent()); // Return the content that was actually saved
                responseMap.put("aiMessageId", newModelMessage.getId()); // <-- Return the AI message ID
                 // Optional: Return user message ID if needed for frontend
                // responseMap.put("userMessageId", newUserMessage.getId());

                 if (geminiResponse.getModelVersion() != null) {
                     responseMap.put("modelVersion", geminiResponse.getModelVersion());
                 }
                 if (geminiResponse.getUsageMetadata() != null) {
                      responseMap.put("tokenUsage", Map.of(
                          "promptTokens", geminiResponse.getUsageMetadata().getPromptTokenCount(),
                          "responseTokens", geminiResponse.getUsageMetadata().getCandidatesTokenCount(),
                          "totalTokens", geminiResponse.getUsageMetadata().getTotalTokenCount()
                      ));
                  }

                return Mono.just(responseMap);
            })
            .onErrorResume(e -> {
                logger.error("Error during Gemini API call or saving model response for conversation {}: {}", currentConversation.getId(), e.getMessage(), e);
                return Mono.error(e);
            });
    }
    private Map<String, Object> messageToApiContentMap(Message message) {
        return Map.of(
            "role", message.getRole(),
            "parts", List.of(Map.of("text", message.getContent()))
        );
    }

    public List<Map<String, Object>> getAllConversationsSummary() {
        List<Conversation> conversations = conversationRepository.findAll(); // Get all conversations
        List<Map<String, Object>> summaries = new ArrayList<>();

        for (Conversation conversation : conversations) {
            List<Message> firstMessage = messageRepository.findByConversationIdOrderBySequenceNumberAsc(conversation.getId());
            String title = "New Chat"; // Default title
            if (!firstMessage.isEmpty()) {
                 title = firstMessage.get(0).getContent();
                 if(title.length() > 30) {
                     title = title.substring(0, 30) + "...";
                 }
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("id", conversation.getId());
            summary.put("title", title);
            summary.put("startTime", conversation.getStartTime());
            summaries.add(summary);
        }
         summaries.sort((a, b) -> {
             LocalDateTime timeA = (LocalDateTime) a.get("startTime");
             LocalDateTime timeB = (LocalDateTime) b.get("startTime");
             return timeB.compareTo(timeA); // Newest first
         });

        return summaries;
    }

    public List<Message> getMessagesByConversationId(UUID conversationId) {
        return messageRepository.findByConversationIdOrderBySequenceNumberAsc(conversationId);
    }


     public boolean conversationExists(UUID conversationId) {
         return conversationRepository.existsById(conversationId);
     }

    @Transactional
    public boolean updateMessage(UUID messageId, String newContent) {
        Optional<Message> messageOpt = messageRepository.findById(messageId);
        if (messageOpt.isPresent()) {
            Message message = messageOpt.get();

             if (!"user".equals(message.getRole())) {
                 logger.warn("Attempted to edit non-user message ID: {}", messageId);
                 return false;
             }

            message.setContent(newContent);
            messageRepository.save(message);
            return true;
        }
        return false;
    }

    @Transactional
    public Mono<Message> regenerateFromMessage(UUID conversationId, UUID fromMessageId) {
         logger.info("Regenerating conversation {} from message ID {}", conversationId, fromMessageId);

        Optional<Message> fromMessageOpt = messageRepository.findById(fromMessageId);
        if (fromMessageOpt.isEmpty()) {
            logger.warn("Regeneration failed: Message ID {} not found.", fromMessageId);
            return Mono.error(new RuntimeException("Message not found with ID: " + fromMessageId));
        }
        Message fromMessage = fromMessageOpt.get();
         if (!fromMessage.getConversation().getId().equals(conversationId)) {
              logger.warn("Regeneration failed: Message ID {} does not belong to conversation ID {}.", fromMessageId, conversationId);
             return Mono.error(new RuntimeException("Message does not belong to the specified conversation."));
         }
         if (!"user".equals(fromMessage.getRole())) {
              logger.warn("Regeneration failed: Cannot regenerate from a non-user message ID {}.", fromMessageId);
             return Mono.error(new RuntimeException("Cannot regenerate from a non-user message."));
         }

        messageRepository.deleteByConversationIdAndSequenceNumberGreaterThan(conversationId, fromMessage.getSequenceNumber());
         logger.info("Deleted messages after sequence number {} for conversation {}", fromMessage.getSequenceNumber(), conversationId);

        List<Message> historyForRegen = messageRepository.findByConversationIdOrderBySequenceNumberAsc(conversationId);
         if (historyForRegen.isEmpty() || !historyForRegen.get(historyForRegen.size() - 1).getId().equals(fromMessageId)) {
             logger.error("Internal Error: History fetch for regeneration did not end with the fromMessage ID {}.", fromMessageId);
              historyForRegen = messageRepository.findByConversationIdAndSequenceNumberLessThanEqualOrderBySequenceNumberAsc(conversationId, fromMessage.getSequenceNumber());
              if (historyForRegen.isEmpty() || !historyForRegen.get(historyForRegen.size() - 1).getId().equals(fromMessageId)) {
                   return Mono.error(new RuntimeException("Failed to construct history for regeneration."));
              }
         }

        final List<Map<String, Object>> apiHistory = historyForRegen.stream()
                .map(this::messageToApiContentMap)
                .collect(Collectors.toCollection(ArrayList::new));

        return geminiService.generateContentWithHistory(apiHistory)
            .flatMap(geminiResponse -> {
                String modelResponseText = geminiResponse.extractTextResponse();
                logger.info("Received regeneration model response for conversation {}: {}", conversationId, modelResponseText);

                final int newAiSequenceNumber = fromMessage.getSequenceNumber() + 1;

                Message newModelMessage = new Message();
                newModelMessage.setConversation(fromMessage.getConversation()); // Link to the same conversation
                newModelMessage.setRole("model");
                newModelMessage.setContent((modelResponseText != null && !modelResponseText.trim().isEmpty()) ? modelResponseText : "Sorry, I couldn't generate a response.");
                newModelMessage.setSequenceNumber(newAiSequenceNumber);
                // Backend should preferably return the saved message entity with ID after saving
                Message savedMessage = messageRepository.save(newModelMessage);
                logger.info("Saved new AI message ID {} for regeneration.", savedMessage.getId());

                return Mono.just(savedMessage);
            })
             .onErrorResume(e -> {
                 logger.error("Error during Gemini API call or saving regenerated model response for conversation {}: {}", conversationId, e.getMessage(), e);
                  // Transaction will roll back deletions and saves if this flatMap fails
                 return Mono.error(e);
             });
    }
    
    @Transactional
    public boolean updateConversationTitle(UUID conversationId, String newTitle) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        if (conversationOpt.isPresent()) {
            Conversation conversation = conversationOpt.get();
            conversation.setTitle(newTitle);
            conversationRepository.save(conversation); // Save the updated title
            logger.info("Updated title for conversation ID {} to '{}'", conversationId, newTitle);
            return true;
        } else {
            logger.warn("Conversation not found with ID: {} for title update", conversationId);
            return false;
        }
    }

    @Transactional
    public boolean deleteConversation(UUID conversationId) {
        if (conversationRepository.existsById(conversationId)) {
            messageRepository.deleteByConversationId(conversationId); // Delete all messages in the conversation
            conversationRepository.deleteById(conversationId);       // Delete the conversation itself
            logger.info("Deleted conversation with ID: {} and its messages", conversationId);
            return true;
        } else {
            logger.warn("Conversation not found with ID: {} for deletion", conversationId);
            return false;
        }
    }
}