package com.example.geminiintegration.controller;

import com.example.geminiintegration.dto.ChatRequest;
import com.example.geminiintegration.dto.MessageUpdateDto;
import com.example.geminiintegration.service.ChatService;
import com.example.geminiintegration.entity.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/gemini")
@CrossOrigin(origins = "http://localhost:5173")
public class GeminiController {

    private static final Logger logger = LoggerFactory.getLogger(GeminiController.class);

    private final ChatService chatService;

    @Autowired
    public GeminiController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/chat")
    public Mono<ResponseEntity<Map<String, Object>>> chat(@RequestBody ChatRequest request) {
        String prompt = request.getPrompt();
        UUID conversationId = request.getConversationId();

        if (prompt == null || prompt.trim().isEmpty()) {
            logger.warn("Received empty or null prompt");
            return Mono.just(ResponseEntity.badRequest().body(Map.of("error", "Prompt cannot be empty")));
        }

        if (conversationId == null) {
            logger.info("Received new chat request with prompt: {}", prompt);
        } else {
            logger.info("Received chat request for conversation ID {} with prompt: {}", conversationId, prompt);
        }

        return chatService.processChatMessage(prompt, conversationId)
            .map(responseMap -> ResponseEntity.ok(responseMap))
            .onErrorResume(RuntimeException.class, e -> {
                logger.error("Error in chat controller: {}", e.getMessage(), e);
                if (e.getMessage().contains("Conversation not found")) {
                    return Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", e.getMessage())));
                }
                return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error processing chat message: " + e.getMessage())));
            })
            .onErrorResume(e -> {
                logger.error("Unexpected error in chat controller: {}", e.getMessage(), e);
                return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred: " + e.getMessage())));
            });
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<Map<String, Object>>> getAllConversations() {
        logger.info("Received request for all conversation summaries");
        List<Map<String, Object>> summaries = chatService.getAllConversationsSummary();
        return ResponseEntity.ok(summaries);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<Message>> getConversationMessages(@PathVariable UUID conversationId) {
        logger.info("Received request for messages for conversation ID: {}", conversationId);
        try {
            List<Message> messages = chatService.getMessagesByConversationId(conversationId);
            if (messages.isEmpty() && !chatService.conversationExists(conversationId)) {
                logger.warn("Conversation not found when fetching messages for ID: {}", conversationId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.ok(messages);
        } catch (RuntimeException e) {
            logger.error("Error fetching messages for conversation ID {}: {}", conversationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/message/{messageId}")
    public ResponseEntity<Void> updateMessage(@PathVariable UUID messageId, @RequestBody MessageUpdateDto updateDto) {
        logger.info("Received request to update message ID: {}", messageId);
        if (updateDto == null || updateDto.getNewContent() == null || updateDto.getNewContent().trim().isEmpty()) {
            logger.warn("Received empty or null new content for message update");
            return ResponseEntity.badRequest().build();
        }
        try {
            boolean updated = chatService.updateMessage(messageId, updateDto.getNewContent());
            if (updated) {
                logger.info("Successfully updated message ID: {}", messageId);
                return ResponseEntity.ok().build();
            } else {
                logger.warn("Message not found for update ID: {}", messageId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (Exception e) {
            logger.error("Error updating message ID {}: {}", messageId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/conversations/{conversationId}/regenerate-from/{messageId}")
    public Mono<ResponseEntity<Message>> regenerateConversation(@PathVariable UUID conversationId, @PathVariable UUID messageId) {
        logger.info("Received regeneration request for conversation ID {} starting from message ID: {}", conversationId, messageId);
        return chatService.regenerateFromMessage(conversationId, messageId)
            .map(newMessage -> ResponseEntity.ok(newMessage))
            .onErrorResume(RuntimeException.class, e -> {
                logger.error("Error during regeneration for conversation ID {} from message ID {}: {}", conversationId, messageId, e.getMessage(), e);
                if (e.getMessage().contains("Conversation not found") || e.getMessage().contains("Message not found")) {
                    return Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(null));
                }
                return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null));
            });
    }

    @PutMapping("/conversations/{conversationId}/title")
    public ResponseEntity<Void> updateConversationTitle(@PathVariable UUID conversationId, @RequestBody Map<String, String> requestBody) {
        logger.info("Received request to update title for conversation ID: {}", conversationId);
        String newTitle = requestBody.get("title");
        if (newTitle == null || newTitle.trim().isEmpty()) {
            logger.warn("Received empty or null new title for conversation ID: {}", conversationId);
            return ResponseEntity.badRequest().build();
        }
        boolean updated = chatService.updateConversationTitle(conversationId, newTitle);
        if (updated) {
            logger.info("Successfully updated title for conversation ID {} to '{}'", conversationId, newTitle);
            return ResponseEntity.ok().build();
        } else {
            logger.warn("Conversation not found for title update ID: {}", conversationId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID conversationId) {
        logger.info("Received request to delete conversation ID: {}", conversationId);
        boolean deleted = chatService.deleteConversation(conversationId);
        if (deleted) {
            logger.info("Successfully deleted conversation with ID: {}", conversationId);
            return ResponseEntity.noContent().build(); // 204 No Content - successful deletion
        } else {
            logger.warn("Conversation not found for deletion ID: {}", conversationId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> testEndpoint() {
        logger.info("Test endpoint called");
        return ResponseEntity.ok(Map.of("status", "Gemini API Integration is up and running!"));
    }
}